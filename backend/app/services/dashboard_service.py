"""
NotificationService, ActivityLogService, and DashboardService.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import AllocationStatus, AssetAllocation
from app.models.asset import AssetStatus, Asset
from app.models.audit import AuditCycle, AuditCycleStatus
from app.models.booking import BookingStatus, ResourceBooking
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus
from app.models.notification import ActivityLog, Notification, NotificationType
from app.models.allocation import TransferRequest, TransferStatus
from app.models.user import User
from app.repositories.notification_repository import ActivityLogRepository, NotificationRepository
from app.schemas.dashboard import (
    ActivityLogListResponse,
    ActivityLogResponse,
    DashboardResponse,
    KPIResponse,
    NotificationListResponse,
    NotificationResponse,
    RecentActivityItem,
)


# ═══════════════════════════════════════════════════════════════════════════════
# NotificationService
# ═══════════════════════════════════════════════════════════════════════════════

class NotificationService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = NotificationRepository(db)

    async def create(
        self,
        user_id: int,
        title: str,
        message: str,
        notif_type: NotificationType = NotificationType.GENERAL,
        entity_type: str | None = None,
        entity_id: int | None = None,
    ) -> NotificationResponse:
        n = await self._repo.create(user_id, title, message, notif_type, entity_type, entity_id)
        return NotificationResponse.model_validate(n)

    async def list_for_user(self, user_id: int) -> NotificationListResponse:
        items, total = await self._repo.list_for_user(user_id, limit=50)
        unread = await self._repo.unread_count(user_id)
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(n) for n in items],
            total=total,
            unread_count=unread,
        )

    async def mark_read(self, notif_id: int, user_id: int) -> NotificationResponse:
        n = await self._repo.get_by_id(notif_id)
        if n is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        if n.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notification.")
        n = await self._repo.mark_read(n)
        return NotificationResponse.model_validate(n)

    async def mark_all_read(self, user_id: int) -> dict:
        count = await self._repo.mark_all_read(user_id)
        return {"updated": count}

    async def delete(self, notif_id: int, user_id: int) -> None:
        n = await self._repo.get_by_id(notif_id)
        if n is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        if n.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notification.")
        await self._repo.delete(n)


# ═══════════════════════════════════════════════════════════════════════════════
# ActivityLogService
# ═══════════════════════════════════════════════════════════════════════════════

class ActivityLogService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = ActivityLogRepository(db)

    async def record(
        self,
        action: str,
        description: str,
        user_id: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        ip_address: str | None = None,
    ) -> None:
        await self._repo.create(action, description, user_id, entity_type, entity_id, ip_address)

    async def list_logs(
        self,
        user_id: int | None = None,
        entity_type: str | None = None,
        action: str | None = None,
        page: int = 1,
        page_size: int = 30,
    ) -> ActivityLogListResponse:
        items, total = await self._repo.list(user_id, entity_type, action, page, page_size)
        return ActivityLogListResponse(
            items=[ActivityLogResponse.model_validate(l) for l in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def recent(self, limit: int = 20) -> list[ActivityLog]:
        return await self._repo.recent(limit)


# ═══════════════════════════════════════════════════════════════════════════════
# DashboardService
# ═══════════════════════════════════════════════════════════════════════════════

class DashboardService:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._log_repo = ActivityLogRepository(db)
        self._notif_repo = NotificationRepository(db)

    async def _scalar(self, stmt) -> int:
        result = await self._db.execute(stmt)
        return result.scalar_one()

    async def get_kpis(self) -> KPIResponse:
        now = datetime.now(tz=timezone.utc)
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        next_7_days = now + timedelta(days=7)

        available         = await self._scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.AVAILABLE, Asset.is_active.is_(True)))
        allocated         = await self._scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.ALLOCATED, Asset.is_active.is_(True)))
        under_maintenance = await self._scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.UNDER_MAINTENANCE, Asset.is_active.is_(True)))
        lost              = await self._scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.LOST, Asset.is_active.is_(True)))
        retired           = await self._scalar(select(func.count(Asset.id)).where(Asset.status == AssetStatus.RETIRED, Asset.is_active.is_(True)))
        todays_bookings   = await self._scalar(select(func.count(ResourceBooking.id)).where(
            ResourceBooking.status.in_([BookingStatus.UPCOMING, BookingStatus.ONGOING]),
            ResourceBooking.start_datetime >= today_start,
        ))
        pending_transfers = await self._scalar(select(func.count(TransferRequest.id)).where(TransferRequest.status == TransferStatus.PENDING))
        pending_maint     = await self._scalar(select(func.count(MaintenanceRequest.id)).where(
            MaintenanceRequest.status == MaintenanceStatus.PENDING
        ))
        upcoming_returns  = await self._scalar(select(func.count(AssetAllocation.id)).where(
            AssetAllocation.status == AllocationStatus.ACTIVE,
            AssetAllocation.expected_return_date <= next_7_days.date(),
            AssetAllocation.expected_return_date >= date.today(),
        ))
        overdue           = await self._scalar(select(func.count(AssetAllocation.id)).where(
            AssetAllocation.status == AllocationStatus.OVERDUE
        ))
        open_audits       = await self._scalar(select(func.count(AuditCycle.id)).where(
            AuditCycle.status.in_([AuditCycleStatus.OPEN, AuditCycleStatus.IN_PROGRESS])
        ))
        employees         = await self._scalar(select(func.count(User.id)).where(User.is_active.is_(True)))

        return KPIResponse(
            available_assets=available,
            allocated_assets=allocated,
            under_maintenance=under_maintenance,
            lost_assets=lost,
            retired_assets=retired,
            todays_bookings=todays_bookings,
            pending_transfers=pending_transfers,
            pending_maintenance=pending_maint,
            upcoming_returns=upcoming_returns,
            overdue_returns=overdue,
            open_audit_cycles=open_audits,
            total_employees=employees,
        )

    async def get_recent_activity(self, limit: int = 20) -> list[RecentActivityItem]:
        logs = await self._log_repo.recent(limit)
        # Bulk-fetch user names
        user_ids = list({l.user_id for l in logs if l.user_id})
        user_map: dict[int, str] = {}
        if user_ids:
            result = await self._db.execute(
                select(User.id, User.full_name).where(User.id.in_(user_ids))
            )
            user_map = {row.id: row.full_name for row in result}
        return [
            RecentActivityItem(
                id=l.id,
                user_id=l.user_id,
                user_name=user_map.get(l.user_id, "System") if l.user_id else "System",
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                description=l.description,
                created_at=l.created_at,
            )
            for l in logs
        ]

    async def get_dashboard(self, user_id: int) -> DashboardResponse:
        kpis    = await self.get_kpis()
        recent  = await self.get_recent_activity(10)
        unread  = await self._notif_repo.unread_count(user_id)
        return DashboardResponse(kpis=kpis, recent_activity=recent, unread_notifications=unread)
