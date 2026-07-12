"""
AssetRepository — all DB access for the Asset model.
Business logic (tag generation, validation) lives in AssetService, not here.
"""

from __future__ import annotations

import math
from decimal import Decimal
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetCondition, AssetStatus


class AssetRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Single-record queries ─────────────────────────────────────────────────

    async def find_by_id(self, asset_id: int) -> Asset | None:
        result = await self._db.execute(
            select(Asset).where(Asset.id == asset_id)
        )
        return result.scalar_one_or_none()

    async def find_by_asset_tag(self, tag: str) -> Asset | None:
        result = await self._db.execute(
            select(Asset).where(Asset.asset_tag == tag)
        )
        return result.scalar_one_or_none()

    async def find_by_serial_number(self, serial: str) -> Asset | None:
        result = await self._db.execute(
            select(Asset).where(Asset.serial_number == serial)
        )
        return result.scalar_one_or_none()

    # ── Tag generation helper ────────────────────────────────────────────────

    async def get_next_tag_sequence(self) -> int:
        """Return the current max id + 1 to generate the next asset tag."""
        result = await self._db.execute(select(func.count(Asset.id)))
        count = result.scalar_one()
        # Use max id so deletes don't cause collisions
        max_result = await self._db.execute(select(func.max(Asset.id)))
        max_id = max_result.scalar_one() or 0
        return max_id + 1

    # ── Paginated list / search ───────────────────────────────────────────────

    async def find_all(
        self,
        search: str | None = None,
        category_id: int | None = None,
        department_id: int | None = None,
        status: AssetStatus | None = None,
        condition: AssetCondition | None = None,
        location: str | None = None,
        is_shared: bool | None = None,
        active_only: bool = True,
        sort_by: str = "newest",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Asset], int]:
        query = select(Asset)

        if active_only:
            query = query.where(Asset.is_active.is_(True))
        if search:
            query = query.where(
                or_(
                    Asset.name.ilike(f"%{search}%"),
                    Asset.asset_tag.ilike(f"%{search}%"),
                    Asset.serial_number.ilike(f"%{search}%"),
                    Asset.location.ilike(f"%{search}%"),
                )
            )
        if category_id is not None:
            query = query.where(Asset.category_id == category_id)
        if department_id is not None:
            query = query.where(Asset.department_id == department_id)
        if status is not None:
            query = query.where(Asset.status == status)
        if condition is not None:
            query = query.where(Asset.condition == condition)
        if location is not None:
            query = query.where(Asset.location.ilike(f"%{location}%"))
        if is_shared is not None:
            query = query.where(Asset.is_shared.is_(is_shared))

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        # ── Sorting ───────────────────────────────────────────────────────────
        if sort_by == "oldest":
            query = query.order_by(Asset.created_at.asc())
        elif sort_by == "name":
            query = query.order_by(Asset.name.asc())
        elif sort_by == "category":
            query = query.order_by(Asset.category_id.asc(), Asset.name.asc())
        else:  # newest (default)
            query = query.order_by(Asset.created_at.desc())

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        asset_tag: str,
        name: str,
        category_id: int,
        serial_number: str | None,
        department_id: int | None,
        status: AssetStatus,
        condition: AssetCondition,
        location: str | None,
        acquisition_date: date | None,
        acquisition_cost: Decimal | None,
        description: str | None,
        is_shared: bool,
        photo_url: str | None,
        created_by: int | None,
    ) -> Asset:
        asset = Asset(
            asset_tag=asset_tag,
            name=name.strip(),
            category_id=category_id,
            serial_number=serial_number,
            department_id=department_id,
            status=status,
            condition=condition,
            location=location,
            acquisition_date=acquisition_date,
            acquisition_cost=acquisition_cost,
            description=description,
            is_shared=is_shared,
            photo_url=photo_url,
            created_by=created_by,
        )
        self._db.add(asset)
        await self._db.flush()
        await self._db.refresh(asset)
        return asset

    async def update(self, asset: Asset, **kwargs) -> Asset:
        for key, value in kwargs.items():
            setattr(asset, key, value)
        await self._db.flush()
        await self._db.refresh(asset)
        return asset

    async def soft_delete(self, asset: Asset) -> Asset:
        asset.is_active = False
        await self._db.flush()
        await self._db.refresh(asset)
        return asset

    async def set_status(self, asset: Asset, status: AssetStatus) -> Asset:
        asset.status = status
        await self._db.flush()
        await self._db.refresh(asset)
        return asset
