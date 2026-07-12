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
]
