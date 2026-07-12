"""
MaintenanceRequest ORM model.
Tracks the full lifecycle of an asset repair/service request.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


# ── Enumerations ──────────────────────────────────────────────────────────────

class MaintenancePriority(str, enum.Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class MaintenanceStatus(str, enum.Enum):
    PENDING             = "PENDING"
    APPROVED            = "APPROVED"
    REJECTED            = "REJECTED"
    TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED"
    IN_PROGRESS         = "IN_PROGRESS"
    RESOLVED            = "RESOLVED"


# ── Model ─────────────────────────────────────────────────────────────────────

class MaintenanceRequest(PrimaryKeyMixin, TimestampMixin, Base):
    """
    A maintenance request lifecycle:

      PENDING
        ↓ approve (asset → UNDER_MAINTENANCE)
      APPROVED
        ↓ assign technician
      TECHNICIAN_ASSIGNED
        ↓ start work
      IN_PROGRESS
        ↓ resolve (asset → AVAILABLE)
      RESOLVED

      PENDING / APPROVED → REJECTED (asset status unchanged)

    Previous requests are NEVER overwritten — a complete history is preserved.
    """

    __tablename__ = "maintenance_requests"

    # ── References ────────────────────────────────────────────────────────────
    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    raised_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    approved_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Issue details ─────────────────────────────────────────────────────────
    issue_title: Mapped[str] = mapped_column(String(255), nullable=False)
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[MaintenancePriority] = mapped_column(
        Enum(MaintenancePriority, name="maintenancepriority", create_constraint=True),
        nullable=False,
        default=MaintenancePriority.MEDIUM,
        server_default=MaintenancePriority.MEDIUM.value,
    )
    attachment_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # ── Workflow ──────────────────────────────────────────────────────────────
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus, name="maintenancestatus", create_constraint=True),
        nullable=False,
        default=MaintenanceStatus.PENDING,
        server_default=MaintenanceStatus.PENDING.value,
    )
    technician_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approval_remarks: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<MaintenanceRequest id={self.id} asset={self.asset_id} "
            f"status={self.status} priority={self.priority}>"
        )
