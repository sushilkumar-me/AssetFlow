"""
Activity Logs endpoint.

GET /activity-logs  — Admin sees all; employees see only own.
"""

from __future__ import annotations
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User, UserRole
from app.schemas.dashboard import ActivityLogListResponse
from app.services.dashboard_service import ActivityLogService

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> ActivityLogService:
    return ActivityLogService(db)


@router.get("", response_model=ActivityLogListResponse)
async def list_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[ActivityLogService, Depends(_svc)],
    entity_type: str | None = Query(None),
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
) -> ActivityLogListResponse:
    # Admin sees all; everyone else only sees their own
    scoped_user_id = None if current_user.role == UserRole.ADMIN else current_user.id
    return await svc.list_logs(
        user_id=scoped_user_id,
        entity_type=entity_type,
        action=action,
        page=page,
        page_size=page_size,
    )
