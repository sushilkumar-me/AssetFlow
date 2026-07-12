"""
DepartmentRepository — all DB access for the Department model.
No business logic lives here.
"""

from __future__ import annotations

import math

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department


class DepartmentRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, dept_id: int) -> Department | None:
        result = await self._db.execute(
            select(Department).where(Department.id == dept_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Department | None:
        result = await self._db.execute(
            select(Department).where(
                func.lower(Department.name) == name.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        search: str | None = None,
        active_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Department], int]:
        query = select(Department)
        if search:
            query = query.where(Department.name.ilike(f"%{search}%"))
        if active_only:
            query = query.where(Department.is_active.is_(True))

        total_result = await self._db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(Department.name).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def get_all_active(self) -> list[Department]:
        """Return all active departments — used by dropdowns."""
        result = await self._db.execute(
            select(Department)
            .where(Department.is_active.is_(True))
            .order_by(Department.name)
        )
        return list(result.scalars().all())

    async def count_active_employees(self, dept_id: int) -> int:
        """Return number of active users assigned to this department."""
        from app.models.user import User
        result = await self._db.execute(
            select(func.count()).where(
                User.department_id == dept_id,
                User.is_active.is_(True),
            )
        )
        return result.scalar_one()

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(
        self,
        name: str,
        description: str | None,
        parent_department_id: int | None,
        department_head_id: int | None,
    ) -> Department:
        dept = Department(
            name=name.strip(),
            description=description,
            parent_department_id=parent_department_id,
            department_head_id=department_head_id,
        )
        self._db.add(dept)
        await self._db.flush()
        await self._db.refresh(dept)
        return dept

    async def update(self, dept: Department, **kwargs) -> Department:
        for key, value in kwargs.items():
            if value is not None or key in ("parent_department_id", "department_head_id"):
                setattr(dept, key, value)
        await self._db.flush()
        await self._db.refresh(dept)
        return dept

    async def set_active(self, dept: Department, is_active: bool) -> Department:
        dept.is_active = is_active
        await self._db.flush()
        await self._db.refresh(dept)
        return dept
