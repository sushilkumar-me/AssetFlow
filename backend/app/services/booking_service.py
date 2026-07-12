"""
BookingService — all business rules for resource booking.

Business rules enforced:
  1. Only assets with is_shared=True can be booked.
  2. Asset must be active.
  3. end_datetime > start_datetime (also validated in schema).
  4. No overlapping UPCOMING/ONGOING bookings for the same asset.
     Adjacent bookings (end == start) are explicitly allowed.
  5. Only UPCOMING bookings can be cancelled or rescheduled.
  6. A booking owner or admin/asset-manager can cancel their own booking.
  7. Status (UPCOMING→ONGOING→COMPLETED) auto-synced on every read.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingStatus, ResourceBooking
from app.repositories.asset_repository import AssetRepository
from app.repositories.booking_repository import BookingRepository
from app.schemas.booking import (
    BookingCancelRequest,
    BookingCreateRequest,
    BookingListResponse,
    BookingRescheduleRequest,
    BookingResponse,
    CalendarEntry,
    CalendarResponse,
)


class BookingService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo       = BookingRepository(db)
        self._asset_repo = AssetRepository(db)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, booking_id: int) -> ResourceBooking:
        b = await self._repo.get_by_id(booking_id)
        if b is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking {booking_id} not found.",
            )
        return b

    async def _validate_asset(self, asset_id: int) -> None:
        asset = await self._asset_repo.find_by_id(asset_id)
        if asset is None or not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Asset not found or inactive.",
            )
        if not asset.is_shared:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Only shared resources can be booked. "
                    "To exclusively use this asset, create an allocation instead."
                ),
            )

    async def _check_overlap(
        self,
        asset_id: int,
        start: datetime,
        end: datetime,
        exclude_id: int | None = None,
    ) -> None:
        conflict = await self._repo.check_overlap(asset_id, start, end, exclude_id)
        if conflict:
            s = conflict.start_datetime.strftime("%Y-%m-%d %H:%M")
            e = conflict.end_datetime.strftime("%Y-%m-%d %H:%M")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Time slot overlaps with an existing booking "
                    f"({s} – {e}, id={conflict.id})."
                ),
            )

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_booking(
        self, payload: BookingCreateRequest, employee_id: int, department_id: int | None
    ) -> BookingResponse:
        await self._validate_asset(payload.asset_id)
        await self._check_overlap(payload.asset_id, payload.start_datetime, payload.end_datetime)

        booking = await self._repo.create(
            asset_id       = payload.asset_id,
            employee_id    = employee_id,
            department_id  = department_id,
            title          = payload.title,
            purpose        = payload.purpose,
            start_datetime = payload.start_datetime,
            end_datetime   = payload.end_datetime,
            remarks        = payload.remarks,
        )
        return BookingResponse.model_validate(booking)

    async def get_booking(self, booking_id: int) -> BookingResponse:
        await self._repo.sync_statuses()
        return BookingResponse.model_validate(await self._get_or_404(booking_id))

    async def list_bookings(
        self,
        employee_id: int | None = None,
        department_id: int | None = None,
        asset_id: int | None = None,
        booking_status: BookingStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> BookingListResponse:
        # Sync statuses before returning list so UI always sees current state
        await self._repo.sync_statuses()

        items, total = await self._repo.list(
            employee_id=employee_id,
            department_id=department_id,
            asset_id=asset_id,
            status=booking_status,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )
        return BookingListResponse(
            items=[BookingResponse.model_validate(b) for b in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def cancel_booking(
        self,
        booking_id: int,
        payload: BookingCancelRequest,
        requesting_user_id: int,
        is_admin_or_manager: bool,
    ) -> BookingResponse:
        await self._repo.sync_statuses()
        booking = await self._get_or_404(booking_id)

        # Only UPCOMING bookings can be cancelled
        if booking.status != BookingStatus.UPCOMING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only UPCOMING bookings can be cancelled (current: {booking.status.value}).",
            )

        # Only the booking owner or admin/asset-manager can cancel
        if not is_admin_or_manager and booking.employee_id != requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own bookings.",
            )

        booking = await self._repo.cancel(booking, payload.remarks)
        return BookingResponse.model_validate(booking)

    async def reschedule_booking(
        self,
        booking_id: int,
        payload: BookingRescheduleRequest,
        requesting_user_id: int,
        is_admin_or_manager: bool,
    ) -> BookingResponse:
        await self._repo.sync_statuses()
        booking = await self._get_or_404(booking_id)

        if booking.status != BookingStatus.UPCOMING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only UPCOMING bookings can be rescheduled (current: {booking.status.value}).",
            )

        if not is_admin_or_manager and booking.employee_id != requesting_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reschedule your own bookings.",
            )

        await self._check_overlap(
            booking.asset_id,
            payload.start_datetime,
            payload.end_datetime,
            exclude_id=booking_id,
        )

        booking = await self._repo.reschedule(
            booking,
            payload.start_datetime,
            payload.end_datetime,
            payload.remarks,
        )
        return BookingResponse.model_validate(booking)

    async def get_calendar(
        self, date_from: datetime, date_to: datetime
    ) -> CalendarResponse:
        """
        Return all active bookings in the window grouped by shared asset.
        Each asset appears once with its bookings sorted by start time.
        """
        await self._repo.sync_statuses()
        bookings = await self._repo.calendar(date_from, date_to)

        # Group by asset_id
        groups: dict[int, list[ResourceBooking]] = {}
        for b in bookings:
            groups.setdefault(b.asset_id, []).append(b)

        entries: list[CalendarEntry] = []
        for asset_id, asset_bookings in groups.items():
            asset = await self._asset_repo.find_by_id(asset_id)
            entries.append(
                CalendarEntry(
                    asset_id   = asset_id,
                    asset_name = asset.name if asset else f"Asset #{asset_id}",
                    asset_tag  = asset.asset_tag if asset else "",
                    location   = asset.location if asset else None,
                    bookings   = [BookingResponse.model_validate(b) for b in asset_bookings],
                )
            )

        entries.sort(key=lambda e: e.asset_name)
        return CalendarResponse(entries=entries, date_from=date_from, date_to=date_to)
