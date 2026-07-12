"""
BookingRepository — all DB access for ResourceBooking.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingStatus, ResourceBooking


class BookingRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, booking_id: int) -> ResourceBooking | None:
        result = await self._db.execute(
            select(ResourceBooking).where(ResourceBooking.id == booking_id)
        )
        return result.scalar_one_or_none()

    async def check_overlap(
        self,
        asset_id: int,
        start: datetime,
        end: datetime,
        exclude_id: int | None = None,
    ) -> ResourceBooking | None:
        """
        Return the first UPCOMING/ONGOING booking that overlaps [start, end).
        Two bookings are overlapping if:
            existing.start < new.end  AND  existing.end > new.start
        Adjacent bookings (new.start == existing.end) are allowed.
        """
        active_statuses = [BookingStatus.UPCOMING, BookingStatus.ONGOING]
        query = (
            select(ResourceBooking)
            .where(
                ResourceBooking.asset_id == asset_id,
                ResourceBooking.status.in_(active_statuses),
                ResourceBooking.start_datetime < end,
                ResourceBooking.end_datetime > start,
            )
        )
        if exclude_id is not None:
            query = query.where(ResourceBooking.id != exclude_id)

        result = await self._db.execute(query)
        return result.scalars().first()

    async def list(
        self,
        employee_id: int | None = None,
        department_id: int | None = None,
        asset_id: int | None = None,
        status: BookingStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ResourceBooking], int]:
        query = select(ResourceBooking)

        if employee_id is not None:
            query = query.where(ResourceBooking.employee_id == employee_id)
        if department_id is not None:
            query = query.where(ResourceBooking.department_id == department_id)
        if asset_id is not None:
            query = query.where(ResourceBooking.asset_id == asset_id)
        if status is not None:
            query = query.where(ResourceBooking.status == status)
        if date_from is not None:
            query = query.where(ResourceBooking.end_datetime >= date_from)
        if date_to is not None:
            query = query.where(ResourceBooking.start_datetime <= date_to)

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(ResourceBooking.start_datetime.desc()).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def calendar(
        self, date_from: datetime, date_to: datetime
    ) -> list[ResourceBooking]:
        """All active bookings in the given window, ordered by asset + start time."""
        result = await self._db.execute(
            select(ResourceBooking)
            .where(
                ResourceBooking.status.in_([BookingStatus.UPCOMING, BookingStatus.ONGOING]),
                ResourceBooking.start_datetime < date_to,
                ResourceBooking.end_datetime > date_from,
            )
            .order_by(ResourceBooking.asset_id, ResourceBooking.start_datetime)
        )
        return list(result.scalars().all())

    # ── Status sync (batch) ───────────────────────────────────────────────────

    async def sync_statuses(self) -> None:
        """
        Batch-update booking statuses based on current time:
          UPCOMING → ONGOING   when now >= start_datetime
          ONGOING  → COMPLETED when now >= end_datetime
        """
        now = datetime.now(tz=timezone.utc)

        # UPCOMING → ONGOING
        await self._db.execute(
            update(ResourceBooking)
            .where(
                ResourceBooking.status == BookingStatus.UPCOMING,
                ResourceBooking.start_datetime <= now,
                ResourceBooking.end_datetime > now,
            )
            .values(status=BookingStatus.ONGOING)
        )

        # ONGOING → COMPLETED
        await self._db.execute(
            update(ResourceBooking)
            .where(
                ResourceBooking.status == BookingStatus.ONGOING,
                ResourceBooking.end_datetime <= now,
            )
            .values(status=BookingStatus.COMPLETED)
        )

        # Also catch UPCOMING that passed entirely (edge case)
        await self._db.execute(
            update(ResourceBooking)
            .where(
                ResourceBooking.status == BookingStatus.UPCOMING,
                ResourceBooking.end_datetime <= now,
            )
            .values(status=BookingStatus.COMPLETED)
        )

        await self._db.flush()

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        asset_id: int,
        employee_id: int,
        department_id: int | None,
        title: str,
        purpose: str | None,
        start_datetime: datetime,
        end_datetime: datetime,
        remarks: str | None,
    ) -> ResourceBooking:
        booking = ResourceBooking(
            asset_id=asset_id,
            employee_id=employee_id,
            department_id=department_id,
            title=title,
            purpose=purpose,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            remarks=remarks,
            status=BookingStatus.UPCOMING,
        )
        self._db.add(booking)
        await self._db.flush()
        await self._db.refresh(booking)
        return booking

    async def cancel(
        self, booking: ResourceBooking, remarks: str | None
    ) -> ResourceBooking:
        booking.status = BookingStatus.CANCELLED
        if remarks is not None:
            booking.remarks = remarks
        await self._db.flush()
        await self._db.refresh(booking)
        return booking

    async def reschedule(
        self,
        booking: ResourceBooking,
        start_datetime: datetime,
        end_datetime: datetime,
        remarks: str | None,
    ) -> ResourceBooking:
        booking.start_datetime = start_datetime
        booking.end_datetime   = end_datetime
        # Revert to UPCOMING after reschedule — status will re-sync on next request
        booking.status = BookingStatus.UPCOMING
        if remarks is not None:
            booking.remarks = remarks
        await self._db.flush()
        await self._db.refresh(booking)
        return booking
