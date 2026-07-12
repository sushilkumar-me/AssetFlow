"""
Health check endpoint.
GET /api/v1/health — confirms the backend is running.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    success: bool
    message: str


@router.get("/health", response_model=HealthResponse, summary="Health Check")
async def health_check() -> HealthResponse:
    """Return a simple liveness signal for load balancers and monitoring tools."""
    return HealthResponse(success=True, message="AssetFlow Backend Running")
