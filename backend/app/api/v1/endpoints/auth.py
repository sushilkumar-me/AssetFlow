"""
Auth endpoints — signup, login, current user, logout.
All business logic is delegated to AuthService.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Dependency helper ─────────────────────────────────────────────────────────

def _auth_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthService:
    return AuthService(db)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new employee account",
)
async def signup(
    payload: SignupRequest,
    service: Annotated[AuthService, Depends(_auth_service)],
) -> TokenResponse:
    """
    Register a new user as **EMPLOYEE**.
    Clients cannot choose their own role.
    Returns a JWT access token on success.
    """
    return await service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain a JWT access token",
)
async def login(
    payload: LoginRequest,
    service: Annotated[AuthService, Depends(_auth_service)],
) -> TokenResponse:
    """
    Validate credentials and return a JWT access token with user info.
    Responds with 401 for any credential mismatch.
    """
    return await service.login(payload)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return the profile of the currently logged-in user. Requires a valid JWT."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Stateless logout",
)
async def logout(
    _current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """
    Stateless JWT logout — instructs the client to discard its token.
    Server-side token revocation will be added if a token blocklist is implemented.
    """
    return MessageResponse(message="Successfully logged out.")
