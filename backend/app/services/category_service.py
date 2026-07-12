"""
CategoryService — business rules for asset category management.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import AssetCategory
from app.repositories.category_repository import CategoryRepository
from app.schemas.organization import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)


class CategoryService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = CategoryRepository(db)

    async def get_or_404(self, cat_id: int) -> AssetCategory:
        cat = await self._repo.get_by_id(cat_id)
        if cat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Category {cat_id} not found.")
        return cat

    async def list_categories(
        self,
        search: str | None = None,
        active_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> CategoryListResponse:
        items, total = await self._repo.list(search, active_only, page, page_size)
        return CategoryListResponse(
            items=[CategoryResponse.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_category(self, cat_id: int) -> CategoryResponse:
        return CategoryResponse.model_validate(await self.get_or_404(cat_id))

    async def create_category(self, payload: CategoryCreate) -> CategoryResponse:
        if await self._repo.get_by_name(payload.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=f"Category '{payload.name}' already exists.")
        cat = await self._repo.create(
            name=payload.name,
            description=payload.description,
            custom_fields=payload.custom_fields,
        )
        return CategoryResponse.model_validate(cat)

    async def update_category(
        self, cat_id: int, payload: CategoryUpdate
    ) -> CategoryResponse:
        cat = await self.get_or_404(cat_id)

        if payload.name and payload.name.strip().lower() != cat.name.lower():
            if await self._repo.get_by_name(payload.name):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail=f"Category '{payload.name}' already exists.")

        update_data = payload.model_dump(exclude_unset=True)
        cat = await self._repo.update(cat, **update_data)
        return CategoryResponse.model_validate(cat)

    async def set_status(self, cat_id: int, is_active: bool) -> CategoryResponse:
        cat = await self.get_or_404(cat_id)
        cat = await self._repo.set_active(cat, is_active)
        return CategoryResponse.model_validate(cat)
