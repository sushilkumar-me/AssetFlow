"""Reports router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", summary="Reports placeholder")
async def reports_placeholder() -> dict:
    return {"module": "reports", "status": "not implemented"}
