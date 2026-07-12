"""Allocations router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.get("", summary="Allocations placeholder")
async def allocations_placeholder() -> dict:
    return {"module": "allocations", "status": "not implemented"}
