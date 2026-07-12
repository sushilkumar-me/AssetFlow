"""
Pydantic v2 schemas for Allocation and Transfer endpoints.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models.allocation import AllocationStatus, TransferStatus


# ═══════════════════════════════════════════════════════════════════════════════
# Allocation
# ═══════════════════════════════════════════════════════════════════════════════

class AllocateRequest(BaseModel):
    asset_id: int
    employee_id: int
    expected_return_date: date | None = None
    condition_notes: str | None = Field(None, max_length=1000)

    @field_validator("expected_return_date")
    @classmethod
    def not_in_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("expected_return_date cannot be in the past.")
        return v


class ReturnRequest(BaseModel):
    condition_notes: str | None = Field(None, max_length=1000)


class AllocationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    employee_id: int
    allocated_by: int
    allocated_at: datetime
    expected_return_date: date | None
    returned_at: datetime | None
    status: AllocationStatus
    condition_notes: str | None
    created_at: datetime
    updated_at: datetime


class AllocationListResponse(BaseModel):
    items: list[AllocationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ═══════════════════════════════════════════════════════════════════════════════
# Transfer
# ═══════════════════════════════════════════════════════════════════════════════

class TransferCreateRequest(BaseModel):
    asset_id: int
    to_employee_id: int
    remarks: str | None = Field(None, max_length=1000)


class TransferActionRequest(BaseModel):
    """Used for both approve and reject — remarks are optional."""
    remarks: str | None = Field(None, max_length=1000)


class TransferResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    from_employee_id: int
    to_employee_id: int
    requested_by: int
    approved_by: int | None
    status: TransferStatus
    remarks: str | None
    requested_at: datetime
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TransferListResponse(BaseModel):
    items: list[TransferResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
