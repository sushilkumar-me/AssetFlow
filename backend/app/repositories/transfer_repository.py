"""
TransferRepository — all DB access for TransferRequest.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import TransferRequest, TransferStatus


class TransferRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, transfer_id: int) -> TransferRequest | None:
        result = await self._db.execute(
            select(TransferRequest).where(TransferRequest.id == transfer_id)
        )
        return result.scalar_one_or_none()

    async def get_pending_for_asset(self, asset_id: int) -> TransferRequest | None:
        result = await self._db.execute(
            select(TransferRequest).where(
                TransferRequest.asset_id == asset_id,
                TransferRequest.status == TransferStatus.PENDING,
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        asset_id: int | None = None,
        status: TransferStatus | None = None,
        requested_by: int | None = None,
        to_employee_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TransferRequest], int]:
        query = select(TransferRequest)
        if asset_id is not None:
            query = query.where(TransferRequest.asset_id == asset_id)
        if status is not None:
            query = query.where(TransferRequest.status == status)
        if requested_by is not None:
            query = query.where(TransferRequest.requested_by == requested_by)
        if to_employee_id is not None:
            query = query.where(TransferRequest.to_employee_id == to_employee_id)

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(TransferRequest.requested_at.desc()).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def create(
        self,
        asset_id: int,
        from_employee_id: int,
        to_employee_id: int,
        requested_by: int,
        remarks: str | None,
    ) -> TransferRequest:
        tr = TransferRequest(
            asset_id=asset_id,
            from_employee_id=from_employee_id,
            to_employee_id=to_employee_id,
            requested_by=requested_by,
            remarks=remarks,
            status=TransferStatus.PENDING,
        )
        self._db.add(tr)
        await self._db.flush()
        await self._db.refresh(tr)
        return tr

    async def approve(
        self,
        tr: TransferRequest,
        approved_by: int,
        remarks: str | None,
    ) -> TransferRequest:
        from datetime import datetime, timezone
        tr.status = TransferStatus.APPROVED
        tr.approved_by = approved_by
        tr.approved_at = datetime.now(tz=timezone.utc)
        if remarks is not None:
            tr.remarks = remarks
        await self._db.flush()
        await self._db.refresh(tr)
        return tr

    async def reject(
        self,
        tr: TransferRequest,
        approved_by: int,
        remarks: str | None,
    ) -> TransferRequest:
        from datetime import datetime, timezone
        tr.status = TransferStatus.REJECTED
        tr.approved_by = approved_by
        tr.approved_at = datetime.now(tz=timezone.utc)
        if remarks is not None:
            tr.remarks = remarks
        await self._db.flush()
        await self._db.refresh(tr)
        return tr
