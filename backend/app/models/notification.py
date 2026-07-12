"""
Notification and ActivityLog ORM models.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin


# ── Enumerations ──────────────────────────────────────────────────────────────

class NotificationType(str, enum.Enum):
    ASSET_ASSIGNED        = "ASSET_ASSIGNED"
    BOOKING_CONFIRMED     = "BOOKING_CONFIRMED"
    BOOKING_REMINDER      = "BOOKING_REMINDER"
    TRANSFER_APPROVED     = "TRANSFER_APPROVED"
    TRANSFER_REJECTED     = "TRANSFER_REJECTED"
    MAINTENANCE_APPROVED  = "MAINTENANCE_APPROVED"
    MAINTENANCE_REJECTED  = "MAINTENANCE_REJECTED"
    MAINTENANCE_RESOLVED  = "MAINTENANCE_RESOLVED"
    AUDIT_DISCREPANCY     = "AUDIT_DISCREPANCY"
    OVERDUE_RETURN        = "OVERDUE_RETURN"
    GENERAL               = "GENERAL"


# ── Notification ──────────────────────────────────────────────────────────────

class Notification(PrimaryKeyMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notificationtype", create_constraint=True),
        nullable=False, default=NotificationType.GENERAL,
        server_default=NotificationType.GENERAL.value,
    )
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Notification id={self.id} user={self.user_id} type={self.type}>"


# ── ActivityLog ───────────────────────────────────────────────────────────────

class ActivityLog(PrimaryKeyMixin, Base):
    __tablename__ = "activity_logs"

    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max = 45 chars
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ActivityLog id={self.id} user={self.user_id} action={self.action!r}>"
