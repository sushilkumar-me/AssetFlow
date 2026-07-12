"""
Resource Booking endpoints.

POST   /bookings                    — Create booking (any auth user)
GET    /bookings                    — List bookings  (any auth user — scoped by role in service)
GET    /bookings/calendar           — Calendar view grouped by resource
GET    /bookings/{id}               — Get booking by ID
PATCH  /bookings/{id}/cancel        — Cancel booking (owner or admin/asset-manager)
PATCH  /bookings/{id}/reschedule    — Reschedule booking (owner or admin/asset-manager)
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.booking import BookingStatus
from app.models.user import User, UserRole
from app.schemas.booking import (
    BookingCancelRequest,
    BookingCreateRequest,
    BookingListResponse,
    BookingRescheduleRequest,
    BookingResponse,
    CalendarResponse,
)
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> BookingService:
    return BookingService(db)


def _is_manager(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("/calendar", response_model=CalendarResponse, summary="Calendar view grouped by resource")
async def get_calendar(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
    date_from: datetime = Query(..., description="Window start (ISO 8601 with timezone)"),
    date_to:   datetime = Query(..., description="Window end   (ISO 8601 with timezone)"),
) -> CalendarResponse:
    return await svc.get_calendar(date_from, date_to)


@router.get("", response_model=BookingListResponse, summary="List bookings")
async def list_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
    employee_id:   int | None = Query(None),
    department_id: int | None = Query(None),
    asset_id:      int | None = Query(None),
    booking_status: BookingStatus | None = Query(None, alias="status"),
    date_from: datetime | None = Query(None),
    date_to:   datetime | None = Query(None),
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> BookingListResponse:
    # Employees only see their own bookings unless they are admin/manager
    eff_employee_id = employee_id
    if not _is_manager(current_user) and current_user.role != UserRole.DEPARTMENT_HEAD:
        eff_employee_id = current_user.id   # scope to self

    return await svc.list_bookings(
        employee_id=eff_employee_id,
        department_id=department_id,
        asset_id=asset_id,
        booking_status=booking_status,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )


@router.get("/{booking_id}", response_model=BookingResponse, summary="Get booking by ID")
async def get_booking(
    booking_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
) -> BookingResponse:
    return await svc.get_booking(booking_id)


# ── Write ─────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a resource booking",
)
async def create_booking(
    payload: BookingCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
) -> BookingResponse:
    return await svc.create_booking(
        payload,
        employee_id=current_user.id,
        department_id=current_user.department_id,
    )


@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking",
)
async def cancel_booking(
    booking_id: int,
    payload: BookingCancelRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
) -> BookingResponse:
    return await svc.cancel_booking(
        booking_id,
        payload,
        requesting_user_id=current_user.id,
        is_admin_or_manager=_is_manager(current_user),
    )


@router.patch(
    "/{booking_id}/reschedule",
    response_model=BookingResponse,
    summary="Reschedule a booking",
)
async def reschedule_booking(
    booking_id: int,
    payload: BookingRescheduleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[BookingService, Depends(_svc)],
) -> BookingResponse:
    return await svc.reschedule_booking(
        booking_id,
        payload,
        requesting_user_id=current_user.id,
        is_admin_or_manager=_is_manager(current_user),
    )
