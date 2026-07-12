"""
Pydantic v2 schemas for the Organization Setup module.
Covers Departments, Asset Categories, and Employee management.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models.user import UserRole


# ═══════════════════════════════════════════════════════════════════════════════
# Department
# ═══════════════════════════════════════════════════════════════════════════════

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Engineering"])
    description: str | None = Field(None, max_length=1000)
    parent_department_id: int | None = None
    department_head_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    parent_department_id: int | None = None
    department_head_id: int | None = None


class DepartmentStatusUpdate(BaseModel):
    is_active: bool


class DepartmentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: str | None
    parent_department_id: int | None
    department_head_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DepartmentListResponse(BaseModel):
    items: list[DepartmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ═══════════════════════════════════════════════════════════════════════════════
# Asset Category
# ═══════════════════════════════════════════════════════════════════════════════

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Laptops"])
    description: str | None = Field(None, max_length=1000)
    custom_fields: dict[str, Any] | None = None

    @field_validator("custom_fields", mode="before")
    @classmethod
    def validate_custom_fields(cls, value: Any) -> Any:
        if value is not None and not isinstance(value, dict):
            raise ValueError("custom_fields must be a JSON object.")
        return value


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    custom_fields: dict[str, Any] | None = None


class CategoryStatusUpdate(BaseModel):
    is_active: bool


class CategoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: str | None
    custom_fields: dict[str, Any] | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ═══════════════════════════════════════════════════════════════════════════════
# Employee
# ═══════════════════════════════════════════════════════════════════════════════

class EmployeeUpdate(BaseModel):
    """Fields an Admin can edit on a user record."""
    full_name: str | None = Field(None, min_length=2, max_length=255)
    department_id: int | None = None


class EmployeeRoleUpdate(BaseModel):
    role: UserRole

    @field_validator("role")
    @classmethod
    def role_not_none(cls, value: UserRole) -> UserRole:
        return value


class EmployeeStatusUpdate(BaseModel):
    is_active: bool


class EmployeeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    full_name: str
    email: str
    role: UserRole
    department_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
