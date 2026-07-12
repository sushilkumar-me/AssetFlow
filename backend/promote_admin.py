"""
Promote a user to ADMIN by email.
Usage: python promote_admin.py your@email.com
"""
import asyncio
import sys


async def main(email: str) -> None:
    from app.database.session import AsyncSessionLocal
    from app.models.user import User, UserRole
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()

        if user is None:
            print(f"No user found with email: {email}")
            sys.exit(1)

        old_role = user.role
        user.role = UserRole.ADMIN
        await db.commit()
        print(f"Promoted {user.full_name} ({user.email}): {old_role} → ADMIN")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python promote_admin.py your@email.com")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
