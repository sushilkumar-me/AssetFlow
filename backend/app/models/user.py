"""
User ORM model.
Represents an authenticated system user with a role-based access level.
"""

import enum

from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, PrimaryKeyMixin, TimestampMixin


class UserRole(str, enum.Enum):
    """
    Defines the four access levels in AssetFlow.
    Stored as a VARCHAR in the database so values are human-readable.
    """
    ADMIN             = "ADMIN"
    ASSET_MANAGER     = "ASSET_MANAGER"
    DEPARTMENT_HEAD   = "DEPARTMENT_HEAD"
    EMPLOYEE          = "EMPLOYEE"


class User(PrimaryKeyMixin, TimestampMixin, Base):
    """
    Persisted user account.

    Passwords are NEVER stored in plain text — only the bcrypt hash.
    The role field controls what endpoints and UI elements the user can access.
    """

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(320),   # RFC 5321 max email length
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", create_constraint=True),
        nullable=False,
        default=UserRole.EMPLOYEE,
        server_default=UserRole.EMPLOYEE.value,
    )
    # Optional FK — populated once the Department model is created.
    # No FK constraint enforced yet; will be added in a later migration.
    department_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
