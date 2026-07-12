# models package — import all models so Alembic autogenerate picks them up.
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import AssetCategory
from app.models.asset import Asset, AssetStatus, AssetCondition

__all__ = ["User", "UserRole", "Department", "AssetCategory", "Asset", "AssetStatus", "AssetCondition"]
