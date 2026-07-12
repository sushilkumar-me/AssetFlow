"""
CategoryRepository — all DB access for AssetCategory.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import AssetCategory


class CategoryRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, cat_id: int) -> AssetCategory | None:
        result = await self._db.execute(
            select(AssetCategory).where(AssetCategory.id == cat_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> AssetCategory | None:
        result = await self._db.execute(
            select(AssetCategory).where(
                func.lower(AssetCategory.name) == name.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        search: str | None = None,
        active_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AssetCategory], int]:
        query = select(AssetCategory)
        if search:
            query = query.where(AssetCategory.name.ilike(f"%{search}%"))
        if active_only:
            query = query.where(AssetCategory.is_active.is_(True))

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(AssetCategory.name).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def create(
        self,
        name: str,
        description: str | None,
        custom_fields: dict[str, Any] | None,
    ) -> AssetCategory:
        cat = AssetCategory(
            name=name.strip(),
            description=description,
            custom_fields=custom_fields,
        )
        self._db.add(cat)
        await self._db.flush()
        await self._db.refresh(cat)
        return cat

    async def update(self, cat: AssetCategory, **kwargs) -> AssetCategory:
        for key, value in kwargs.items():
            setattr(cat, key, value)
        await self._db.flush()
        await self._db.refresh(cat)
        return cat

    async def set_active(self, cat: AssetCategory, is_active: bool) -> AssetCategory:
        cat.is_active = is_active
        await self._db.flush()
        await self._db.refresh(cat)
        return cat
