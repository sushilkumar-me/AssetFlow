"""
AllocationService — business rules for asset allocation and return.

Business rules enforced:
  1. Only AVAILABLE assets can be allocated.
  2. One active allocation per asset at a time (409 with current holder name if violated).
  3. Return sets asset status back to AVAILABLE.
  4. Overdue detection via batch update.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import AllocationStatus, AssetAllocation
from app.models.asset import Asset, AssetStatus
from app.repositories.allocation_repository import AssetAllocationRepository
from app.repositories.asset_repository import AssetRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.allocation import (
    AllocateRequest,
    AllocationListResponse,
    AllocationResponse,
    ReturnRequest,
)


class AllocationService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo      = AssetAllocationRepository(db)
        self._asset_repo = AssetRepository(db)
        self._emp_repo   = EmployeeRepository(db)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_alloc_or_404(self, alloc_id: int) -> AssetAllocation:
        alloc = await self._repo.get_by_id(alloc_id)
        if alloc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Allocation {alloc_id} not found.")
        return alloc

    async def _get_asset_or_422(self, asset_id: int) -> Asset:
        asset = await self._asset_repo.find_by_id(asset_id)
        if asset is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Asset {asset_id} does not exist.")
        if not asset.is_active:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Cannot allocate a deactivated asset.")
        return asset

    async def _get_employee_or_422(self, employee_id: int) -> None:
        emp = await self._emp_repo.get_by_id(employee_id)
        if emp is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"Employee {employee_id} does not exist.")
        if not emp.is_active:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Cannot allocate to an inactive employee.")

    # ── Public API ────────────────────────────────────────────────────────────

    async def allocate(
        self, payload: AllocateRequest, allocated_by: int
    ) -> AllocationResponse:
        """
        Allocate an available asset to an employee.
        Raises 409 if the asset is already allocated, naming the current holder.
        """
        asset = await self._get_asset_or_422(payload.asset_id)
        await self._get_employee_or_422(payload.employee_id)

        # Rule 1 — must be AVAILABLE
        if asset.status != AssetStatus.AVAILABLE:
            # Check for existing allocation to give a helpful message
            existing = await self._repo.get_active_for_asset(payload.asset_id)
            if existing:
                emp = await self._emp_repo.get_by_id(existing.employee_id)
                holder_name = emp.full_name if emp else f"employee #{existing.employee_id}"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Asset is currently allocated to {holder_name}.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Asset is not available for allocation (status: {asset.status.value}).",
            )

        # Rule 2 — exactly one active allocation
        existing = await self._repo.get_active_for_asset(payload.asset_id)
        if existing:
            emp = await self._emp_repo.get_by_id(existing.employee_id)
            holder_name = emp.full_name if emp else f"employee #{existing.employee_id}"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Asset is currently allocated to {holder_name}.",
            )

        alloc = await self._repo.create(
            asset_id=payload.asset_id,
            employee_id=payload.employee_id,
            allocated_by=allocated_by,
            expected_return_date=payload.expected_return_date,
            condition_notes=payload.condition_notes,
        )

        # Update asset status → ALLOCATED
        await self._asset_repo.update(asset, status=AssetStatus.ALLOCATED)

        return AllocationResponse.model_validate(alloc)

    async def return_asset(
        self, alloc_id: int, payload: ReturnRequest
    ) -> AllocationResponse:
        """
        Mark an allocation as returned and set asset status back to AVAILABLE.
        """
        alloc = await self._get_alloc_or_404(alloc_id)

        if alloc.status == AllocationStatus.RETURNED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This asset has already been returned.",
            )

        alloc = await self._repo.mark_returned(alloc, payload.condition_notes)

        # Update asset status → AVAILABLE
        asset = await self._asset_repo.find_by_id(alloc.asset_id)
        if asset:
            await self._asset_repo.update(asset, status=AssetStatus.AVAILABLE)

        return AllocationResponse.model_validate(alloc)

    async def get_allocation(self, alloc_id: int) -> AllocationResponse:
        return AllocationResponse.model_validate(await self._get_alloc_or_404(alloc_id))

    async def list_allocations(
        self,
        employee_id: int | None = None,
        asset_id: int | None = None,
        department_id: int | None = None,
        alloc_status: AllocationStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AllocationListResponse:
        # Refresh overdue status before listing
        await self._repo.mark_overdue_batch()

        items, total = await self._repo.list(
            employee_id=employee_id,
            asset_id=asset_id,
            department_id=department_id,
            status=alloc_status,
            page=page,
            page_size=page_size,
        )
        return AllocationListResponse(
            items=[AllocationResponse.model_validate(a) for a in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_asset_history(self, asset_id: int) -> list[AllocationResponse]:
        """Return all allocations for an asset, newest first."""
        items = await self._repo.list_for_asset_history(asset_id)
        return [AllocationResponse.model_validate(a) for a in items]

    async def mark_overdue(self) -> dict[str, int]:
        """Batch-mark overdue allocations. Useful as a scheduled task."""
        count = await self._repo.mark_overdue_batch()
        return {"updated": count}
