"""Employees router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", summary="Employees placeholder")
async def employees_placeholder() -> dict:
    return {"module": "employees", "status": "not implemented"}
