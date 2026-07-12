"""
JWT utility — token creation and verification.
Uses python-jose with HS256 signing; secret and expiry come from Settings.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Token payload key names ───────────────────────────────────────────────────
_SUB_KEY = "sub"          # subject — stores the user id as a string
_EXP_KEY = "exp"
_TYPE_KEY = "type"
_ACCESS_TYPE = "access"


def create_access_token(
    subject: int | str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject:      User id (will be stored as string in 'sub').
        extra_claims: Optional additional claims merged into the payload.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        _SUB_KEY:  str(subject),
        _EXP_KEY:  expire,
        _TYPE_KEY: _ACCESS_TYPE,
        "iat":     now,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Raises:
        JWTError: If the token is invalid, expired, or tampered with.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        raise

    if payload.get(_TYPE_KEY) != _ACCESS_TYPE:
        raise JWTError("Invalid token type.")

    return payload


def get_user_id_from_token(token: str) -> int:
    """
    Extract and return the integer user id from a validated token.

    Raises:
        JWTError: If the token is invalid or the 'sub' claim is missing/malformed.
    """
    payload = decode_access_token(token)
    sub = payload.get(_SUB_KEY)
    if sub is None:
        raise JWTError("Token is missing 'sub' claim.")
    try:
        return int(sub)
    except (ValueError, TypeError) as exc:
        raise JWTError(f"Invalid subject in token: {sub!r}") from exc
