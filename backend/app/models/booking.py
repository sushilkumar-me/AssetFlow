"""
ResourceBooking ORM model.
Handles time-slot reservations for shared assets (meeting rooms, projectors, vehicles…).
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


class BookingStatus(str, enum.Enum):
    UPCOMING   = "UPCOMING"
    ONGOING    = "ONGOING"
    COMPLETED  = "COMPLETED"
    CANCELLED  = "CANCELLED"


class ResourceBooking(PrimaryKeyMixin, TimestampMixin, Base):
    """
    A time-bounded reservation of a shared asset by an employee.

    Lifecycle (auto-driven by current time):
      UPCOMING → ONGOING  (start_datetime reached)
      ONGOING  → COMPLETED (end_datetime reached)
      Any      → CANCELLED (explicit user/admin action)

    Overlap rule: no two UPCOMING or ONGOING bookings for the same asset
    may have intersecting time windows.  Adjacent bookings (end == start) ARE allowed.
    """

    __tablename__ = "resource_bookings"

    # ── References ────────────────────────────────────────────────────────────
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
    department_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Booking window ────────────────────────────────────────────────────────
    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # ── Details ───────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="bookingstatus", create_constraint=True),
        nullable=False,
        default=BookingStatus.UPCOMING,
        server_default=BookingStatus.UPCOMING.value,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<ResourceBooking id={self.id} asset={self.asset_id} "
            f"status={self.status} {self.start_datetime}–{self.end_datetime}>"
        )
