# models package — import all models so Alembic autogenerate picks them up.
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import AssetCategory
from app.models.asset import Asset, AssetStatus, AssetCondition
from app.models.allocation import AssetAllocation, TransferRequest, AllocationStatus, TransferStatus
from app.models.booking import ResourceBooking, BookingStatus
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.audit import AuditCycle, AuditAuditor, AuditRecord, AuditCycleStatus, AuditScopeType, VerificationStatus

__all__ = [
    "User", "UserRole",
    "Department",
    "AssetCategory",
    "Asset", "AssetStatus", "AssetCondition",
    "AssetAllocation", "AllocationStatus",
    "TransferRequest", "TransferStatus",
    "ResourceBooking", "BookingStatus",
    "MaintenanceRequest", "MaintenancePriority", "MaintenanceStatus",
    "AuditCycle", "AuditAuditor", "AuditRecord",
    "AuditCycleStatus", "AuditScopeType", "VerificationStatus",
]
