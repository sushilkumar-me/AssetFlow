"""
Audit Management ORM models.

AuditCycle   — a named period during which a set of assets are physically verified.
AuditRecord  — one verification record per asset per cycle.
AuditAuditor — join table: which users are assigned as auditors for a cycle.
"""

from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    Date, DateTime, Enum, ForeignKey, Integer,
    String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


# ── Enumerations ──────────────────────────────────────────────────────────────

class AuditCycleStatus(str, enum.Enum):
    OPEN        = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED      = "CLOSED"


class AuditScopeType(str, enum.Enum):
    ALL        = "ALL"          # every active asset
    DEPARTMENT = "DEPARTMENT"   # assets assigned to a specific department
    LOCATION   = "LOCATION"     # assets at a specific location


class VerificationStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    MISSING  = "MISSING"
    DAMAGED  = "DAMAGED"


# ── AuditCycle ────────────────────────────────────────────────────────────────

class AuditCycle(PrimaryKeyMixin, TimestampMixin, Base):
    """
    An audit cycle groups a set of assets to be physically verified.

    Lifecycle:
      OPEN → IN_PROGRESS (first asset verification submitted)
      IN_PROGRESS → CLOSED (all assets verified, discrepancy report generated)

    Once CLOSED, no further modifications are allowed.
    """

    __tablename__ = "audit_cycles"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scope_type: Mapped[AuditScopeType] = mapped_column(
        Enum(AuditScopeType, name="auditscopetype", create_constraint=True),
        nullable=False,
        default=AuditScopeType.ALL,
        server_default=AuditScopeType.ALL.value,
    )
    department_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[AuditCycleStatus] = mapped_column(
        Enum(AuditCycleStatus, name="auditcyclestatus", create_constraint=True),
        nullable=False,
        default=AuditCycleStatus.OPEN,
        server_default=AuditCycleStatus.OPEN.value,
    )

    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    closed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditCycle id={self.id} name={self.name!r} status={self.status}>"


# ── AuditAuditor (join table) ─────────────────────────────────────────────────

class AuditAuditor(Base):
    """Maps which users are assigned as auditors for a given cycle."""

    __tablename__ = "audit_auditors"
    __table_args__ = (
        UniqueConstraint("audit_cycle_id", "user_id", name="uq_audit_auditors"),
    )

    audit_cycle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("audit_cycles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditAuditor cycle={self.audit_cycle_id} user={self.user_id}>"


# ── AuditRecord ───────────────────────────────────────────────────────────────

class AuditRecord(PrimaryKeyMixin, Base):
    """
    One physical verification of one asset within one audit cycle.
    Each (audit_cycle_id, asset_id) pair must be unique — no duplicate verifications.
    """

    __tablename__ = "audit_records"
    __table_args__ = (
        UniqueConstraint(
            "audit_cycle_id", "asset_id",
            name="uq_audit_records_cycle_asset",
        ),
    )

    audit_cycle_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("audit_cycles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    auditor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verificationstatus", create_constraint=True),
        nullable=False,
    )
    remarks: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # created_at only (no updated_at — records are immutable after creation)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<AuditRecord id={self.id} cycle={self.audit_cycle_id} "
            f"asset={self.asset_id} status={self.verification_status}>"
        )
