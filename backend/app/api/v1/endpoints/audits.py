"""
Audit Management endpoints.

POST   /audits                       — Create cycle (Admin only)
GET    /audits                       — List cycles
GET    /audits/{id}                  — Get cycle detail
PATCH  /audits/{id}/assign-auditors  — Assign auditors (Admin only)
POST   /audits/{id}/verify           — Verify an asset (assigned auditor / admin)
GET    /audits/{id}/records          — All verification records
GET    /audits/{id}/discrepancies    — Discrepancy report
PATCH  /audits/{id}/close            — Close cycle (Admin only)
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.database import get_db
from app.models.audit import AuditCycleStatus
from app.models.user import User, UserRole
from app.schemas.audit import (
    AssignAuditorsRequest,
    AuditCycleCreateRequest,
    AuditCycleListResponse,
    AuditCycleResponse,
    AuditRecordResponse,
    DiscrepancyReport,
    VerifyAssetRequest,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audits", tags=["Audits"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> AuditService:
    return AuditService(db)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=AuditCycleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create audit cycle (Admin only)",
)
async def create_cycle(
    payload: AuditCycleCreateRequest,
    current_user: Annotated[User, Depends(require_admin)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> AuditCycleResponse:
    return await svc.create_cycle(payload, current_user.id)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=AuditCycleListResponse, summary="List audit cycles")
async def list_cycles(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AuditService, Depends(_svc)],
    search: str | None = Query(None),
    cycle_status: AuditCycleStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AuditCycleListResponse:
    return await svc.list_cycles(search, cycle_status, page, page_size)


@router.get("/{cycle_id}", response_model=AuditCycleResponse, summary="Get audit cycle by ID")
async def get_cycle(
    cycle_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> AuditCycleResponse:
    return await svc.get_cycle(cycle_id)


@router.get(
    "/{cycle_id}/records",
    response_model=list[AuditRecordResponse],
    summary="All verification records for a cycle",
)
async def get_records(
    cycle_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> list[AuditRecordResponse]:
    return await svc.get_records(cycle_id)


@router.get(
    "/{cycle_id}/discrepancies",
    response_model=DiscrepancyReport,
    summary="Discrepancy report for a cycle",
)
async def get_discrepancies(
    cycle_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> DiscrepancyReport:
    return await svc.get_discrepancies(cycle_id)


# ── Write ─────────────────────────────────────────────────────────────────────

@router.patch(
    "/{cycle_id}/assign-auditors",
    response_model=AuditCycleResponse,
    summary="Assign auditors to a cycle (Admin only)",
)
async def assign_auditors(
    cycle_id: int,
    payload: AssignAuditorsRequest,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> AuditCycleResponse:
    return await svc.assign_auditors(cycle_id, payload)


@router.post(
    "/{cycle_id}/verify",
    response_model=AuditRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Verify an asset in a cycle (assigned auditor / admin)",
)
async def verify_asset(
    cycle_id: int,
    payload: VerifyAssetRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> AuditRecordResponse:
    return await svc.verify_asset(
        cycle_id,
        payload,
        auditor_id=current_user.id,
        is_admin=current_user.role == UserRole.ADMIN,
    )


@router.patch(
    "/{cycle_id}/close",
    response_model=AuditCycleResponse,
    summary="Close audit cycle (Admin only)",
)
async def close_cycle(
    cycle_id: int,
    current_user: Annotated[User, Depends(require_admin)],
    svc: Annotated[AuditService, Depends(_svc)],
) -> AuditCycleResponse:
    return await svc.close_cycle(cycle_id, current_user.id)
