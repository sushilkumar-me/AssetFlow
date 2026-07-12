"""
AssetFlow — FastAPI application entry point.
Registers middleware, mounts the API v1 router, and configures OpenAPI docs.
"""

import logging

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.middleware.cors import register_cors
from app.middleware.logging import register_request_logging

# ── Logging must be configured before anything else ───────────────────────────
configure_logging()
logger = logging.getLogger(__name__)


def create_application() -> FastAPI:
    """
    Application factory.
    Returns a fully configured FastAPI instance.
    """
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        default_response_class=ORJSONResponse,
        # Disable debug mode in production
        debug=settings.DEBUG,
    )

    # ── Middleware (order matters — outermost registered last) ────────────────
    register_cors(application)
    register_request_logging(application)

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    # ── Startup / shutdown events ─────────────────────────────────────────────
    @application.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "%s v%s starting in %s mode",
            settings.APP_NAME,
            settings.APP_VERSION,
            settings.ENVIRONMENT,
        )

    @application.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("%s shutting down", settings.APP_NAME)

    return application


app: FastAPI = create_application()
