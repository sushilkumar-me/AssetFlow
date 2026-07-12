"""
Authentication and authorisation FastAPI dependencies.

Usage in routers:
    from app.dependencies.auth import get_current_user, require_admin

    @router.get("/admin-only")
    async def admin_endpoint(user: Annotated[User, Depends(require_admin)]):
        ...
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User, UserRole
from app.utils.jwt import get_user_id_from_token

# Points to the login endpoint so Swagger UI's "Authorize" button works
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Your account has been deactivated.",
)


# ── Core dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Resolve the JWT from the Authorization header and return the User.
    Raises 401 if the token is missing, invalid, or expired.
    Raises 403 if the account is inactive.
    """
    # Import here to avoid a circular dependency with AuthService
    from app.repositories.user_repository import UserRepository

    try:
        user_id = get_user_id_from_token(token)
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise _CREDENTIALS_EXCEPTION

    if not user.is_active:
        raise _INACTIVE_EXCEPTION

    return user


# ── Role-based guards ─────────────────────────────────────────────────────────

def _require_role(*roles: UserRole):
    """
    Factory that returns a FastAPI dependency enforcing one of the given roles.
    """
    allowed = set(roles)

    async def dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role(s): "
                    f"{', '.join(r.value for r in allowed)}."
                ),
            )
        return current_user

    return dependency


require_admin = _require_role(UserRole.ADMIN)

require_asset_manager = _require_role(UserRole.ADMIN, UserRole.ASSET_MANAGER)

require_department_head = _require_role(
    UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD
)

require_employee = _require_role(
    UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE
)
