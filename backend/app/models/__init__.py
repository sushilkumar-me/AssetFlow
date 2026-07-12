# models package
# Import all models here so Alembic autogenerate picks them up.
from app.models.user import User, UserRole

__all__ = ["User", "UserRole"]
