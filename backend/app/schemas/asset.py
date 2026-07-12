"""
Pydantic v2 schemas for Asset endpoints.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models.asset import AssetCondition, AssetStatus


# ── Requests ──────────────────────────────────────────────────────────────────

class AssetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Dell Latitude 5520"])
    category_id: int = Field(..., description="Must reference an active category")
    serial_number: str | None = Field(None, max_length=255)
    department_id: int | None = None
    condition: AssetCondition = AssetCondition.NEW
    location: str | None = Field(None, max_length=500)
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = Field(None, ge=0)
    description: str | None = None
    is_shared: bool = False
    photo_url: str | None = Field(None, max_length=1000)

    @field_validator("serial_number", mode="before")
    @classmethod
    def normalise_serial(cls, value: Any) -> Any:
        if isinstance(value, str):
            v = value.strip()
            return v if v else None
        return value


class AssetUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    category_id: int | None = None
    serial_number: str | None = None
    department_id: int | None = None
    condition: AssetCondition | None = None
    location: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = Field(None, ge=0)
    description: str | None = None
    is_shared: bool | None = None
    photo_url: str | None = None


class AssetStatusUpdate(BaseModel):
    status: AssetStatus


# ── Responses ─────────────────────────────────────────────────────────────────

class AssetResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_tag: str
    name: str
    serial_number: str | None
    category_id: int
    department_id: int | None
    status: AssetStatus
    condition: AssetCondition
    is_active: bool
    is_shared: bool
    location: str | None
    acquisition_date: date | None
    acquisition_cost: Decimal | None
    description: str | None
    photo_url: str | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime


class AssetListResponse(BaseModel):
    items: list[AssetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
