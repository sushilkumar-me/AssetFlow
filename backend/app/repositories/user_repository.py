"""
UserRepository — all database access for the User model.
Services call this class; it never contains business logic.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.utils.password import hash_password


class UserRepository:
    """Data-access object for User records."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_user(
        self,
        full_name: str,
        email: str,
        plain_password: str,
        role: UserRole = UserRole.EMPLOYEE,
        department_id: int | None = None,
    ) -> User:
        """
        Persist a new user.
        The plain password is hashed here — callers never touch the hash.
        """
        user = User(
            full_name=full_name,
            email=email.lower().strip(),
            password_hash=hash_password(plain_password),
            role=role,
            department_id=department_id,
            is_active=True,
        )
        self._db.add(user)
        await self._db.flush()   # assigns id without committing (session commit is in get_db)
        await self._db.refresh(user)
        return user

    async def get_by_email(self, email: str) -> User | None:
        """Return the user with the given email, or None."""
        result = await self._db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        """Return the user with the given primary key, or None."""
        result = await self._db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
