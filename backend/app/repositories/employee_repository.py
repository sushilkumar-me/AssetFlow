"""
EmployeeRepository — DB access for User records in the employee-management context.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class EmployeeRepository:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        search: str | None = None,
        role: UserRole | None = None,
        department_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[User], int]:
        query = select(User)
        if search:
            query = query.where(
                User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
            )
        if role is not None:
            query = query.where(User.role == role)
        if department_id is not None:
            query = query.where(User.department_id == department_id)

        total = (
            await self._db.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(User.full_name).offset(offset).limit(page_size)
        result = await self._db.execute(query)
        return list(result.scalars().all()), total

    async def count_by_role(self, role: UserRole) -> int:
        result = await self._db.execute(
            select(func.count()).where(User.role == role, User.is_active.is_(True))
        )
        return result.scalar_one()

    async def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self._db.flush()
        await self._db.refresh(user)
        return user

    async def set_role(self, user: User, role: UserRole) -> User:
        user.role = role
        await self._db.flush()
        await self._db.refresh(user)
        return user

    async def set_active(self, user: User, is_active: bool) -> User:
        user.is_active = is_active
        await self._db.flush()
        await self._db.refresh(user)
        return user
