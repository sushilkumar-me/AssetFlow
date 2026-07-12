"""Bookings router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("", summary="Bookings placeholder")
async def bookings_placeholder() -> dict:
    return {"module": "bookings", "status": "not implemented"}
