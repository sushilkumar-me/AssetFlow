"""
Maintenance Management endpoints.

POST   /maintenance                         — Raise request (holder / asset-mgr / admin)
GET    /maintenance                         — List requests (scoped by role)
GET    /maintenance/{id}                    — Get request by ID
PATCH  /maintenance/{id}/approve            — Approve  (asset-mgr / admin)
PATCH  /maintenance/{id}/reject             — Reject   (asset-mgr / admin)
PATCH  /maintenance/{id}/assign-technician  — Assign   (asset-mgr / admin)
PATCH  /maintenance/{id}/start              — Start    (asset-mgr / admin)
PATCH  /maintenance/{id}/resolve            — Resolve  (asset-mgr / admin)
GET    /assets/{asset_id}/maintenance-history — Full history for an asset
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_asset_manager, require_employee
from app.dependencies.database import get_db
from app.models.maintenance import MaintenancePriority, MaintenanceStatus
from app.models.user import User, UserRole
from app.schemas.maintenance import (
    MaintenanceApproveRequest,
    MaintenanceAssignRequest,
    MaintenanceCreateRequest,
    MaintenanceListResponse,
    MaintenanceRejectRequest,
    MaintenanceResolveRequest,
    MaintenanceResponse,
)
from app.services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

# Separate router for the asset-scoped history endpoint
asset_router = APIRouter(tags=["Maintenance"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> MaintenanceService:
    return MaintenanceService(db)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Raise a maintenance request",
)
async def create_request(
    payload: MaintenanceCreateRequest,
    current_user: Annotated[User, Depends(require_employee)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.create_request(payload, current_user.id, current_user.role)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=MaintenanceListResponse, summary="List maintenance requests")
async def list_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
    search: str | None = Query(None),
    asset_id: int | None = Query(None),
    priority: MaintenancePriority | None = Query(None),
    req_status: MaintenanceStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> MaintenanceListResponse:
    # Employees see only their own requests
    raised_by: int | None = None
    if current_user.role == UserRole.EMPLOYEE:
        raised_by = current_user.id

    return await svc.list_requests(
        search=search,
        raised_by=raised_by,
        asset_id=asset_id,
        priority=priority,
        req_status=req_status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{req_id}",
    response_model=MaintenanceResponse,
    summary="Get maintenance request by ID",
)
async def get_request(
    req_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.get_request(req_id)


# ── Workflow transitions (asset-manager / admin only) ─────────────────────────

@router.patch(
    "/{req_id}/approve",
    response_model=MaintenanceResponse,
    summary="Approve a maintenance request",
)
async def approve_request(
    req_id: int,
    payload: MaintenanceApproveRequest,
    current_user: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.approve_request(req_id, payload, current_user.id)


@router.patch(
    "/{req_id}/reject",
    response_model=MaintenanceResponse,
    summary="Reject a maintenance request",
)
async def reject_request(
    req_id: int,
    payload: MaintenanceRejectRequest,
    current_user: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.reject_request(req_id, payload, current_user.id)


@router.patch(
    "/{req_id}/assign-technician",
    response_model=MaintenanceResponse,
    summary="Assign a technician",
)
async def assign_technician(
    req_id: int,
    payload: MaintenanceAssignRequest,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.assign_technician(req_id, payload)


@router.patch(
    "/{req_id}/start",
    response_model=MaintenanceResponse,
    summary="Start maintenance work",
)
async def start_work(
    req_id: int,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.start_work(req_id)


@router.patch(
    "/{req_id}/resolve",
    response_model=MaintenanceResponse,
    summary="Resolve maintenance request",
)
async def resolve_request(
    req_id: int,
    payload: MaintenanceResolveRequest,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> MaintenanceResponse:
    return await svc.resolve_request(req_id, payload)


# ── Asset-scoped history endpoint (registered on assets router) ───────────────

@asset_router.get(
    "/assets/{asset_id}/maintenance-history",
    response_model=list[MaintenanceResponse],
    summary="Full maintenance history for an asset",
    tags=["Maintenance"],
)
async def asset_maintenance_history(
    asset_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[MaintenanceService, Depends(_svc)],
) -> list[MaintenanceResponse]:
    return await svc.get_asset_history(asset_id)
