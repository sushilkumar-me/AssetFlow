"""
Pydantic v2 schemas for authentication endpoints.
These are the request/response contracts for the auth API — never expose password_hash.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


# ── Requests ──────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, examples=["Jane Smith"])
    email: EmailStr = Field(..., examples=["jane@company.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["Str0ng!Pass"])

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        """Reject passwords that are entirely lowercase or have no digits."""
        if value.isalpha():
            raise ValueError(
                "Password must contain at least one number or special character."
            )
        return value


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["jane@company.com"])
    password: str = Field(..., min_length=1, examples=["Str0ng!Pass"])


# ── Responses ─────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Safe user representation — no password_hash exposed."""

    model_config = {"from_attributes": True}

    id: int
    full_name: str
    email: str
    role: UserRole
    department_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic success/info response."""
    message: str
