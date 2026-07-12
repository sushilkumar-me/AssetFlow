"""
AssetService — all business rules for asset management.

Responsibilities:
- Auto-generate collision-free asset tags (AF-000001 … AF-999999).
- Validate category existence and active status.
- Validate department existence and active status.
- Enforce serial number uniqueness.
- Soft-delete (never hard-delete).
- Paginated search + multi-dimensional filtering.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetCondition, AssetStatus
from app.repositories.asset_repository import AssetRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.department_repository import DepartmentRepository
from app.schemas.asset import (
    AssetCreateRequest,
    AssetListResponse,
    AssetResponse,
    AssetUpdateRequest,
)


_TAG_PREFIX = "AF"
_TAG_PAD    = 6          # AF-000001


def _format_tag(seq: int) -> str:
    return f"{_TAG_PREFIX}-{seq:0{_TAG_PAD}d}"


class AssetService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo      = AssetRepository(db)
        self._cat_repo  = CategoryRepository(db)
        self._dept_repo = DepartmentRepository(db)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_or_404(self, asset_id: int) -> Asset:
        asset = await self._repo.find_by_id(asset_id)
        if asset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset {asset_id} not found.",
            )
        return asset

    async def _validate_category(self, category_id: int) -> None:
        cat = await self._cat_repo.get_by_id(category_id)
        if cat is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Category {category_id} does not exist.",
            )
        if not cat.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot use an inactive category.",
            )

    async def _validate_department(self, department_id: int | None) -> None:
        if department_id is None:
            return
        dept = await self._dept_repo.get_by_id(department_id)
        if dept is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Department {department_id} does not exist.",
            )
        if not dept.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot assign asset to an inactive department.",
            )

    async def _validate_serial(
        self, serial: str | None, exclude_id: int | None = None
    ) -> None:
        if not serial:
            return
        existing = await self._repo.find_by_serial_number(serial)
        if existing and existing.id != exclude_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Serial number '{serial}' is already registered.",
            )

    async def _generate_tag(self) -> str:
        """
        Generate the next available asset tag.
        Retries up to 10 times in case of concurrent inserts.
        """
        for _ in range(10):
            seq = await self._repo.get_next_tag_sequence()
            tag = _format_tag(seq)
            if await self._repo.find_by_asset_tag(tag) is None:
                return tag
            # seq taken — increment and retry
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a unique asset tag. Please retry.",
        )

    # ── Public API ────────────────────────────────────────────────────────────

    async def list_assets(
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
    ) -> AssetListResponse:
        items, total = await self._repo.find_all(
            search=search,
            category_id=category_id,
            department_id=department_id,
            status=status,
            condition=condition,
            location=location,
            is_shared=is_shared,
            active_only=active_only,
            sort_by=sort_by,
            page=page,
            page_size=page_size,
        )
        return AssetListResponse(
            items=[AssetResponse.model_validate(a) for a in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_asset(self, asset_id: int) -> AssetResponse:
        return AssetResponse.model_validate(await self._get_or_404(asset_id))

    async def create_asset(
        self, payload: AssetCreateRequest, created_by: int
    ) -> AssetResponse:
        await self._validate_category(payload.category_id)
        await self._validate_department(payload.department_id)
        await self._validate_serial(payload.serial_number)

        tag = await self._generate_tag()

        asset = await self._repo.create(
            asset_tag=tag,
            name=payload.name,
            category_id=payload.category_id,
            serial_number=payload.serial_number,
            department_id=payload.department_id,
            status=AssetStatus.AVAILABLE,   # always AVAILABLE on creation
            condition=payload.condition,
            location=payload.location,
            acquisition_date=payload.acquisition_date,
            acquisition_cost=payload.acquisition_cost,
            description=payload.description,
            is_shared=payload.is_shared,
            photo_url=payload.photo_url,
            created_by=created_by,
        )
        return AssetResponse.model_validate(asset)

    async def update_asset(
        self, asset_id: int, payload: AssetUpdateRequest
    ) -> AssetResponse:
        asset = await self._get_or_404(asset_id)

        if not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot update a deactivated (soft-deleted) asset.",
            )

        update_data = payload.model_dump(exclude_unset=True)

        if "category_id" in update_data:
            await self._validate_category(update_data["category_id"])
        if "department_id" in update_data:
            await self._validate_department(update_data["department_id"])
        if "serial_number" in update_data:
            await self._validate_serial(update_data["serial_number"], exclude_id=asset_id)

        asset = await self._repo.update(asset, **update_data)
        return AssetResponse.model_validate(asset)

    async def update_status(
        self, asset_id: int, new_status: AssetStatus
    ) -> AssetResponse:
        asset = await self._get_or_404(asset_id)
        if not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot change status of a deactivated asset.",
            )
        asset = await self._repo.set_status(asset, new_status)
        return AssetResponse.model_validate(asset)

    async def soft_delete(self, asset_id: int) -> AssetResponse:
        asset = await self._get_or_404(asset_id)
        asset = await self._repo.soft_delete(asset)
        return AssetResponse.model_validate(asset)
