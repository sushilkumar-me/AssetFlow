"""
Allocation endpoints.

POST   /allocations           — Allocate asset (ADMIN, ASSET_MANAGER)
GET    /allocations           — List allocations (any auth user)
GET    /allocations/{id}      — Get allocation by ID
PATCH  /allocations/{id}/return — Return asset (ADMIN, ASSET_MANAGER)
GET    /allocations/asset/{asset_id}/history — Full history for an asset
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_asset_manager
from app.dependencies.database import get_db
from app.models.allocation import AllocationStatus
from app.models.user import User
from app.schemas.allocation import (
    AllocateRequest,
    AllocationListResponse,
    AllocationResponse,
    ReturnRequest,
)
from app.services.allocation_service import AllocationService

router = APIRouter(prefix="/allocations", tags=["Allocations"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> AllocationService:
    return AllocationService(db)


@router.post(
    "",
    response_model=AllocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Allocate an asset to an employee (Admin / Asset Manager)",
)
async def allocate_asset(
    payload: AllocateRequest,
    current_user: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AllocationService, Depends(_svc)],
) -> AllocationResponse:
    return await svc.allocate(payload, allocated_by=current_user.id)


@router.get("", response_model=AllocationListResponse, summary="List allocations")
async def list_allocations(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AllocationService, Depends(_svc)],
    employee_id: int | None = Query(None),
    asset_id: int | None = Query(None),
    department_id: int | None = Query(None),
    alloc_status: AllocationStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AllocationListResponse:
    return await svc.list_allocations(
        employee_id=employee_id,
        asset_id=asset_id,
        department_id=department_id,
        alloc_status=alloc_status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/asset/{asset_id}/history",
    response_model=list[AllocationResponse],
    summary="Full allocation history for an asset",
)
async def asset_history(
    asset_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AllocationService, Depends(_svc)],
) -> list[AllocationResponse]:
    return await svc.get_asset_history(asset_id)


@router.get("/{alloc_id}", response_model=AllocationResponse, summary="Get allocation by ID")
async def get_allocation(
    alloc_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AllocationService, Depends(_svc)],
) -> AllocationResponse:
    return await svc.get_allocation(alloc_id)


@router.patch(
    "/{alloc_id}/return",
    response_model=AllocationResponse,
    summary="Return an asset (Admin / Asset Manager)",
)
async def return_asset(
    alloc_id: int,
    payload: ReturnRequest,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AllocationService, Depends(_svc)],
) -> AllocationResponse:
    return await svc.return_asset(alloc_id, payload)
