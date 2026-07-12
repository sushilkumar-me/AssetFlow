# schemas package
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.organization import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryStatusUpdate,
    CategoryUpdate,
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentStatusUpdate,
    DepartmentUpdate,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeRoleUpdate,
    EmployeeStatusUpdate,
    EmployeeUpdate,
)
from app.schemas.asset import (
    AssetCreateRequest,
    AssetListResponse,
    AssetResponse,
    AssetStatusUpdate,
    AssetUpdateRequest,
)
from app.schemas.allocation import (
    AllocateRequest,
    AllocationListResponse,
    AllocationResponse,
    ReturnRequest,
    TransferActionRequest,
    TransferCreateRequest,
    TransferListResponse,
    TransferResponse,
)
from app.schemas.booking import (
    BookingCancelRequest,
    BookingCreateRequest,
    BookingListResponse,
    BookingRescheduleRequest,
    BookingResponse,
    CalendarResponse,
)
from app.schemas.maintenance import (
    MaintenanceApproveRequest,
    MaintenanceAssignRequest,
    MaintenanceCreateRequest,
    MaintenanceListResponse,
    MaintenanceRejectRequest,
    MaintenanceResolveRequest,
    MaintenanceResponse,
)
from app.schemas.audit import (
    AssignAuditorsRequest,
    AuditCycleCreateRequest,
    AuditCycleListResponse,
    AuditCycleResponse,
    AuditRecordResponse,
    DiscrepancyReport,
    VerifyAssetRequest,
)
from app.schemas.dashboard import (
    ActivityLogListResponse,
    ActivityLogResponse,
    DashboardResponse,
    KPIResponse,
    NotificationListResponse,
    NotificationResponse,
    RecentActivityItem,
)
from app.schemas.reports import (
    AssetReportResponse,
    AuditReportResponse,
    BookingReportResponse,
    DashboardSummaryResponse,
    DepartmentReportResponse,
    ExportRequest,
    MaintenanceReportResponse,
    ReportResponse,
)

__all__ = [
    # auth
    "LoginRequest", "MessageResponse", "SignupRequest", "TokenResponse", "UserResponse",
    # departments
    "DepartmentCreate", "DepartmentUpdate", "DepartmentStatusUpdate",
    "DepartmentResponse", "DepartmentListResponse",
    # categories
    "CategoryCreate", "CategoryUpdate", "CategoryStatusUpdate",
    "CategoryResponse", "CategoryListResponse",
    # employees
    "EmployeeUpdate", "EmployeeRoleUpdate", "EmployeeStatusUpdate",
    "EmployeeResponse", "EmployeeListResponse",
    # assets
    "AssetCreateRequest", "AssetUpdateRequest", "AssetStatusUpdate",
    "AssetResponse", "AssetListResponse",
    # allocations
    "AllocateRequest", "ReturnRequest", "AllocationResponse", "AllocationListResponse",
    # transfers
    "TransferCreateRequest", "TransferActionRequest", "TransferResponse", "TransferListResponse",
    # bookings
    "BookingCreateRequest", "BookingRescheduleRequest", "BookingCancelRequest",
    "BookingResponse", "BookingListResponse", "CalendarResponse",
    # maintenance
    "MaintenanceCreateRequest", "MaintenanceApproveRequest", "MaintenanceRejectRequest",
    "MaintenanceAssignRequest", "MaintenanceResolveRequest",
    "MaintenanceResponse", "MaintenanceListResponse",
    # audits
    "AuditCycleCreateRequest", "AssignAuditorsRequest", "VerifyAssetRequest",
    "AuditCycleResponse", "AuditCycleListResponse",
    "AuditRecordResponse", "DiscrepancyReport",
    # dashboard / notifications / activity
    "NotificationResponse", "NotificationListResponse",
    "ActivityLogResponse", "ActivityLogListResponse",
    "KPIResponse", "DashboardResponse", "RecentActivityItem",
    # reports
    "ReportResponse", "DashboardSummaryResponse",
    "AssetReportResponse", "DepartmentReportResponse",
    "MaintenanceReportResponse", "BookingReportResponse", "AuditReportResponse",
    "ExportRequest",
]