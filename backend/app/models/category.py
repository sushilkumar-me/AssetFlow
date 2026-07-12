"""
AssetCategory ORM model.
Stores category metadata plus an optional JSONB custom_fields bag.
"""

from typing import Any

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


class AssetCategory(PrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "asset_categories"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flexible JSON metadata — e.g. {"warranty_months": 24, "trackable": true}
    custom_fields: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, default=None
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AssetCategory id={self.id} name={self.name!r}>"
