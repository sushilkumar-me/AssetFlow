"""
Reports API — analytics and export endpoints.
"""

from __future__ import annotations
from typing import Annotated, Any
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.reports import (
    AssetReportResponse,
    AuditReportResponse,
    BookingReportResponse,
    DashboardSummaryResponse,
    DepartmentReportResponse,
    MaintenanceReportResponse,
)
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> ReportService:
    return ReportService(db, user)


# ── Dashboard Summary ───────────────────────────────────────────────────────

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    svc: Annotated[ReportService, Depends(_svc)],
) -> DashboardSummaryResponse:
    data = await svc.get_dashboard_summary()
    return DashboardSummaryResponse(**data)


# ── Asset Report ─────────────────────────────────────────────────────────────

@router.get("/assets", response_model=AssetReportResponse)
async def get_asset_report(
    svc: Annotated[ReportService, Depends(_svc)],
    department_id: int | None = Query(None),
    category_id: int | None = Query(None),
    status: str | None = Query(None),
) -> AssetReportResponse:
    data = await svc.get_asset_report(
        department_id=department_id,
        category_id=category_id,
        status=status,
    )
    return AssetReportResponse(**data)


# ── Department Report ────────────────────────────────────────────────────────

@router.get("/departments", response_model=DepartmentReportResponse)
async def get_department_report(
    svc: Annotated[ReportService, Depends(_svc)],
    department_id: int | None = Query(None),
) -> DepartmentReportResponse:
    data = await svc.get_department_report(department_id=department_id)
    return DepartmentReportResponse(**data)


# ── Maintenance Report ───────────────────────────────────────────────────────

@router.get("/maintenance", response_model=MaintenanceReportResponse)
async def get_maintenance_report(
    svc: Annotated[ReportService, Depends(_svc)],
    priority: str | None = Query(None),
    status: str | None = Query(None),
) -> MaintenanceReportResponse:
    data = await svc.get_maintenance_report(priority=priority, status=status)
    return MaintenanceReportResponse(**data)


# ── Booking Report ───────────────────────────────────────────────────────────

@router.get("/bookings", response_model=BookingReportResponse)
async def get_booking_report(
    svc: Annotated[ReportService, Depends(_svc)],
    asset_id: int | None = Query(None),
    status: str | None = Query(None),
) -> BookingReportResponse:
    data = await svc.get_booking_report(asset_id=asset_id, status=status)
    return BookingReportResponse(**data)


# ── Audit Report ─────────────────────────────────────────────────────────────

@router.get("/audits", response_model=AuditReportResponse)
async def get_audit_report(
    svc: Annotated[ReportService, Depends(_svc)],
    department_id: int | None = Query(None),
) -> AuditReportResponse:
    data = await svc.get_audit_report(department_id=department_id)
    return AuditReportResponse(**data)


# ── Export Endpoints (stub — returns raw data, frontend handles formatting) ──

@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    svc: Annotated[ReportService, Depends(_svc)],
    fmt: str = Query("csv", alias="format", regex="^(csv|pdf|excel)$"),
) -> dict[str, Any]:
    """Export report in requested format. Frontend handles actual file generation."""
    if report_type == "assets":
        data = await svc.get_asset_report()
    elif report_type == "departments":
        data = await svc.get_department_report()
    elif report_type == "maintenance":
        data = await svc.get_maintenance_report()
    elif report_type == "bookings":
        data = await svc.get_booking_report()
    elif report_type == "audits":
        data = await svc.get_audit_report()
    else:
        data = {}

    return {
        "report_type": report_type,
        "format": fmt,
        "data": data,
        "exported_at": str(datetime.now()),
    }