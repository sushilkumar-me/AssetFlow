"""Assets router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", summary="Assets placeholder")
async def assets_placeholder() -> dict:
    return {"module": "assets", "status": "not implemented"}
