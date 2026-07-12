"""Auth router — placeholder. JWT implementation pending."""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("", summary="Auth placeholder")
async def auth_placeholder() -> dict:
    return {"module": "auth", "status": "not implemented"}
