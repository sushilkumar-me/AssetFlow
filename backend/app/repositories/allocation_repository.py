"""
AssetAllocationRepository — all DB access for AssetAllocation.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import AllocationStatus, AssetAllocation


class AssetAllocationRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, alloc_id: int) -> AssetAllocation | None:
        result = await self._db.execute(
            select(AssetAllocation).where(AssetAllocation.id == alloc_id)
        )
        return result.scalar_one_or_none()

    async def get_active_for_asset(self, asset_id: int) -> AssetAllocation | None:
        """Return the single ACTIVE (or OVERDUE) allocation for an asset, if any."""
        result = await self._db.execute(
            select(AssetAllocation).where(
                AssetAllocation.asset_id == asset_id,
                AssetAllocation.status.in_([AllocationStatus.ACTIVE, AllocationStatus.OVERDUE]),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        employee_id: int | None = None,
        asset_id: int | None = None,
        department_id: int | None = None,
        status: AllocationStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AssetAllocation], int]:
        from app.models.user import User

        query = select(AssetAllocation)
        if employee_id is not None:
            query = query.where(AssetAllocation.employee_id == employee_id)
        if asset_id is not None:
            query = query.where(AssetAllocation.asset_id == asset_id)
        if status is not None:
            query = query.where(AssetAllocation.status == status)
        if department_id is not None:
            query = query.join(User, AssetAllocation.employee_id == User.id).where(
                User.department_id == department_id
            )

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(AssetAllocation.allocated_at.desc()).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def list_for_asset_history(self, asset_id: int) -> list[AssetAllocation]:
        """Full allocation history for an asset, newest first."""
        result = await self._db.execute(
            select(AssetAllocation)
            .where(AssetAllocation.asset_id == asset_id)
            .order_by(AssetAllocation.allocated_at.desc())
        )
        return list(result.scalars().all())

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        asset_id: int,
        employee_id: int,
        allocated_by: int,
        expected_return_date: date | None,
        condition_notes: str | None,
    ) -> AssetAllocation:
        alloc = AssetAllocation(
            asset_id=asset_id,
            employee_id=employee_id,
            allocated_by=allocated_by,
            expected_return_date=expected_return_date,
            condition_notes=condition_notes,
            status=AllocationStatus.ACTIVE,
        )
        self._db.add(alloc)
        await self._db.flush()
        await self._db.refresh(alloc)
        return alloc

    async def mark_returned(
        self,
        alloc: AssetAllocation,
        condition_notes: str | None,
    ) -> AssetAllocation:
        alloc.returned_at = datetime.now(tz=timezone.utc)
        alloc.status = AllocationStatus.RETURNED
        if condition_notes is not None:
            alloc.condition_notes = condition_notes
        await self._db.flush()
        await self._db.refresh(alloc)
        return alloc

    async def close(self, alloc: AssetAllocation) -> AssetAllocation:
        """Close an allocation without requiring condition notes (used by transfer approval)."""
        alloc.returned_at = datetime.now(tz=timezone.utc)
        alloc.status = AllocationStatus.RETURNED
        await self._db.flush()
        await self._db.refresh(alloc)
        return alloc

    async def mark_overdue_batch(self) -> int:
        """
        Batch-update all ACTIVE allocations whose expected_return_date has passed.
        Returns the number of records updated.
        """
        today = date.today()
        result = await self._db.execute(
            update(AssetAllocation)
            .where(
                AssetAllocation.status == AllocationStatus.ACTIVE,
                AssetAllocation.expected_return_date < today,
                AssetAllocation.expected_return_date.is_not(None),
            )
            .values(status=AllocationStatus.OVERDUE)
        )
        await self._db.flush()
        return result.rowcount
