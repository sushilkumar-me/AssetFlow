"""Categories router — placeholder."""
from fastapi import APIRouter

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", summary="Categories placeholder")
async def categories_placeholder() -> dict:
    return {"module": "categories", "status": "not implemented"}
