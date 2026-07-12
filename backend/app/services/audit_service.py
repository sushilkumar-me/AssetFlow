"""
AuditService — all business rules for the asset audit workflow.

Rules enforced:
  1. Only ADMIN can create audit cycles.
  2. Only ADMIN can assign auditors and close cycles.
  3. Closed cycles cannot be modified.
  4. Only assigned auditors (or ADMIN) can submit verifications.
  5. Each (cycle, asset) pair can only be verified once.
  6. Assets must be within the cycle's scope to be verified.
  7. On close: MISSING assets → status LOST; discrepancy report generated.
  8. Audit history is never deleted.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetStatus
from app.models.audit import AuditCycle, AuditCycleStatus, AuditScopeType, VerificationStatus
from app.repositories.asset_repository import AssetRepository
from app.repositories.audit_repository import AuditCycleRepository, AuditRecordRepository
from app.schemas.audit import (
    AssignAuditorsRequest,
    AuditCycleCreateRequest,
    AuditCycleListResponse,
    AuditCycleResponse,
    AuditRecordResponse,
    DiscrepancyItem,
    DiscrepancyReport,
    VerifyAssetRequest,
)


class AuditService:

    def __init__(self, db: AsyncSession) -> None:
        self._cycle_repo  = AuditCycleRepository(db)
        self._record_repo = AuditRecordRepository(db)
        self._asset_repo  = AssetRepository(db)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_cycle_or_404(self, cycle_id: int) -> AuditCycle:
        cycle = await self._cycle_repo.get_by_id(cycle_id)
        if cycle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Audit cycle {cycle_id} not found.",
            )
        return cycle

    def _require_open(self, cycle: AuditCycle) -> None:
        if cycle.status == AuditCycleStatus.CLOSED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This audit cycle is CLOSED and cannot be modified.",
            )

    async def _assets_in_scope(self, cycle: AuditCycle) -> list[Asset]:
        """Return all active assets that fall within this cycle's scope."""
        items, _ = await self._asset_repo.find_all(
            active_only=True, page=1, page_size=10_000
        )
        if cycle.scope_type == AuditScopeType.DEPARTMENT and cycle.department_id:
            items = [a for a in items if a.department_id == cycle.department_id]
        elif cycle.scope_type == AuditScopeType.LOCATION and cycle.location:
            loc = cycle.location.lower()
            items = [a for a in items if a.location and loc in a.location.lower()]
        return items

    async def _build_response(self, cycle: AuditCycle) -> AuditCycleResponse:
        auditor_ids = await self._cycle_repo.get_auditor_ids(cycle.id)
        r = AuditCycleResponse.model_validate(cycle)
        r.auditor_ids = auditor_ids
        return r

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_cycle(
        self, payload: AuditCycleCreateRequest, created_by: int
    ) -> AuditCycleResponse:
        cycle = await self._cycle_repo.create(
            name=payload.name,
            scope_type=payload.scope_type,
            department_id=payload.department_id,
            location=payload.location,
            start_date=payload.start_date,
            end_date=payload.end_date,
            created_by=created_by,
        )
        return await self._build_response(cycle)

    async def get_cycle(self, cycle_id: int) -> AuditCycleResponse:
        return await self._build_response(await self._get_cycle_or_404(cycle_id))

    async def list_cycles(
        self,
        search: str | None = None,
        cycle_status: AuditCycleStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AuditCycleListResponse:
        items, total = await self._cycle_repo.list(search, cycle_status, page, page_size)
        responses = []
        for c in items:
            responses.append(await self._build_response(c))
        return AuditCycleListResponse(
            items=responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def assign_auditors(
        self, cycle_id: int, payload: AssignAuditorsRequest
    ) -> AuditCycleResponse:
        cycle = await self._get_cycle_or_404(cycle_id)
        self._require_open(cycle)
        await self._cycle_repo.set_auditors(cycle_id, payload.auditor_ids)
        return await self._build_response(cycle)

    async def verify_asset(
        self,
        cycle_id: int,
        payload: VerifyAssetRequest,
        auditor_id: int,
        is_admin: bool,
    ) -> AuditRecordResponse:
        cycle = await self._get_cycle_or_404(cycle_id)
        self._require_open(cycle)

        # Rule 4: only assigned auditors or admin
        if not is_admin:
            if not await self._cycle_repo.is_auditor(cycle_id, auditor_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned as an auditor for this cycle.",
                )

        # Check asset exists and is in scope
        asset = await self._asset_repo.find_by_id(payload.asset_id)
        if asset is None or not asset.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Asset not found or inactive.",
            )

        scope_assets = await self._assets_in_scope(cycle)
        if payload.asset_id not in {a.id for a in scope_assets}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Asset is not within the scope of this audit cycle.",
            )

        # Rule 5: no duplicate verification
        existing = await self._record_repo.get_by_cycle_and_asset(cycle_id, payload.asset_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Asset {payload.asset_id} has already been verified in this cycle.",
            )

        record = await self._record_repo.create(
            cycle_id=cycle_id,
            asset_id=payload.asset_id,
            auditor_id=auditor_id,
            verification_status=payload.verification_status,
            remarks=payload.remarks,
        )

        # Transition cycle to IN_PROGRESS on first verification
        if cycle.status == AuditCycleStatus.OPEN:
            await self._cycle_repo.set_status(cycle, AuditCycleStatus.IN_PROGRESS)

        return AuditRecordResponse.model_validate(record)

    async def get_records(self, cycle_id: int) -> list[AuditRecordResponse]:
        await self._get_cycle_or_404(cycle_id)
        records = await self._record_repo.list_for_cycle(cycle_id)
        return [AuditRecordResponse.model_validate(r) for r in records]

    async def get_discrepancies(self, cycle_id: int) -> DiscrepancyReport:
        cycle = await self._get_cycle_or_404(cycle_id)
        all_records = await self._record_repo.list_for_cycle(cycle_id)
        discrepant  = await self._record_repo.discrepancies_for_cycle(cycle_id)
        scope_count = len(await self._assets_in_scope(cycle))

        items: list[DiscrepancyItem] = []
        for rec in discrepant:
            asset = await self._asset_repo.find_by_id(rec.asset_id)
            items.append(DiscrepancyItem(
                asset_id=rec.asset_id,
                asset_tag=asset.asset_tag if asset else f"#{rec.asset_id}",
                asset_name=asset.name if asset else f"Asset #{rec.asset_id}",
                verification_status=rec.verification_status,
                remarks=rec.remarks,
                auditor_id=rec.auditor_id,
                verified_at=rec.verified_at,
            ))

        verified = sum(1 for r in all_records if r.verification_status == VerificationStatus.VERIFIED)
        missing  = sum(1 for r in all_records if r.verification_status == VerificationStatus.MISSING)
        damaged  = sum(1 for r in all_records if r.verification_status == VerificationStatus.DAMAGED)

        return DiscrepancyReport(
            audit_cycle_id=cycle_id,
            audit_name=cycle.name,
            total_assets=scope_count,
            verified_count=verified,
            missing_count=missing,
            damaged_count=damaged,
            discrepancies=items,
        )

    async def close_cycle(self, cycle_id: int, closed_by: int) -> AuditCycleResponse:
        cycle = await self._get_cycle_or_404(cycle_id)
        self._require_open(cycle)

        # Verify all in-scope assets have been checked
        scope_assets = await self._assets_in_scope(cycle)
        verified_count = await self._record_repo.count_for_cycle(cycle_id)
        if verified_count < len(scope_assets):
            unverified = len(scope_assets) - verified_count
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot close: {unverified} asset(s) in scope have not been verified. "
                    "All assets must be verified before closing."
                ),
            )

        # Rule 7: MISSING assets → LOST
        discrepant = await self._record_repo.discrepancies_for_cycle(cycle_id)
        for rec in discrepant:
            if rec.verification_status == VerificationStatus.MISSING:
                asset = await self._asset_repo.find_by_id(rec.asset_id)
                if asset:
                    await self._asset_repo.update(asset, status=AssetStatus.LOST)

        cycle = await self._cycle_repo.close(cycle, closed_by)
        return await self._build_response(cycle)
