"""
Pydantic v2 schemas for Dashboard, Notifications, and Activity Logs.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    title: str
    message: str
    type: NotificationType
    entity_type: str | None
    entity_id: int | None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


# ── Activity Logs ─────────────────────────────────────────────────────────────

class ActivityLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None
    action: str
    entity_type: str | None
    entity_id: int | None
    description: str
    ip_address: str | None
    created_at: datetime


class ActivityLogListResponse(BaseModel):
    items: list[ActivityLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── KPI ───────────────────────────────────────────────────────────────────────

class KPIResponse(BaseModel):
    available_assets: int
    allocated_assets: int
    under_maintenance: int
    lost_assets: int
    retired_assets: int
    todays_bookings: int
    pending_transfers: int
    pending_maintenance: int
    upcoming_returns: int
    overdue_returns: int
    open_audit_cycles: int
    total_employees: int


class RecentActivityItem(BaseModel):
    id: int
    user_id: int | None
    user_name: str
    action: str
    entity_type: str | None
    entity_id: int | None
    description: str
    created_at: datetime


class DashboardResponse(BaseModel):
    kpis: KPIResponse
    recent_activity: list[RecentActivityItem]
    unread_notifications: int
