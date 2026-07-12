"""Audits router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/audits", tags=["Audits"])


@router.get("", summary="Audits placeholder")
async def audits_placeholder() -> dict:
    return {"module": "audits", "status": "not implemented"}
