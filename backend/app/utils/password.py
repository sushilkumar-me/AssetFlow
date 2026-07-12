"""
Password hashing utilities using bcrypt directly.

passlib 1.7.4 has a compatibility bug with bcrypt >= 4.x that causes a
ValueError during backend initialisation. We call the bcrypt library
directly to avoid this entirely.
"""

import bcrypt


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the given plain-text password."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False
