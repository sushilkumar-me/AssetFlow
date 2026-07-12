"""Departments router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", summary="Departments placeholder")
async def departments_placeholder() -> dict:
    return {"module": "departments", "status": "not implemented"}
