"""
AuditCycleRepository and AuditRecordRepository.
All DB access for audit tables lives here — no business logic.
"""

from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import (
    AuditAuditor,
    AuditCycle,
    AuditCycleStatus,
    AuditRecord,
    AuditScopeType,
    VerificationStatus,
)


# ═══════════════════════════════════════════════════════════════════════════════
# AuditCycleRepository
# ═══════════════════════════════════════════════════════════════════════════════

class AuditCycleRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, cycle_id: int) -> AuditCycle | None:
        result = await self._db.execute(
            select(AuditCycle).where(AuditCycle.id == cycle_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        search: str | None = None,
        status: AuditCycleStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditCycle], int]:
        query = select(AuditCycle)
        if search:
            query = query.where(AuditCycle.name.ilike(f"%{search}%"))
        if status is not None:
            query = query.where(AuditCycle.status == status)

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(AuditCycle.created_at.desc()).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def create(
        self,
        name: str,
        scope_type: AuditScopeType,
        department_id: int | None,
        location: str | None,
        start_date,
        end_date,
        created_by: int,
    ) -> AuditCycle:
        from datetime import date as _date
        cycle = AuditCycle(
            name=name,
            scope_type=scope_type,
            department_id=department_id,
            location=location,
            start_date=start_date,
            end_date=end_date,
            created_by=created_by,
            status=AuditCycleStatus.OPEN,
        )
        self._db.add(cycle)
        await self._db.flush()
        await self._db.refresh(cycle)
        return cycle

    async def set_status(self, cycle: AuditCycle, status: AuditCycleStatus) -> AuditCycle:
        cycle.status = status
        await self._db.flush()
        await self._db.refresh(cycle)
        return cycle

    async def close(self, cycle: AuditCycle, closed_by: int) -> AuditCycle:
        from datetime import datetime, timezone
        cycle.status = AuditCycleStatus.CLOSED
        cycle.closed_by = closed_by
        cycle.closed_at = datetime.now(tz=timezone.utc)
        await self._db.flush()
        await self._db.refresh(cycle)
        return cycle

    # ── Auditor management ────────────────────────────────────────────────────

    async def get_auditor_ids(self, cycle_id: int) -> list[int]:
        result = await self._db.execute(
            select(AuditAuditor.user_id).where(AuditAuditor.audit_cycle_id == cycle_id)
        )
        return list(result.scalars().all())

    async def set_auditors(self, cycle_id: int, user_ids: list[int]) -> None:
        """Replace the auditor list atomically."""
        await self._db.execute(
            delete(AuditAuditor).where(AuditAuditor.audit_cycle_id == cycle_id)
        )
        for uid in user_ids:
            self._db.add(AuditAuditor(audit_cycle_id=cycle_id, user_id=uid))
        await self._db.flush()

    async def is_auditor(self, cycle_id: int, user_id: int) -> bool:
        result = await self._db.execute(
            select(AuditAuditor).where(
                AuditAuditor.audit_cycle_id == cycle_id,
                AuditAuditor.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════════════════════════════════
# AuditRecordRepository
# ═══════════════════════════════════════════════════════════════════════════════

class AuditRecordRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_cycle_and_asset(
        self, cycle_id: int, asset_id: int
    ) -> AuditRecord | None:
        result = await self._db.execute(
            select(AuditRecord).where(
                AuditRecord.audit_cycle_id == cycle_id,
                AuditRecord.asset_id == asset_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_cycle(self, cycle_id: int) -> list[AuditRecord]:
        result = await self._db.execute(
            select(AuditRecord)
            .where(AuditRecord.audit_cycle_id == cycle_id)
            .order_by(AuditRecord.verified_at.desc())
        )
        return list(result.scalars().all())

    async def count_for_cycle(self, cycle_id: int) -> int:
        result = await self._db.execute(
            select(func.count()).where(AuditRecord.audit_cycle_id == cycle_id)
        )
        return result.scalar_one()

    async def discrepancies_for_cycle(self, cycle_id: int) -> list[AuditRecord]:
        result = await self._db.execute(
            select(AuditRecord).where(
                AuditRecord.audit_cycle_id == cycle_id,
                AuditRecord.verification_status.in_(
                    [VerificationStatus.MISSING, VerificationStatus.DAMAGED]
                ),
            )
        )
        return list(result.scalars().all())

    async def create(
        self,
        cycle_id: int,
        asset_id: int,
        auditor_id: int,
        verification_status: VerificationStatus,
        remarks: str | None,
    ) -> AuditRecord:
        record = AuditRecord(
            audit_cycle_id=cycle_id,
            asset_id=asset_id,
            auditor_id=auditor_id,
            verification_status=verification_status,
            remarks=remarks,
        )
        self._db.add(record)
        await self._db.flush()
        await self._db.refresh(record)
        return record
