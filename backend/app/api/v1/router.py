"""
API v1 router — aggregates all endpoint routers under /api/v1.
Add new module routers here as they are implemented.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    activity_logs,
    allocations,
    assets,
    audits,
    auth,
    bookings,
    categories,
    dashboard,
    departments,
    employees,
    health,
    maintenance,
    notifications,
    reports,
    transfers,
)
api_v1_router = APIRouter()

# ── System ────────────────────────────────────────────────────────────────────
api_v1_router.include_router(health.router)

# ── Auth ──────────────────────────────────────────────────────────────────────
api_v1_router.include_router(auth.router)

# ── Core modules ─────────────────────────────────────────────────────────────
api_v1_router.include_router(departments.router)
api_v1_router.include_router(employees.router)
api_v1_router.include_router(categories.router)
api_v1_router.include_router(assets.router)

# ── Operations ────────────────────────────────────────────────────────────────
api_v1_router.include_router(allocations.router)
api_v1_router.include_router(transfers.router)
api_v1_router.include_router(bookings.router)
api_v1_router.include_router(maintenance.router)
api_v1_router.include_router(maintenance.asset_router)  # /assets/{id}/maintenance-history

# ── Governance & reporting ────────────────────────────────────────────────────
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(audits.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(activity_logs.router)
