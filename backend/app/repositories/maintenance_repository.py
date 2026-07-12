"""
MaintenanceRepository — all DB access for MaintenanceRequest.
No business logic lives here.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maintenance import MaintenancePriority, MaintenanceRequest, MaintenanceStatus


class MaintenanceRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, req_id: int) -> MaintenanceRequest | None:
        result = await self._db.execute(
            select(MaintenanceRequest).where(MaintenanceRequest.id == req_id)
        )
        return result.scalar_one_or_none()

    async def get_active_for_asset(self, asset_id: int) -> MaintenanceRequest | None:
        """Return an open (non-terminal) request for an asset if one exists."""
        active = [
            MaintenanceStatus.PENDING,
            MaintenanceStatus.APPROVED,
            MaintenanceStatus.TECHNICIAN_ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
        ]
        result = await self._db.execute(
            select(MaintenanceRequest).where(
                MaintenanceRequest.asset_id == asset_id,
                MaintenanceRequest.status.in_(active),
            )
        )
        return result.scalars().first()

    async def list(
        self,
        search: str | None = None,
        raised_by: int | None = None,
        asset_id: int | None = None,
        priority: MaintenancePriority | None = None,
        status: MaintenanceStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[MaintenanceRequest], int]:
        query = select(MaintenanceRequest)

        if raised_by is not None:
            query = query.where(MaintenanceRequest.raised_by == raised_by)
        if asset_id is not None:
            query = query.where(MaintenanceRequest.asset_id == asset_id)
        if priority is not None:
            query = query.where(MaintenanceRequest.priority == priority)
        if status is not None:
            query = query.where(MaintenanceRequest.status == status)
        if search:
            query = query.where(
                or_(
                    MaintenanceRequest.issue_title.ilike(f"%{search}%"),
                    MaintenanceRequest.technician_name.ilike(f"%{search}%"),
                )
            )

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(
            MaintenanceRequest.created_at.desc()
        ).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def history_for_asset(self, asset_id: int) -> list[MaintenanceRequest]:
        """Return all maintenance requests for an asset, newest first."""
        result = await self._db.execute(
            select(MaintenanceRequest)
            .where(MaintenanceRequest.asset_id == asset_id)
            .order_by(MaintenanceRequest.created_at.desc())
        )
        return list(result.scalars().all())

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        asset_id: int,
        raised_by: int,
        issue_title: str,
        issue_description: str,
        priority: MaintenancePriority,
        attachment_url: str | None,
    ) -> MaintenanceRequest:
        req = MaintenanceRequest(
            asset_id=asset_id,
            raised_by=raised_by,
            issue_title=issue_title,
            issue_description=issue_description,
            priority=priority,
            attachment_url=attachment_url,
            status=MaintenanceStatus.PENDING,
        )
        self._db.add(req)
        await self._db.flush()
        await self._db.refresh(req)
        return req

    async def approve(
        self,
        req: MaintenanceRequest,
        approved_by: int,
        approval_remarks: str | None,
    ) -> MaintenanceRequest:
        req.status = MaintenanceStatus.APPROVED
        req.approved_by = approved_by
        req.approval_remarks = approval_remarks
        req.approved_at = datetime.now(tz=timezone.utc)
        await self._db.flush()
        await self._db.refresh(req)
        return req

    async def reject(
        self,
        req: MaintenanceRequest,
        approved_by: int,
        approval_remarks: str,
    ) -> MaintenanceRequest:
        req.status = MaintenanceStatus.REJECTED
        req.approved_by = approved_by
        req.approval_remarks = approval_remarks
        req.approved_at = datetime.now(tz=timezone.utc)
        await self._db.flush()
        await self._db.refresh(req)
        return req

    async def assign_technician(
        self, req: MaintenanceRequest, technician_name: str
    ) -> MaintenanceRequest:
        req.status = MaintenanceStatus.TECHNICIAN_ASSIGNED
        req.technician_name = technician_name
        await self._db.flush()
        await self._db.refresh(req)
        return req

    async def start_work(self, req: MaintenanceRequest) -> MaintenanceRequest:
        req.status = MaintenanceStatus.IN_PROGRESS
        await self._db.flush()
        await self._db.refresh(req)
        return req

    async def resolve(
        self, req: MaintenanceRequest, resolution_notes: str
    ) -> MaintenanceRequest:
        req.status = MaintenanceStatus.RESOLVED
        req.resolution_notes = resolution_notes
        req.resolved_at = datetime.now(tz=timezone.utc)
        await self._db.flush()
        await self._db.refresh(req)
        return req
