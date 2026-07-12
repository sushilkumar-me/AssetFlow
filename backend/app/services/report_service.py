"""
ReportService — generates analytics and reports for assets, departments,
maintenance, bookings, and audits.
"""

from __future__ import annotations

from datetime import date, datetime, timezone, timedelta
from typing import Any

from sqlalchemy import func, select, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allocation import AllocationStatus, AssetAllocation
from app.models.asset import Asset, AssetStatus
from app.models.audit import AuditCycle, AuditRecord, AuditCycleStatus, VerificationStatus
from app.models.booking import BookingStatus, ResourceBooking
from app.models.department import Department
from app.models.maintenance import MaintenancePriority, MaintenanceRequest, MaintenanceStatus
from app.models.user import User, UserRole


# ═══════════════════════════════════════════════════════════════════════════════
# ReportService
# ═══════════════════════════════════════════════════════════════════════════════

class ReportService:

    def __init__(self, db: AsyncSession, current_user: User | None = None) -> None:
        self._db = db
        self._user = current_user

    def _is_admin_or_manager(self) -> bool:
        return self._user is not None and self._user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER)

    def _is_department_head(self) -> bool:
        return self._user is not None and self._user.role == UserRole.DEPARTMENT_HEAD

    async def _scalar(self, stmt) -> int:
        result = await self._db.execute(stmt)
        return result.scalar_one() or 0

    # ─────────────────────────────────────────────────────────────────────────
    # Asset Utilization Report
    # ─────────────────────────────────────────────────────────────────────────

    async def get_asset_report(self, **filters) -> dict[str, Any]:
        """Asset utilization: most used, least used, idle, allocation %."""
        q = select(Asset).where(Asset.is_active.is_(True))

        total = await self._scalar(select(func.count()).select_from(q.subquery()))

        # Status distribution
        status_breakdown = {}
        for status in AssetStatus:
            cnt = await self._scalar(
                select(func.count(Asset.id)).where(Asset.status == status, Asset.is_active.is_(True))
            )
            status_breakdown[status.value] = cnt

        # Most used (by allocation count)
        most_used = await self._db.execute(
            select(Asset.id, Asset.name, Asset.asset_tag, func.count(AssetAllocation.id).label("alloc_count"))
            .join(AssetAllocation, AssetAllocation.asset_id == Asset.id, isouter=True)
            .where(Asset.is_active.is_(True))
            .group_by(Asset.id, Asset.name, Asset.asset_tag)
            .order_by(func.count(AssetAllocation.id).desc())
            .limit(10)
        )
        most_used_list = [
            {"id": r.id, "name": r.name, "asset_tag": r.asset_tag, "allocation_count": r.alloc_count}
            for r in most_used
        ]

        # Least used (allocations <= 1)
        least_used = await self._db.execute(
            select(Asset.id, Asset.name, Asset.asset_tag, func.count(AssetAllocation.id).label("alloc_count"))
            .join(AssetAllocation, AssetAllocation.asset_id == Asset.id, isouter=True)
            .where(Asset.is_active.is_(True))
            .group_by(Asset.id, Asset.name, Asset.asset_tag)
            .having(func.count(AssetAllocation.id) <= 1)
            .order_by(func.count(AssetAllocation.id).asc())
            .limit(10)
        )
        least_used_list = [
            {"id": r.id, "name": r.name, "asset_tag": r.asset_tag, "allocation_count": r.alloc_count}
            for r in least_used
        ]

        # Idle assets (never allocated)
        idle = await self._db.execute(
            select(Asset.id, Asset.name, Asset.asset_tag, Asset.status)
            .outerjoin(AssetAllocation, AssetAllocation.asset_id == Asset.id)
            .where(Asset.is_active.is_(True), AssetAllocation.id.is_(None))
            .limit(10)
        )
        idle_list = [{"id": r.id, "name": r.name, "asset_tag": r.asset_tag, "status": r.status.value} for r in idle]

        # Allocation percentage
        allocated = status_breakdown.get("ALLOCATED", 0)
        alloc_pct = round(allocated / total * 100, 1) if total > 0 else 0

        return {
            "total_assets": total,
            "status_breakdown": status_breakdown,
            "allocation_percentage": alloc_pct,
            "most_used_assets": most_used_list,
            "least_used_assets": least_used_list,
            "idle_assets": idle_list,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Department Allocation Report
    # ─────────────────────────────────────────────────────────────────────────

    async def get_department_report(self, **filters) -> dict[str, Any]:
        """Assets per department: allocated, available, maintenance, lost."""
        # Get all departments
        depts = await self._db.execute(select(Department))
        dept_list = list(depts.scalars().all())

        dept_data = []
        for dept in dept_list:
            allocated = await self._scalar(
                select(func.count(Asset.id)).where(
                    Asset.department_id == dept.id,
                    Asset.status == AssetStatus.ALLOCATED,
                    Asset.is_active.is_(True),
                )
            )
            available = await self._scalar(
                select(func.count(Asset.id)).where(
                    Asset.department_id == dept.id,
                    Asset.status == AssetStatus.AVAILABLE,
                    Asset.is_active.is_(True),
                )
            )
            maintenance = await self._scalar(
                select(func.count(Asset.id)).where(
                    Asset.department_id == dept.id,
                    Asset.status == AssetStatus.UNDER_MAINTENANCE,
                    Asset.is_active.is_(True),
                )
            )
            lost = await self._scalar(
                select(func.count(Asset.id)).where(
                    Asset.department_id == dept.id,
                    Asset.status == AssetStatus.LOST,
                    Asset.is_active.is_(True),
                )
            )
            dept_data.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "allocated": allocated,
                "available": available,
                "under_maintenance": maintenance,
                "lost": lost,
                "total": allocated + available + maintenance + lost,
            })

        # No-department assets
        no_dept = await self._scalar(
            select(func.count(Asset.id)).where(
                Asset.department_id.is_(None),
                Asset.is_active.is_(True),
            )
        )

        return {"departments": dept_data, "unassigned_assets": no_dept}

    # ─────────────────────────────────────────────────────────────────────────
    # Maintenance Analytics
    # ─────────────────────────────────────────────────────────────────────────

    async def get_maintenance_report(self, **filters) -> dict[str, Any]:
        """Maintenance requests per month, most repaired assets, priority distribution."""
        # Requests per month (last 12 months)
        twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)
        monthly = await self._db.execute(
            select(
                extract("year", MaintenanceRequest.created_at).label("year"),
                extract("month", MaintenanceRequest.created_at).label("month"),
                func.count(MaintenanceRequest.id).label("count"),
            )
            .where(MaintenanceRequest.created_at >= twelve_months_ago)
            .group_by(
                extract("year", MaintenanceRequest.created_at),
                extract("month", MaintenanceRequest.created_at),
            )
            .order_by("year", "month")
        )
        monthly_data = [
            {"year": int(r.year), "month": int(r.month), "count": r.count}
            for r in monthly
        ]

        # Priority distribution
        priority_dist = {}
        for priority in MaintenancePriority:
            cnt = await self._scalar(
                select(func.count(MaintenanceRequest.id)).where(MaintenanceRequest.priority == priority)
            )
            priority_dist[priority.value] = cnt

        # Status distribution
        status_dist = {}
        for status in MaintenanceStatus:
            cnt = await self._scalar(
                select(func.count(MaintenanceRequest.id)).where(MaintenanceRequest.status == status)
            )
            status_dist[status.value] = cnt

        # Most repaired assets
        most_repaired = await self._db.execute(
            select(
                Asset.id, Asset.name, Asset.asset_tag,
                func.count(MaintenanceRequest.id).label("repair_count"),
            )
            .join(MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id)
            .group_by(Asset.id, Asset.name, Asset.asset_tag)
            .order_by(func.count(MaintenanceRequest.id).desc())
            .limit(10)
        )
        repaired_list = [
            {"id": r.id, "name": r.name, "asset_tag": r.asset_tag, "repair_count": r.repair_count}
            for r in most_repaired
        ]

        # Average resolution time (for resolved requests)
        resolved = await self._db.execute(
            select(MaintenanceRequest).where(
                MaintenanceRequest.status == MaintenanceStatus.RESOLVED,
                MaintenanceRequest.resolved_at.isnot(None),
                MaintenanceRequest.created_at.isnot(None),
            )
        )
        resolved_list = list(resolved.scalars().all())
        if resolved_list:
            total_days = sum(
                (r.resolved_at - r.created_at).days for r in resolved_list if r.resolved_at and r.created_at
            )
            avg_days = round(total_days / len(resolved_list), 1)
        else:
            avg_days = 0

        return {
            "monthly_requests": monthly_data,
            "priority_distribution": priority_dist,
            "status_distribution": status_dist,
            "most_repaired_assets": repaired_list,
            "average_resolution_days": avg_days,
            "total_requests": sum(status_dist.values()),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Booking Analytics
    # ─────────────────────────────────────────────────────────────────────────

    async def get_booking_report(self, **filters) -> dict[str, Any]:
        """Most booked resources, peak hours, daily/weekly/monthly usage."""
        # Most booked assets
        most_booked = await self._db.execute(
            select(
                Asset.id, Asset.name, Asset.asset_tag,
                func.count(ResourceBooking.id).label("booking_count"),
            )
            .join(ResourceBooking, ResourceBooking.asset_id == Asset.id)
            .group_by(Asset.id, Asset.name, Asset.asset_tag)
            .order_by(func.count(ResourceBooking.id).desc())
            .limit(10)
        )
        booked_list = [
            {"id": r.id, "name": r.name, "asset_tag": r.asset_tag, "booking_count": r.booking_count}
            for r in most_booked
        ]

        # Bookings by status
        status_dist = {}
        for status in BookingStatus:
            cnt = await self._scalar(
                select(func.count(ResourceBooking.id)).where(ResourceBooking.status == status)
            )
            status_dist[status.value] = cnt

        # Peak hours (0-23)
        hourly = await self._db.execute(
            select(
                extract("hour", ResourceBooking.start_datetime).label("hour"),
                func.count(ResourceBooking.id).label("count"),
            )
            .group_by(extract("hour", ResourceBooking.start_datetime))
            .order_by("hour")
        )
        hourly_data = [{"hour": int(r.hour or 0), "count": r.count} for r in hourly]

        # Daily usage (last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        daily = await self._db.execute(
            select(
                func.date(ResourceBooking.start_datetime).label("day"),
                func.count(ResourceBooking.id).label("count"),
            )
            .where(ResourceBooking.start_datetime >= thirty_days_ago)
            .group_by(func.date(ResourceBooking.start_datetime))
            .order_by("day")
        )
        daily_data = [{"date": str(r.day), "count": r.count} for r in daily]

        # Weekly usage (last 12 weeks)
        weekly = await self._db.execute(
            select(
                func.date_trunc("week", ResourceBooking.start_datetime).label("week"),
                func.count(ResourceBooking.id).label("count"),
            )
            .group_by(func.date_trunc("week", ResourceBooking.start_datetime))
            .order_by("week")
            .limit(12)
        )
        weekly_data = [{"week": str(r.week), "count": r.count} for r in weekly]

        return {
            "most_booked_assets": booked_list,
            "status_distribution": status_dist,
            "hourly_distribution": hourly_data,
            "daily_usage": daily_data,
            "weekly_usage": weekly_data,
            "total_bookings": sum(status_dist.values()),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Audit Analytics
    # ─────────────────────────────────────────────────────────────────────────

    async def get_audit_report(self, **filters) -> dict[str, Any]:
        """Verified/missing/damaged assets, open vs closed audits."""
        # Audit cycle status
        open_cnt = await self._scalar(
            select(func.count(AuditCycle.id)).where(AuditCycle.status == AuditCycleStatus.OPEN)
        )
        in_progress_cnt = await self._scalar(
            select(func.count(AuditCycle.id)).where(AuditCycle.status == AuditCycleStatus.IN_PROGRESS)
        )
        closed_cnt = await self._scalar(
            select(func.count(AuditCycle.id)).where(AuditCycle.status == AuditCycleStatus.CLOSED)
        )

        # Verification status distribution
        verified_cnt = await self._scalar(
            select(func.count(AuditRecord.id)).where(AuditRecord.verification_status == VerificationStatus.VERIFIED)
        )
        missing_cnt = await self._scalar(
            select(func.count(AuditRecord.id)).where(AuditRecord.verification_status == VerificationStatus.MISSING)
        )
        damaged_cnt = await self._scalar(
            select(func.count(AuditRecord.id)).where(AuditRecord.verification_status == VerificationStatus.DAMAGED)
        )

        # Recent audits with discrepancy %
        recent_audits = await self._db.execute(
            select(AuditCycle)
            .order_by(AuditCycle.created_at.desc())
            .limit(10)
        )
        audit_list = []
        for cycle in recent_audits.scalars():
            total = await self._scalar(
                select(func.count(AuditRecord.id)).where(AuditRecord.audit_cycle_id == cycle.id)
            )
            missing = await self._scalar(
                select(func.count(AuditRecord.id)).where(
                    AuditRecord.audit_cycle_id == cycle.id,
                    AuditRecord.verification_status == VerificationStatus.MISSING,
                )
            )
            damaged = await self._scalar(
                select(func.count(AuditRecord.id)).where(
                    AuditRecord.audit_cycle_id == cycle.id,
                    AuditRecord.verification_status == VerificationStatus.DAMAGED,
                )
            )
            disc_pct = round((missing + damaged) / total * 100, 1) if total > 0 else 0
            audit_list.append({
                "id": cycle.id,
                "name": cycle.name,
                "status": cycle.status.value,
                "total_verified": total,
                "missing": missing,
                "damaged": damaged,
                "discrepancy_percentage": disc_pct,
            })

        return {
            "open_audits": open_cnt,
            "in_progress_audits": in_progress_cnt,
            "closed_audits": closed_cnt,
            "verified_assets": verified_cnt,
            "missing_assets": missing_cnt,
            "damaged_assets": damaged_cnt,
            "recent_audits": audit_list,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Dashboard Summary
    # ─────────────────────────────────────────────────────────────────────────

    async def get_dashboard_summary(self) -> dict[str, Any]:
        """High-level summary for the reports dashboard."""
        total_assets = await self._scalar(
            select(func.count(Asset.id)).where(Asset.is_active.is_(True))
        )
        total_depts = await self._scalar(select(func.count(Department.id)))
        total_users = await self._scalar(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )
        open_audits = await self._scalar(
            select(func.count(AuditCycle.id)).where(AuditCycle.status.in_([AuditCycleStatus.OPEN, AuditCycleStatus.IN_PROGRESS]))
        )
        pending_maint = await self._scalar(
            select(func.count(MaintenanceRequest.id)).where(MaintenanceRequest.status == MaintenanceStatus.PENDING)
        )
        active_bookings = await self._scalar(
            select(func.count(ResourceBooking.id)).where(ResourceBooking.status.in_([BookingStatus.UPCOMING, BookingStatus.ONGOING]))
        )

        return {
            "total_assets": total_assets,
            "total_departments": total_depts,
            "total_employees": total_users,
            "open_audits": open_audits,
            "pending_maintenance": pending_maint,
            "active_bookings": active_bookings,
        }