"""
AuthService — business logic for authentication.
Orchestrates UserRepository, password hashing, and JWT creation.
Never touches HTTP; raise domain exceptions that routers translate to HTTP errors.
"""

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, UserResponse
from app.utils.jwt import create_access_token, get_user_id_from_token
from app.utils.password import verify_password


class AuthService:
    """
    Stateless service — receives a DB session via constructor injection.
    All public methods are coroutines.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

    # ── Public API ────────────────────────────────────────────────────────────

    async def register(self, payload: SignupRequest) -> TokenResponse:
        """
        Create a new EMPLOYEE account and return a token immediately.
        Raises 409 if the email is already registered.
        """
        existing = await self._repo.get_by_email(payload.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        user = await self._repo.create_user(
            full_name=payload.full_name,
            email=payload.email,
            plain_password=payload.password,
            # Signup always creates EMPLOYEE — role cannot be chosen by the client
        )

        token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def login(self, payload: LoginRequest) -> TokenResponse:
        """
        Validate credentials and return a JWT.
        Raises 401 for any credential mismatch (deliberately vague for security).
        """
        user = await self._repo.get_by_email(payload.email)

        # Constant-time comparison even if user is None — prevents timing attacks
        candidate_hash = user.password_hash if user else "$2b$12$invalid.hash.to.prevent.timing"
        password_ok = verify_password(payload.password, candidate_hash)

        if user is None or not password_ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Contact an administrator.",
            )

        token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def get_current_user(self, token: str) -> User:
        """
        Validate a JWT and return the corresponding User.
        Raises 401 if the token is invalid or the user no longer exists.
        Raises 403 if the account is inactive.
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            user_id = get_user_id_from_token(token)
        except JWTError:
            raise credentials_exception

        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise credentials_exception

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        return user
