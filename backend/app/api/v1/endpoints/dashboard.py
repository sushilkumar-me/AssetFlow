"""
Dashboard endpoints.

GET /dashboard                  — Full dashboard (KPIs + recent activity + unread count)
GET /dashboard/kpis             — KPI numbers only
GET /dashboard/recent-activity  — Latest activity feed
"""

from __future__ import annotations
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse, KPIResponse, RecentActivityItem
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _svc(db: Annotated[AsyncSession, Depends(get_db)]) -> DashboardService:
    return DashboardService(db)


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DashboardService, Depends(_svc)],
) -> DashboardResponse:
    return await svc.get_dashboard(current_user.id)


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DashboardService, Depends(_svc)],
) -> KPIResponse:
    return await svc.get_kpis()


@router.get("/recent-activity", response_model=list[RecentActivityItem])
async def get_recent_activity(
    _: Annotated[User, Depends(get_current_user)],
    svc: Annotated[DashboardService, Depends(_svc)],
    limit: int = Query(20, ge=1, le=100),
) -> list[RecentActivityItem]:
    return await svc.get_recent_activity(limit)
