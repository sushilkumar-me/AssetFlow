"""
Transfer Request endpoints.

POST   /transfers                    — Create transfer request (EMPLOYEE and above)
GET    /transfers                    — List transfers (any auth user)
GET    /transfers/{id}               — Get transfer by ID
PATCH  /transfers/{id}/approve       — Approve (ADMIN, ASSET_MANAGER, DEPT_HEAD)
PATCH  /transfers/{id}/reject        — Reject  (ADMIN, ASSET_MANAGER, DEPT_HEAD)
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import (
    get_current_user,
    require_department_head,
    require_employee,
)
from app.dependencies.database import get_db
from app.models.allocation import TransferStatus
from app.models.user import User
from app.schemas.allocation import (
    TransferActionRequest,
    TransferCreateRequest,
    TransferListResponse,
    TransferResponse,
)
from app.services.transfer_service import TransferService

router = APIRouter(prefix="/transfers", tags=["Transfers"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> TransferService:
    return TransferService(db)


@router.post(
    "",
    response_model=TransferResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a transfer request (Employee and above)",
)
async def create_transfer(
    payload: TransferCreateRequest,
    current_user: Annotated[User, Depends(require_employee)],
    svc: Annotated[TransferService, Depends(_svc)],
) -> TransferResponse:
    return await svc.create_transfer(payload, requested_by=current_user.id)


@router.get("", response_model=TransferListResponse, summary="List transfer requests")
async def list_transfers(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[TransferService, Depends(_svc)],
    asset_id: int | None = Query(None),
    transfer_status: TransferStatus | None = Query(None, alias="status"),
    requested_by: int | None = Query(None),
    to_employee_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> TransferListResponse:
    return await svc.list_transfers(
        asset_id=asset_id,
        transfer_status=transfer_status,
        requested_by=requested_by,
        to_employee_id=to_employee_id,
        page=page,
        page_size=page_size,
    )


@router.get("/{transfer_id}", response_model=TransferResponse, summary="Get transfer by ID")
async def get_transfer(
    transfer_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[TransferService, Depends(_svc)],
) -> TransferResponse:
    return await svc.get_transfer(transfer_id)


@router.patch(
    "/{transfer_id}/approve",
    response_model=TransferResponse,
    summary="Approve a transfer request (Admin / Asset Manager / Dept Head)",
)
async def approve_transfer(
    transfer_id: int,
    payload: TransferActionRequest,
    current_user: Annotated[User, Depends(require_department_head)],
    svc: Annotated[TransferService, Depends(_svc)],
) -> TransferResponse:
    return await svc.approve_transfer(transfer_id, current_user.id, payload)


@router.patch(
    "/{transfer_id}/reject",
    response_model=TransferResponse,
    summary="Reject a transfer request (Admin / Asset Manager / Dept Head)",
)
async def reject_transfer(
    transfer_id: int,
    payload: TransferActionRequest,
    current_user: Annotated[User, Depends(require_department_head)],
    svc: Annotated[TransferService, Depends(_svc)],
) -> TransferResponse:
    return await svc.reject_transfer(transfer_id, current_user.id, payload)
