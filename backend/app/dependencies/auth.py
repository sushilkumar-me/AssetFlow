"""
Authentication dependencies — prepared for JWT implementation.
Not yet active; placeholder stubs are defined here so routers can
import them without breaking when auth is added later.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Will be used once JWT auth is implemented
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> None:
    """
    Placeholder: resolve and return the authenticated user from the JWT token.
    Raise HTTP 401 when authentication is enforced.
    """
    # TODO: Implement JWT token validation and user lookup
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication is not yet implemented.",
    )
