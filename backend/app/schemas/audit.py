"""
Pydantic v2 schemas for Audit Management endpoints.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.audit import AuditCycleStatus, AuditScopeType, VerificationStatus


# ── Requests ──────────────────────────────────────────────────────────────────

class AuditCycleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scope_type: AuditScopeType = AuditScopeType.ALL
    department_id: int | None = None
    location: str | None = Field(None, max_length=500)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def end_after_start(self) -> "AuditCycleCreateRequest":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date.")
        return self


class AssignAuditorsRequest(BaseModel):
    auditor_ids: list[int] = Field(..., min_length=1)


class VerifyAssetRequest(BaseModel):
    asset_id: int
    verification_status: VerificationStatus
    remarks: str | None = Field(None, max_length=1000)


# ── Responses ─────────────────────────────────────────────────────────────────

class AuditCycleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    scope_type: AuditScopeType
    department_id: int | None
    location: str | None
    start_date: date
    end_date: date
    status: AuditCycleStatus
    created_by: int
    closed_by: int | None
    closed_at: datetime | None
    auditor_ids: list[int] = []
    created_at: datetime
    updated_at: datetime


class AuditCycleListResponse(BaseModel):
    items: list[AuditCycleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditRecordResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    audit_cycle_id: int
    asset_id: int
    auditor_id: int
    verification_status: VerificationStatus
    remarks: str | None
    verified_at: datetime
    created_at: datetime


# ── Discrepancy report ────────────────────────────────────────────────────────

class DiscrepancyItem(BaseModel):
    asset_id: int
    asset_tag: str
    asset_name: str
    verification_status: VerificationStatus
    remarks: str | None
    auditor_id: int
    verified_at: datetime


class DiscrepancyReport(BaseModel):
    audit_cycle_id: int
    audit_name: str
    total_assets: int
    verified_count: int
    missing_count: int
    damaged_count: int
    discrepancies: list[DiscrepancyItem]
