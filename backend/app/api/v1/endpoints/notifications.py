"""Notifications router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="Notifications placeholder")
async def notifications_placeholder() -> dict:
    return {"module": "notifications", "status": "not implemented"}
