"""
NotificationRepository + ActivityLogRepository.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import ActivityLog, Notification, NotificationType


class NotificationRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        user_id: int,
        title: str,
        message: str,
        notif_type: NotificationType = NotificationType.GENERAL,
        entity_type: str | None = None,
        entity_id: int | None = None,
    ) -> Notification:
        n = Notification(
            user_id=user_id, title=title, message=message,
            type=notif_type, entity_type=entity_type, entity_id=entity_id,
        )
        self._db.add(n)
        await self._db.flush()
        await self._db.refresh(n)
        return n

    async def list_for_user(
        self, user_id: int, unread_only: bool = False, limit: int = 50
    ) -> tuple[list[Notification], int]:
        q = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            q = q.where(Notification.is_read.is_(False))
        total = (
            await self._db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        q = q.order_by(Notification.created_at.desc()).limit(limit)
        result = await self._db.execute(q)
        return list(result.scalars().all()), total

    async def unread_count(self, user_id: int) -> int:
        result = await self._db.execute(
            select(func.count()).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return result.scalar_one()

    async def get_by_id(self, notif_id: int) -> Notification | None:
        result = await self._db.execute(
            select(Notification).where(Notification.id == notif_id)
        )
        return result.scalar_one_or_none()

    async def mark_read(self, n: Notification) -> Notification:
        n.is_read = True
        await self._db.flush()
        await self._db.refresh(n)
        return n

    async def mark_all_read(self, user_id: int) -> int:
        from sqlalchemy import update
        result = await self._db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        await self._db.flush()
        return result.rowcount

    async def delete(self, n: Notification) -> None:
        await self._db.delete(n)
        await self._db.flush()


class ActivityLogRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        action: str,
        description: str,
        user_id: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        ip_address: str | None = None,
    ) -> ActivityLog:
        log = ActivityLog(
            user_id=user_id, action=action, description=description,
            entity_type=entity_type, entity_id=entity_id, ip_address=ip_address,
        )
        self._db.add(log)
        await self._db.flush()
        return log

    async def list(
        self,
        user_id: int | None = None,
        entity_type: str | None = None,
        action: str | None = None,
        page: int = 1,
        page_size: int = 30,
    ) -> tuple[list[ActivityLog], int]:
        q = select(ActivityLog)
        if user_id is not None:
            q = q.where(ActivityLog.user_id == user_id)
        if entity_type is not None:
            q = q.where(ActivityLog.entity_type == entity_type)
        if action is not None:
            q = q.where(ActivityLog.action.ilike(f"%{action}%"))
        total = (
            await self._db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        offset = (page - 1) * page_size
        q = q.order_by(ActivityLog.created_at.desc()).offset(offset).limit(page_size)
        result = await self._db.execute(q)
        return list(result.scalars().all()), total

    async def recent(self, limit: int = 20) -> list[ActivityLog]:
        result = await self._db.execute(
            select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
