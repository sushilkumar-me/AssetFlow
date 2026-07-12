"""
Departments endpoints.
All write operations require ADMIN role.
Read operations are available to any authenticated user.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.organization import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentStatusUpdate,
    DepartmentUpdate,
)
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/departments", tags=["Departments"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> DepartmentService:
    return DepartmentService(db)


@router.get("", response_model=DepartmentListResponse, summary="List departments")
async def list_departments(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DepartmentService, Depends(_svc)],
    search: str | None = Query(None),
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> DepartmentListResponse:
    return await svc.list_departments(search, active_only, page, page_size)


@router.get("/active", response_model=list[DepartmentResponse], summary="All active departments (dropdown)")
async def get_active_departments(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DepartmentService, Depends(_svc)],
) -> list[DepartmentResponse]:
    return await svc.get_all_active()


@router.get("/{dept_id}", response_model=DepartmentResponse, summary="Get department by ID")
async def get_department(
    dept_id: int,
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DepartmentService, Depends(_svc)],
) -> DepartmentResponse:
    return await svc.get_department(dept_id)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create department (Admin only)",
)
async def create_department(
    payload: DepartmentCreate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[DepartmentService, Depends(_svc)],
) -> DepartmentResponse:
    return await svc.create_department(payload)


@router.put("/{dept_id}", response_model=DepartmentResponse, summary="Update department (Admin only)")
async def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[DepartmentService, Depends(_svc)],
) -> DepartmentResponse:
    return await svc.update_department(dept_id, payload)


@router.patch("/{dept_id}/status", response_model=DepartmentResponse, summary="Activate/deactivate department (Admin only)")
async def set_department_status(
    dept_id: int,
    payload: DepartmentStatusUpdate,
    _: Annotated[User, Depends(require_admin)],
    svc: Annotated[DepartmentService, Depends(_svc)],
) -> DepartmentResponse:
    return await svc.set_status(dept_id, payload.is_active)
