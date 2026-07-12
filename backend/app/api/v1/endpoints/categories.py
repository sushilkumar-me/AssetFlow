"""
Asset Categories endpoints.
Write operations require ADMIN or ASSET_MANAGER role.
Read operations available to any authenticated user.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_admin, require_asset_manager
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.organization import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryStatusUpdate,
    CategoryUpdate,
)
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> CategoryService:
    return CategoryService(db)


@router.get("", response_model=CategoryListResponse, summary="List categories")
async def list_categories(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[CategoryService, Depends(_svc)],
    search: str | None = Query(None),
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CategoryListResponse:
    return await svc.list_categories(search, active_only, page, page_size)


@router.get("/{cat_id}", response_model=CategoryResponse, summary="Get category by ID")
async def get_category(
    cat_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[CategoryService, Depends(_svc)],
) -> CategoryResponse:
    return await svc.get_category(cat_id)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create category (Admin / Asset Manager)",
)
async def create_category(
    payload: CategoryCreate,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[CategoryService, Depends(_svc)],
) -> CategoryResponse:
    return await svc.create_category(payload)


@router.put("/{cat_id}", response_model=CategoryResponse, summary="Update category (Admin / Asset Manager)")
async def update_category(
    cat_id: int,
    payload: CategoryUpdate,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[CategoryService, Depends(_svc)],
) -> CategoryResponse:
    return await svc.update_category(cat_id, payload)


@router.patch("/{cat_id}/status", response_model=CategoryResponse, summary="Activate/deactivate category (Admin / Asset Manager)")
async def set_category_status(
    cat_id: int,
    payload: CategoryStatusUpdate,
    _: Annotated[User, Depends(require_asset_manager)],
    svc: Annotated[CategoryService, Depends(_svc)],
) -> CategoryResponse:
    return await svc.set_status(cat_id, payload.is_active)
