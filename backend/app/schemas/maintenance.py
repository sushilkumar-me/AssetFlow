"""
Pydantic v2 schemas for Maintenance Management endpoints.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.maintenance import MaintenancePriority, MaintenanceStatus


# ── Requests ──────────────────────────────────────────────────────────────────

class MaintenanceCreateRequest(BaseModel):
    asset_id: int
    issue_title: str = Field(..., min_length=1, max_length=255)
    issue_description: str = Field(..., min_length=1)
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    attachment_url: str | None = Field(None, max_length=1000)


class MaintenanceApproveRequest(BaseModel):
    approval_remarks: str | None = Field(None, max_length=1000)


class MaintenanceRejectRequest(BaseModel):
    approval_remarks: str = Field(..., min_length=1, max_length=1000,
                                  description="Reason for rejection is required.")


class MaintenanceAssignRequest(BaseModel):
    technician_name: str = Field(..., min_length=1, max_length=255)


class MaintenanceResolveRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=1,
                                  description="Resolution notes are required.")


# ── Responses ─────────────────────────────────────────────────────────────────

class MaintenanceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    raised_by: int
    approved_by: int | None
    issue_title: str
    issue_description: str
    priority: MaintenancePriority
    attachment_url: str | None
    status: MaintenanceStatus
    technician_name: str | None
    approval_remarks: str | None
    resolution_notes: str | None
    approved_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MaintenanceListResponse(BaseModel):
    items: list[MaintenanceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
