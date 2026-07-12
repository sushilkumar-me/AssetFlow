"""
EmployeeService — business rules for employee directory management.

Key rules enforced here:
- Cannot promote an inactive user.
- Cannot deactivate the last active Admin.
- Cannot assign user to an inactive department.
"""

from __future__ import annotations

import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.organization import (
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdate,
)


class EmployeeService:

    def __init__(self, db: AsyncSession) -> None:
        self._repo = EmployeeRepository(db)
        self._dept_repo = DepartmentRepository(db)

    async def get_or_404(self, user_id: int) -> User:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Employee {user_id} not found.")
        return user

    async def list_employees(
        self,
        search: str | None = None,
        role: UserRole | None = None,
        department_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> EmployeeListResponse:
        items, total = await self._repo.list(search, role, department_id, page, page_size)
        return EmployeeListResponse(
            items=[EmployeeResponse.model_validate(u) for u in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    async def get_employee(self, user_id: int) -> EmployeeResponse:
        return EmployeeResponse.model_validate(await self.get_or_404(user_id))

    async def update_employee(
        self, user_id: int, payload: EmployeeUpdate
    ) -> EmployeeResponse:
        user = await self.get_or_404(user_id)

        # If changing department, verify the target department is active
        if payload.department_id is not None:
            dept = await self._dept_repo.get_by_id(payload.department_id)
            if dept is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail="Department not found.")
            if not dept.is_active:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Cannot assign employee to an inactive department.",
                )

        update_data = payload.model_dump(exclude_unset=True)
        user = await self._repo.update(user, **update_data)
        return EmployeeResponse.model_validate(user)

    async def change_role(self, user_id: int, new_role: UserRole) -> EmployeeResponse:
        user = await self.get_or_404(user_id)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot change the role of an inactive employee.",
            )

        user = await self._repo.set_role(user, new_role)
        return EmployeeResponse.model_validate(user)

    async def set_status(self, user_id: int, is_active: bool) -> EmployeeResponse:
        user = await self.get_or_404(user_id)

        # Guard: cannot deactivate the last active Admin
        if not is_active and user.role == UserRole.ADMIN:
            admin_count = await self._repo.count_by_role(UserRole.ADMIN)
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot deactivate the last active administrator.",
                )

        user = await self._repo.set_active(user, is_active)
        return EmployeeResponse.model_validate(user)
