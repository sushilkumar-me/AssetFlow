"""
Department ORM model.
Supports self-referential parent/child hierarchy and an optional department head.
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


class Department(PrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Self-referential parent — nullable, no cascade delete
    parent_department_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )

    # FK to users — set null when the head user is deleted
    department_head_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    parent: Mapped["Department | None"] = relationship(
        "Department",
        remote_side="Department.id",
        back_populates="children",
        lazy="selectin",
    )
    children: Mapped[list["Department"]] = relationship(
        "Department",
        back_populates="parent",
        lazy="selectin",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Department id={self.id} name={self.name!r}>"
