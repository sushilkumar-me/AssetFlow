"""
AssetAllocation and TransferRequest ORM models.
"""

from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


# ── Enumerations ──────────────────────────────────────────────────────────────

class AllocationStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    RETURNED = "RETURNED"
    OVERDUE  = "OVERDUE"


class TransferStatus(str, enum.Enum):
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ── AssetAllocation ───────────────────────────────────────────────────────────

class AssetAllocation(PrimaryKeyMixin, TimestampMixin, Base):
    """
    Records that an asset has been allocated to an employee.

    Lifecycle:
      ACTIVE  → RETURNED  (employee returns the asset)
      ACTIVE  → OVERDUE   (expected_return_date has passed without return)
      OVERDUE → RETURNED  (late return)
    """

    __tablename__ = "asset_allocations"

    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    allocated_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Dates ─────────────────────────────────────────────────────────────────
    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── State ─────────────────────────────────────────────────────────────────
    status: Mapped[AllocationStatus] = mapped_column(
        Enum(AllocationStatus, name="allocationstatus", create_constraint=True),
        nullable=False,
        default=AllocationStatus.ACTIVE,
        server_default=AllocationStatus.ACTIVE.value,
    )
    condition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<AssetAllocation id={self.id} asset={self.asset_id} "
            f"employee={self.employee_id} status={self.status}>"
        )


# ── TransferRequest ───────────────────────────────────────────────────────────

class TransferRequest(PrimaryKeyMixin, TimestampMixin, Base):
    """
    A request to transfer an asset from one employee to another.

    Lifecycle:
      PENDING → APPROVED  (admin / asset-manager approves → closes old allocation, opens new one)
      PENDING → REJECTED  (admin / asset-manager rejects)
    """

    __tablename__ = "transfer_requests"

    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    from_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    to_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    requested_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approved_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[TransferStatus] = mapped_column(
        Enum(TransferStatus, name="transferstatus", create_constraint=True),
        nullable=False,
        default=TransferStatus.PENDING,
        server_default=TransferStatus.PENDING.value,
    )

    remarks: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<TransferRequest id={self.id} asset={self.asset_id} "
            f"status={self.status}>"
        )
