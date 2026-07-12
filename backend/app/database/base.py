"""
Declarative base for all SQLAlchemy ORM models.
Import Base here to register models with Alembic's metadata.
"""

from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column
from sqlalchemy import DateTime, Integer, func
from datetime import datetime


class Base(DeclarativeBase):
    """
    Shared declarative base.
    All ORM models must inherit from this class.
    """
    pass


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at audit columns to any model.
    Use alongside Base for automatic timestamp tracking.
    """

    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class PrimaryKeyMixin:
    """Mixin that adds a standard integer primary key column."""

    id: MappedColumn[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
