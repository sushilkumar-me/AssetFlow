"""
TransferService — business rules for asset transfer requests.

Business rules enforced:
  - Transfer target must differ from current holder.
  - Asset must have an active allocation to transfer.
  - Only one PENDING transfer per asset at a time.
  - Approval: closes current allocation, opens new one, asset stays ALLOCATED.
  - Only PENDING transfers can be approved or rejected.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import AllocationStatus, TransferStatus
from app.models.asset import AssetStatus
from app.repositories.allocation_repository import AssetAllocationRepository
from app.repositories.asset_repository import AssetRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.transfer_repository import TransferRepository
from app.schemas.allocation import (
    TransferActionRequest,
    TransferCreateRequest,
    TransferListResponse,
    TransferResponse,
)


class TransferService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo       = TransferRepository(db)
        self._alloc_repo = AssetAllocationRepository(db)
        self._asset_repo = AssetRepository(db)
        self._emp_repo   = EmployeeRepository(db)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, transfer_id: int):
        tr = await self._repo.get_by_id(transfer_id)
        if tr is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Transfer request {transfer_id} not found.")
        return tr

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_transfer(
        self, payload: TransferCreateRequest, requested_by: int
    ) -> TransferResponse:
        """
        Create a pending transfer request.
        The asset must be currently ALLOCATED and the requester must be
        the current holder (or an admin / asset-manager).
        """
        asset = await self._asset_repo.find_by_id(payload.asset_id)
        if asset is None or not asset.is_active:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Asset not found or inactive.")

        if asset.status != AssetStatus.ALLOCATED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Only ALLOCATED assets can be transferred. Allocate the asset first.",
            )

        # Must have an active allocation to identify from_employee
        current_alloc = await self._alloc_repo.get_active_for_asset(payload.asset_id)
        if current_alloc is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No active allocation found for this asset.",
            )

        from_employee_id = current_alloc.employee_id

        # Cannot transfer to the current holder
        if payload.to_employee_id == from_employee_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transfer target cannot be the current asset holder.",
            )

        # Validate target employee
        to_emp = await self._emp_repo.get_by_id(payload.to_employee_id)
        if to_emp is None or not to_emp.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Target employee not found or inactive.",
            )

        # Only one PENDING transfer per asset
        existing_pending = await self._repo.get_pending_for_asset(payload.asset_id)
        if existing_pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A transfer request for this asset is already pending.",
            )

        tr = await self._repo.create(
            asset_id=payload.asset_id,
            from_employee_id=from_employee_id,
            to_employee_id=payload.to_employee_id,
            requested_by=requested_by,
            remarks=payload.remarks,
        )
        return TransferResponse.model_validate(tr)

    async def approve_transfer(
        self, transfer_id: int, approver_id: int, payload: TransferActionRequest
    ) -> TransferResponse:
        """
        Approve a transfer:
          1. Close the current active allocation.
          2. Open a new allocation to the target employee.
          3. Asset remains ALLOCATED.
        """
        tr = await self._get_or_404(transfer_id)

        if tr.status != TransferStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only PENDING transfers can be approved (current: {tr.status.value}).",
            )

        # Close current allocation
        current_alloc = await self._alloc_repo.get_active_for_asset(tr.asset_id)
        if current_alloc:
            await self._alloc_repo.close(current_alloc)

        # Open new allocation for the target employee
        await self._alloc_repo.create(
            asset_id=tr.asset_id,
            employee_id=tr.to_employee_id,
            allocated_by=approver_id,
            expected_return_date=None,
            condition_notes=None,
        )

        # Asset stays ALLOCATED — no status change needed
        tr = await self._repo.approve(tr, approver_id, payload.remarks)
        return TransferResponse.model_validate(tr)

    async def reject_transfer(
        self, transfer_id: int, approver_id: int, payload: TransferActionRequest
    ) -> TransferResponse:
        tr = await self._get_or_404(transfer_id)

        if tr.status != TransferStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only PENDING transfers can be rejected (current: {tr.status.value}).",
            )

        tr = await self._repo.reject(tr, approver_id, payload.remarks)
        return TransferResponse.model_validate(tr)

    async def get_transfer(self, transfer_id: int) -> TransferResponse:
        return TransferResponse.model_validate(await self._get_or_404(transfer_id))

    async def list_transfers(
        self,
        asset_id: int | None = None,
        transfer_status: TransferStatus | None = None,
        requested_by: int | None = None,
        to_employee_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> TransferListResponse:
        items, total = await self._repo.list(
            asset_id=asset_id,
            status=transfer_status,
            requested_by=requested_by,
            to_employee_id=to_employee_id,
            page=page,
            page_size=page_size,
        )
        return TransferListResponse(
            items=[TransferResponse.model_validate(t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )
