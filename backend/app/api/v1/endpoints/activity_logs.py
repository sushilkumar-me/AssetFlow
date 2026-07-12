"""Activity Logs router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


@router.get("", summary="Activity Logs placeholder")
async def activity_logs_placeholder() -> dict:
    return {"module": "activity_logs", "status": "not implemented"}
