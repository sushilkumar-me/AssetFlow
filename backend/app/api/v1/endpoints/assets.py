"""
Asset Management endpoints.

Read  (GET)           — any authenticated user.
Write (POST/PUT/PATCH/DELETE) — ADMIN or ASSET_MANAGER only.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_asset_manager
from app.dependencies.database import get_db
from app.models.asset import AssetCondition, AssetStatus
from app.models.user import User
from app.schemas.asset import (
    AssetCreateRequest,
    AssetListResponse,
    AssetResponse,
    AssetStatusUpdate,
    AssetUpdateRequest,
)
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["Assets"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> AssetService:
    return AssetService(db)


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=AssetListResponse, summary="List / search assets")
async def list_assets(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AssetService, Depends(_svc)],
    search: str | None = Query(None, description="Search tag, name, serial, location"),
    category: int | None = Query(None, alias="category"),
    department: int | None = Query(None, alias="department"),
    status: AssetStatus | None = Query(None),
    condition: AssetCondition | None = Query(None),
    location: str | None = Query(None),
    is_shared: bool | None = Query(None),
    active_only: bool = Query(True),
    sort_by: str = Query("newest", pattern="^(newest|oldest|name|category)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AssetListResponse:
    return await svc.list_assets(
        search=search,
        category_id=category,
        department_id=department,
        status=status,
        condition=condition,
        location=location,
        is_shared=is_shared,
        active_only=active_only,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=AssetResponse, summary="Get asset by ID")
async def get_asset(
    asset_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[AssetService, Depends(_svc)],
) -> AssetResponse:
    return await svc.get_asset(asset_id)


# ── Write ─────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new asset (Admin / Asset Manager)",
)
async def create_asset(
    payload: AssetCreateRequest,
    current_user: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AssetService, Depends(_svc)],
) -> AssetResponse:
    return await svc.create_asset(payload, created_by=current_user.id)


@router.put(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Update asset (Admin / Asset Manager)",
)
async def update_asset(
    asset_id: int,
    payload: AssetUpdateRequest,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AssetService, Depends(_svc)],
) -> AssetResponse:
    return await svc.update_asset(asset_id, payload)


@router.patch(
    "/{asset_id}/status",
    response_model=AssetResponse,
    summary="Change asset status (Admin / Asset Manager)",
)
async def update_status(
    asset_id: int,
    payload: AssetStatusUpdate,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AssetService, Depends(_svc)],
) -> AssetResponse:
    return await svc.update_status(asset_id, payload.status)


@router.delete(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Soft-delete asset (Admin / Asset Manager)",
)
async def delete_asset(
    asset_id: int,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[AssetService, Depends(_svc)],
) -> AssetResponse:
    """Marks the asset as inactive. No data is physically removed."""
    return await svc.soft_delete(asset_id)
