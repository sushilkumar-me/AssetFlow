"""
Asset ORM model.
Tracks every physical or digital asset in the organisation.
"""

from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, Enum, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


# ── Enumerations ──────────────────────────────────────────────────────────────

class AssetStatus(str, enum.Enum):
    AVAILABLE         = "AVAILABLE"
    ALLOCATED         = "ALLOCATED"
    RESERVED          = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST              = "LOST"
    RETIRED           = "RETIRED"
    DISPOSED          = "DISPOSED"


class AssetCondition(str, enum.Enum):
    NEW          = "NEW"
    GOOD         = "GOOD"
    FAIR         = "FAIR"
    POOR         = "POOR"
    NEEDS_REPAIR = "NEEDS_REPAIR"


# ── Model ─────────────────────────────────────────────────────────────────────

class Asset(PrimaryKeyMixin, TimestampMixin, Base):
    """
    Persisted asset record.

    - asset_tag is auto-generated (AF-000001 format) and immutable after creation.
    - serial_number is optional but unique when provided.
    - Soft-delete via is_active=False; records are never physically removed.
    """

    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("asset_tag", name="uq_assets_asset_tag"),
        UniqueConstraint("serial_number", name="uq_assets_serial_number"),
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    asset_tag: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    serial_number: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )

    # ── Classification ────────────────────────────────────────────────────────
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("asset_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── State ─────────────────────────────────────────────────────────────────
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="assetstatus", create_constraint=True),
        nullable=False,
        default=AssetStatus.AVAILABLE,
        server_default=AssetStatus.AVAILABLE.value,
    )
    condition: Mapped[AssetCondition] = mapped_column(
        Enum(AssetCondition, name="assetcondition", create_constraint=True),
        nullable=False,
        default=AssetCondition.NEW,
        server_default=AssetCondition.NEW.value,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    is_shared: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # ── Location & acquisition ────────────────────────────────────────────────
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    acquisition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    acquisition_cost: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=12, scale=2), nullable=True
    )

    # ── Metadata ──────────────────────────────────────────────────────────────
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Asset id={self.id} tag={self.asset_tag!r} name={self.name!r}>"
