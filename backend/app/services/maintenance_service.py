"""
MaintenanceService — all business rules for the maintenance workflow.

Rules enforced:
  1. Only the current asset holder, Asset Manager, or Admin may raise a request.
  2. Asset must not already have an active maintenance request (UNDER_MAINTENANCE guard).
  3. Approval sets asset status → UNDER_MAINTENANCE.
  4. Rejection does NOT change asset status.
  5. Technician assignment requires APPROVED status.
  6. Start-work requires TECHNICIAN_ASSIGNED.
  7. Resolution sets asset status → AVAILABLE and records resolved_at.
  8. History is append-only; records are never deleted.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetStatus
from app.models.maintenance import MaintenancePriority, MaintenanceRequest, MaintenanceStatus
from app.models.user import UserRole
from app.repositories.allocation_repository import AssetAllocationRepository
from app.repositories.asset_repository import AssetRepository
from app.repositories.maintenance_repository import MaintenanceRepository
from app.schemas.maintenance import (
    MaintenanceApproveRequest,
    MaintenanceAssignRequest,
    MaintenanceCreateRequest,
    MaintenanceListResponse,
    MaintenanceRejectRequest,
    MaintenanceResolveRequest,
    MaintenanceResponse,
)


class MaintenanceService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo        = MaintenanceRepository(db)
        self._asset_repo  = AssetRepository(db)
        self._alloc_repo  = AssetAllocationRepository(db)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, req_id: int) -> MaintenanceRequest:
        req = await self._repo.get_by_id(req_id)
        if req is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Maintenance request {req_id} not found.",
            )
        return req

    async def _get_asset_or_422(self, asset_id: int) -> Asset:
        asset = await self._asset_repo.find_by_id(asset_id)
        if asset is None or not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Asset not found or inactive.",
            )
        return asset

    def _require_status(
        self, req: MaintenanceRequest, expected: MaintenanceStatus
    ) -> None:
        if req.status != expected:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Action not allowed. Expected status {expected.value}, "
                    f"current status is {req.status.value}."
                ),
            )

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_request(
        self,
        payload: MaintenanceCreateRequest,
        requester_id: int,
        requester_role: UserRole,
    ) -> MaintenanceResponse:
        asset = await self._get_asset_or_422(payload.asset_id)

        # Rule 1: validate who can raise a request
        if requester_role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
            # Must be the current holder
            alloc = await self._alloc_repo.get_active_for_asset(payload.asset_id)
            if alloc is None or alloc.employee_id != requester_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Only the current asset holder, an Asset Manager, "
                        "or an Admin may raise a maintenance request."
                    ),
                )

        # Rule 2: no duplicate active request
        existing = await self._repo.get_active_for_asset(payload.asset_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Asset already has an active maintenance request "
                    f"(id={existing.id}, status={existing.status.value})."
                ),
            )

        req = await self._repo.create(
            asset_id          = payload.asset_id,
            raised_by         = requester_id,
            issue_title       = payload.issue_title,
            issue_description = payload.issue_description,
            priority          = payload.priority,
            attachment_url    = payload.attachment_url,
        )
        return MaintenanceResponse.model_validate(req)

    async def approve_request(
        self,
        req_id: int,
        payload: MaintenanceApproveRequest,
        approver_id: int,
    ) -> MaintenanceResponse:
        req = await self._get_or_404(req_id)
        self._require_status(req, MaintenanceStatus.PENDING)

        req = await self._repo.approve(req, approver_id, payload.approval_remarks)

        # Rule 3: asset → UNDER_MAINTENANCE
        asset = await self._asset_repo.find_by_id(req.asset_id)
        if asset:
            await self._asset_repo.update(asset, status=AssetStatus.UNDER_MAINTENANCE)

        return MaintenanceResponse.model_validate(req)

    async def reject_request(
        self,
        req_id: int,
        payload: MaintenanceRejectRequest,
        approver_id: int,
    ) -> MaintenanceResponse:
        req = await self._get_or_404(req_id)
        self._require_status(req, MaintenanceStatus.PENDING)

        # Rule 4: no asset status change on rejection
        req = await self._repo.reject(req, approver_id, payload.approval_remarks)
        return MaintenanceResponse.model_validate(req)

    async def assign_technician(
        self,
        req_id: int,
        payload: MaintenanceAssignRequest,
    ) -> MaintenanceResponse:
        req = await self._get_or_404(req_id)
        self._require_status(req, MaintenanceStatus.APPROVED)

        req = await self._repo.assign_technician(req, payload.technician_name)
        return MaintenanceResponse.model_validate(req)

    async def start_work(self, req_id: int) -> MaintenanceResponse:
        req = await self._get_or_404(req_id)
        self._require_status(req, MaintenanceStatus.TECHNICIAN_ASSIGNED)

        req = await self._repo.start_work(req)
        return MaintenanceResponse.model_validate(req)

    async def resolve_request(
        self,
        req_id: int,
        payload: MaintenanceResolveRequest,
    ) -> MaintenanceResponse:
        req = await self._get_or_404(req_id)

        if req.status not in (
            MaintenanceStatus.TECHNICIAN_ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot resolve from status {req.status.value}. "
                    "Request must be TECHNICIAN_ASSIGNED or IN_PROGRESS."
                ),
            )

        req = await self._repo.resolve(req, payload.resolution_notes)

        # Rule 7: asset → AVAILABLE
        asset = await self._asset_repo.find_by_id(req.asset_id)
        if asset:
            await self._asset_repo.update(asset, status=AssetStatus.AVAILABLE)

        return MaintenanceResponse.model_validate(req)

    async def get_request(self, req_id: int) -> MaintenanceResponse:
        return MaintenanceResponse.model_validate(await self._get_or_404(req_id))

    async def list_requests(
        self,
        search: str | None = None,
        raised_by: int | None = None,
        asset_id: int | None = None,
        priority: MaintenancePriority | None = None,
        req_status: MaintenanceStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> MaintenanceListResponse:
        items, total = await self._repo.list(
            search=search,
            raised_by=raised_by,
            asset_id=asset_id,
            priority=priority,
            status=req_status,
            page=page,
            page_size=page_size,
        )
        return MaintenanceListResponse(
            items=[MaintenanceResponse.model_validate(r) for r in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_asset_history(self, asset_id: int) -> list[MaintenanceResponse]:
        items = await self._repo.history_for_asset(asset_id)
        return [MaintenanceResponse.model_validate(r) for r in items]
