"""
Pydantic schemas for Reports & Analytics.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


# ── Generic Response ─────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    success: bool = True
    data: dict[str, Any]


class DashboardSummaryResponse(BaseModel):
    total_assets: int
    total_departments: int
    total_employees: int
    open_audits: int
    pending_maintenance: int
    active_bookings: int


# ── Asset Report ─────────────────────────────────────────────────────────────

class AssetReportResponse(BaseModel):
    total_assets: int
    status_breakdown: dict[str, int]
    allocation_percentage: float
    most_used_assets: list[dict[str, Any]]
    least_used_assets: list[dict[str, Any]]
    idle_assets: list[dict[str, Any]]


# ── Department Report ────────────────────────────────────────────────────────

class DepartmentAssetSummary(BaseModel):
    department_id: int
    department_name: str
    allocated: int
    available: int
    under_maintenance: int
    lost: int
    total: int


class DepartmentReportResponse(BaseModel):
    departments: list[DepartmentAssetSummary]
    unassigned_assets: int


# ── Maintenance Report ───────────────────────────────────────────────────────

class MonthlyCount(BaseModel):
    year: int
    month: int
    count: int


class MaintenanceReportResponse(BaseModel):
    monthly_requests: list[MonthlyCount]
    priority_distribution: dict[str, int]
    status_distribution: dict[str, int]
    most_repaired_assets: list[dict[str, Any]]
    average_resolution_days: float
    total_requests: int


# ── Booking Report ───────────────────────────────────────────────────────────

class HourlyCount(BaseModel):
    hour: int
    count: int


class DailyCount(BaseModel):
    date: str
    count: int


class BookingReportResponse(BaseModel):
    most_booked_assets: list[dict[str, Any]]
    status_distribution: dict[str, int]
    hourly_distribution: list[HourlyCount]
    daily_usage: list[DailyCount]
    weekly_usage: list[dict[str, Any]]
    total_bookings: int


# ── Audit Report ─────────────────────────────────────────────────────────────

class AuditSummary(BaseModel):
    id: int
    name: str
    status: str
    total_verified: int
    missing: int
    damaged: int
    discrepancy_percentage: float


class AuditReportResponse(BaseModel):
    open_audits: int
    in_progress_audits: int
    closed_audits: int
    verified_assets: int
    missing_assets: int
    damaged_assets: int
    recent_audits: list[AuditSummary]


# ── Export ───────────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    report_type: str  # assets, departments, maintenance, bookings, audits
    format: str       # csv, pdf, excel
    filters: dict[str, Any] | None = None