"""
Employee Directory endpoints.
All write operations require ADMIN role.
Read operations available to any authenticated user.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.database import get_db
from app.models.user import User, UserRole
from app.schemas.organization import (
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeRoleUpdate,
    EmployeeStatusUpdate,
    EmployeeUpdate,
)
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> EmployeeService:
    return EmployeeService(db)


@router.get("", response_model=EmployeeListResponse, summary="List employees")
async def list_employees(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[EmployeeService, Depends(_svc)],
    search: str | None = Query(None),
    role: UserRole | None = Query(None),
    department_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> EmployeeListResponse:
    return await svc.list_employees(search, role, department_id, page, page_size)


@router.get("/{user_id}", response_model=EmployeeResponse, summary="Get employee by ID")
async def get_employee(
    user_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> EmployeeResponse:
    return await svc.get_employee(user_id)


@router.put("/{user_id}", response_model=EmployeeResponse, summary="Update employee details (Admin only)")
async def update_employee(
    user_id: int,
    payload: EmployeeUpdate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> EmployeeResponse:
    return await svc.update_employee(user_id, payload)


@router.patch("/{user_id}/role", response_model=EmployeeResponse, summary="Change employee role (Admin only)")
async def change_role(
    user_id: int,
    payload: EmployeeRoleUpdate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> EmployeeResponse:
    return await svc.change_role(user_id, payload.role)


@router.patch("/{user_id}/status", response_model=EmployeeResponse, summary="Activate/deactivate employee (Admin only)")
async def set_employee_status(
    user_id: int,
    payload: EmployeeStatusUpdate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[EmployeeService, Depends(_svc)],
) -> EmployeeResponse:
    return await svc.set_status(user_id, payload.is_active)
