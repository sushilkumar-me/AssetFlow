"""
CORS middleware configuration.
Reads allowed origins from Settings so the list is driven by environment variables.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


def register_cors(app: FastAPI) -> None:
    """
    Attach CORSMiddleware to the FastAPI application.
    Call this during application startup before any routes are registered.
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
