"""Maintenance router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("", summary="Maintenance placeholder")
async def maintenance_placeholder() -> dict:
    return {"module": "maintenance", "status": "not implemented"}
