"""
Notification endpoints.

GET    /notifications              — List own notifications
PATCH  /notifications/{id}/read   — Mark one read
PATCH  /notifications/read-all    — Mark all read
DELETE /notifications/{id}        — Delete one
"""

from __future__ import annotations
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.dashboard import NotificationListResponse, NotificationResponse
from app.services.dashboard_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[NotificationService, Depends(_svc)],
) -> NotificationListResponse:
    return await svc.list_for_user(current_user.id)


@router.patch("/read-all", response_model=dict)
async def mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[NotificationService, Depends(_svc)],
) -> dict:
    return await svc.mark_all_read(current_user.id)


@router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(
    notif_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[NotificationService, Depends(_svc)],
) -> NotificationResponse:
    return await svc.mark_read(notif_id, current_user.id)


@router.delete("/{notif_id}", status_code=status.HTTP_200_OK, response_model=dict)
async def delete_notification(
    notif_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[NotificationService, Depends(_svc)],
) -> dict:
    await svc.delete(notif_id, current_user.id)
    return {"deleted": notif_id}
