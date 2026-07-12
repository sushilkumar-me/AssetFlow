"""
DepartmentService — all business rules for department management.
Only Admin may call mutating operations (enforced at router level via require_admin).
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.repositories.department_repository import DepartmentRepository
from app.schemas.organization import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
)


class DepartmentService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = DepartmentRepository(db)

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_or_404(self, dept_id: int) -> Department:
        dept = await self._repo.get_by_id(dept_id)
        if dept is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Department {dept_id} not found.")
        return dept

    async def list_departments(
        self,
        search: str | None = None,
        active_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> DepartmentListResponse:
        items, total = await self._repo.list(search, active_only, page, page_size)
        return DepartmentListResponse(
            items=[DepartmentResponse.model_validate(d) for d in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_department(self, dept_id: int) -> DepartmentResponse:
        dept = await self.get_or_404(dept_id)
        return DepartmentResponse.model_validate(dept)

    async def get_all_active(self) -> list[DepartmentResponse]:
        items = await self._repo.get_all_active()
        return [DepartmentResponse.model_validate(d) for d in items]

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create_department(self, payload: DepartmentCreate) -> DepartmentResponse:
        # Unique name check
        if await self._repo.get_by_name(payload.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=f"Department '{payload.name}' already exists.")

        # Cannot set itself as parent (not possible on create, but guard anyway)
        dept = await self._repo.create(
            name=payload.name,
            description=payload.description,
            parent_department_id=payload.parent_department_id,
            department_head_id=payload.department_head_id,
        )
        return DepartmentResponse.model_validate(dept)

    async def update_department(
        self, dept_id: int, payload: DepartmentUpdate
    ) -> DepartmentResponse:
        dept = await self.get_or_404(dept_id)

        if payload.name and payload.name.strip().lower() != dept.name.lower():
            if await self._repo.get_by_name(payload.name):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail=f"Department '{payload.name}' already exists.")

        # Cannot assign itself as its own parent
        if payload.parent_department_id is not None and payload.parent_department_id == dept_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="A department cannot be its own parent.")

        update_data = payload.model_dump(exclude_unset=True)
        dept = await self._repo.update(dept, **update_data)
        return DepartmentResponse.model_validate(dept)

    async def set_status(self, dept_id: int, is_active: bool) -> DepartmentResponse:
        dept = await self.get_or_404(dept_id)

        # Cannot deactivate a department that still has active employees
        if not is_active:
            active_count = await self._repo.count_active_employees(dept_id)
            if active_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Cannot deactivate department with {active_count} active "
                        f"employee(s). Reassign them first."
                    ),
                )

        dept = await self._repo.set_active(dept, is_active)
        return DepartmentResponse.model_validate(dept)
