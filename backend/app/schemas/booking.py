"""
Pydantic v2 schemas for Resource Booking endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.models.booking import BookingStatus


# ── Requests ──────────────────────────────────────────────────────────────────

class BookingCreateRequest(BaseModel):
    asset_id: int
    title: str = Field(..., min_length=1, max_length=255)
    purpose: str | None = Field(None, max_length=2000)
    start_datetime: datetime
    end_datetime: datetime
    remarks: str | None = Field(None, max_length=1000)

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingCreateRequest":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime.")
        return self


class BookingRescheduleRequest(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    remarks: str | None = Field(None, max_length=1000)

    @model_validator(mode="after")
    def end_after_start(self) -> "BookingRescheduleRequest":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime.")
        return self


class BookingCancelRequest(BaseModel):
    remarks: str | None = Field(None, max_length=1000)


# ── Responses ─────────────────────────────────────────────────────────────────

class BookingResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    employee_id: int
    department_id: int | None
    title: str
    purpose: str | None
    start_datetime: datetime
    end_datetime: datetime
    status: BookingStatus
    remarks: str | None
    created_at: datetime
    updated_at: datetime


class BookingListResponse(BaseModel):
    items: list[BookingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Calendar ──────────────────────────────────────────────────────────────────

class CalendarEntry(BaseModel):
    """One asset with its active bookings — used for grouped calendar view."""
    asset_id: int
    asset_name: str
    asset_tag: str
    location: str | None
    bookings: list[BookingResponse]


class CalendarResponse(BaseModel):
    entries: list[CalendarEntry]
    date_from: datetime
    date_to: datetime
