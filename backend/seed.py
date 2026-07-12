"""
Demo data seed script for AssetFlow.

Run:  python seed.py

Creates:
    - 4 demo users (admin, asset_manager, dept_head, employee)
    - 5 departments
    - 6 asset categories
    - 20 assets
    - 8 allocations
    - 6 bookings
    - 5 maintenance requests
    - 2 audit cycles with records
    - Notifications and activity logs
"""

from __future__ import annotations

import asyncio
import sys
from datetime import date, datetime, timedelta, timezone

# ── Bootstrap env before any app imports ─────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import AsyncSessionLocal
from app.utils.password import hash_password as get_password_hash
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.category import AssetCategory
from app.models.asset import Asset, AssetStatus, AssetCondition
from app.models.allocation import AssetAllocation, AllocationStatus, TransferRequest, TransferStatus
from app.models.booking import ResourceBooking, BookingStatus
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.audit import (
    AuditCycle, AuditAuditor, AuditRecord,
    AuditCycleStatus, AuditScopeType, VerificationStatus,
)
from app.models.notification import Notification, ActivityLog, NotificationType


# ── Helpers ───────────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def days_ago(n: int) -> datetime:
    return utcnow() - timedelta(days=n)

def days_from_now(n: int) -> date:
    return (utcnow() + timedelta(days=n)).date()


# ── Main ─────────────────────────────────────────────────────────────────────

async def seed(db: AsyncSession) -> None:
    print("Seeding demo data…")

    # ── Idempotency check ──────────────────────────────────────────────────
    from sqlalchemy import select as sa_select
    existing_cat = (await db.execute(sa_select(AssetCategory).limit(1))).scalar_one_or_none()
    if existing_cat is not None:
        print("⚠️  Seed data already exists. Skipping.")
        print("\nDemo accounts:")
        print("  Admin:         admin@assetflow.demo     / Admin@123")
        print("  Asset Manager: manager@assetflow.demo   / Manager@123")
        print("  Dept Head:     head@assetflow.demo      / Head@123")
        print("  Employee:      employee@assetflow.demo  / Employee@123")
        return

    # ── Users ──────────────────────────────────────────────────────────────

    admin = User(
        full_name="Alex Admin", email="admin@assetflow.demo",
        password_hash=get_password_hash("Admin@123"),
        role=UserRole.ADMIN, is_active=True,
    )
    manager = User(
        full_name="Morgan Manager", email="manager@assetflow.demo",
        password_hash=get_password_hash("Manager@123"),
        role=UserRole.ASSET_MANAGER, is_active=True,
    )
    head = User(
        full_name="Dana Head", email="head@assetflow.demo",
        password_hash=get_password_hash("Head@123"),
        role=UserRole.DEPARTMENT_HEAD, is_active=True,
    )
    emp = User(
        full_name="Sam Employee", email="employee@assetflow.demo",
        password_hash=get_password_hash("Employee@123"),
        role=UserRole.EMPLOYEE, is_active=True,
    )
    emp2 = User(
        full_name="Jordan Smith", email="jordan@assetflow.demo",
        password_hash=get_password_hash("Employee@123"),
        role=UserRole.EMPLOYEE, is_active=True,
    )
    emp3 = User(
        full_name="Casey Jones", email="casey@assetflow.demo",
        password_hash=get_password_hash("Employee@123"),
        role=UserRole.EMPLOYEE, is_active=True,
    )
    db.add_all([admin, manager, head, emp, emp2, emp3])
    await db.flush()
    print(f"  ✓ {6} users created")

    # ── Departments ────────────────────────────────────────────────────────

    dept_it   = Department(name="IT & Infrastructure",    description="Technology and systems", department_head_id=head.id, is_active=True)
    dept_hr   = Department(name="Human Resources",        description="People operations",      is_active=True)
    dept_fin  = Department(name="Finance",                description="Finance and accounts",   is_active=True)
    dept_ops  = Department(name="Operations",             description="Day-to-day operations",  is_active=True)
    dept_mkt  = Department(name="Marketing",              description="Brand and growth",       is_active=True)
    db.add_all([dept_it, dept_hr, dept_fin, dept_ops, dept_mkt])
    await db.flush()

    # Assign users to departments
    head.department_id = dept_it.id
    emp.department_id  = dept_it.id
    emp2.department_id = dept_hr.id
    emp3.department_id = dept_ops.id
    await db.flush()
    print(f"  ✓ {5} departments created")

    # ── Categories ─────────────────────────────────────────────────────────

    cat_laptop  = AssetCategory(name="Laptops",         description="Portable computers",     is_active=True)
    cat_monitor = AssetCategory(name="Monitors",        description="Display screens",        is_active=True)
    cat_mobile  = AssetCategory(name="Mobile Devices",  description="Phones and tablets",     is_active=True)
    cat_vehicle = AssetCategory(name="Vehicles",        description="Company vehicles",       is_active=True)
    cat_office  = AssetCategory(name="Office Furniture",description="Desks, chairs, cabinets",is_active=True)
    cat_network = AssetCategory(name="Networking",      description="Switches, routers, APs", is_active=True)
    db.add_all([cat_laptop, cat_monitor, cat_mobile, cat_vehicle, cat_office, cat_network])
    await db.flush()
    print(f"  ✓ {6} categories created")

    # ── Assets ─────────────────────────────────────────────────────────────

    assets_data = [
        # Laptops
        ("Dell XPS 15",        "LAP-001", cat_laptop.id,  dept_it.id,   AssetStatus.ALLOCATED,         AssetCondition.GOOD,  False, "IT Room A"),
        ("MacBook Pro 16",     "LAP-002", cat_laptop.id,  dept_it.id,   AssetStatus.AVAILABLE,         AssetCondition.NEW,   False, "IT Room A"),
        ("Lenovo ThinkPad",    "LAP-003", cat_laptop.id,  dept_hr.id,   AssetStatus.ALLOCATED,         AssetCondition.FAIR,  False, "HR Office"),
        ("HP EliteBook",       "LAP-004", cat_laptop.id,  dept_fin.id,  AssetStatus.UNDER_MAINTENANCE, AssetCondition.POOR,  False, "Finance Floor"),
        ("Asus ZenBook",       "LAP-005", cat_laptop.id,  dept_mkt.id,  AssetStatus.AVAILABLE,         AssetCondition.GOOD,  False, "Marketing"),
        # Monitors
        ("LG 27UK850",         "MON-001", cat_monitor.id, dept_it.id,   AssetStatus.AVAILABLE,         AssetCondition.NEW,   True,  "IT Room A"),
        ("Dell U2722D",        "MON-002", cat_monitor.id, dept_it.id,   AssetStatus.ALLOCATED,         AssetCondition.GOOD,  True,  "IT Room A"),
        ("Samsung 4K 32",      "MON-003", cat_monitor.id, dept_fin.id,  AssetStatus.AVAILABLE,         AssetCondition.GOOD,  True,  "Finance Floor"),
        # Mobile
        ("iPhone 15 Pro",      "MOB-001", cat_mobile.id,  dept_ops.id,  AssetStatus.ALLOCATED,         AssetCondition.NEW,   False, "Operations"),
        ("Samsung Galaxy S24", "MOB-002", cat_mobile.id,  dept_mkt.id,  AssetStatus.AVAILABLE,         AssetCondition.GOOD,  False, "Marketing"),
        ("iPad Pro 12.9",      "MOB-003", cat_mobile.id,  dept_it.id,   AssetStatus.AVAILABLE,         AssetCondition.NEW,   True,  "IT Room A"),
        # Vehicles
        ("Toyota Camry 2022",  "VEH-001", cat_vehicle.id, dept_ops.id,  AssetStatus.AVAILABLE,         AssetCondition.GOOD,  True,  "Parking B1"),
        ("Ford Transit Van",   "VEH-002", cat_vehicle.id, dept_ops.id,  AssetStatus.ALLOCATED,         AssetCondition.FAIR,  False, "Parking B2"),
        # Office
        ("Standing Desk A",    "FRN-001", cat_office.id,  dept_it.id,   AssetStatus.ALLOCATED,         AssetCondition.GOOD,  False, "IT Room A"),
        ("Ergonomic Chair",    "FRN-002", cat_office.id,  dept_hr.id,   AssetStatus.AVAILABLE,         AssetCondition.NEW,   False, "HR Office"),
        ("Conference Table",   "FRN-003", cat_office.id,  None,         AssetStatus.AVAILABLE,         AssetCondition.GOOD,  True,  "Boardroom"),
        # Networking
        ("Cisco Switch 48P",   "NET-001", cat_network.id, dept_it.id,   AssetStatus.ALLOCATED,         AssetCondition.GOOD,  False, "Server Room"),
        ("Unifi AP AC Pro",    "NET-002", cat_network.id, dept_it.id,   AssetStatus.AVAILABLE,         AssetCondition.NEW,   False, "Server Room"),
        # Lost/Retired
        ("Old HP Laptop",      "LAP-006", cat_laptop.id,  dept_hr.id,   AssetStatus.RETIRED,           AssetCondition.POOR,  False, "Storage"),
        ("Nokia 3310",         "MOB-004", cat_mobile.id,  dept_ops.id,  AssetStatus.LOST,              AssetCondition.FAIR,  False, "Unknown"),
    ]
    asset_objs = []
    for name, tag, cat, dept, status, cond, shared, loc in assets_data:
        a = Asset(
            name=name, asset_tag=tag, category_id=cat, department_id=dept,
            status=status, condition=cond, is_shared=shared, location=loc,
            is_active=True, created_by=admin.id,
            acquisition_date=days_ago(180).date(),
            acquisition_cost="1500.00",
        )
        db.add(a)
        asset_objs.append(a)
    await db.flush()
    print(f"  ✓ {len(asset_objs)} assets created")

    # Shorthand
    a = {obj.asset_tag: obj for obj in asset_objs}

    # ── Allocations ─────────────────────────────────────────────────────────

    alloc_data = [
        (a["LAP-001"], emp,   manager.id, days_ago(60), days_from_now(30),  AllocationStatus.ACTIVE),
        (a["LAP-003"], emp2,  manager.id, days_ago(90), days_from_now(5),   AllocationStatus.ACTIVE),
        (a["MON-002"], emp,   manager.id, days_ago(60), None,               AllocationStatus.ACTIVE),
        (a["MOB-001"], emp3,  manager.id, days_ago(30), days_from_now(60),  AllocationStatus.ACTIVE),
        (a["VEH-002"], emp3,  admin.id,   days_ago(15), days_from_now(-2),  AllocationStatus.OVERDUE),
        (a["FRN-001"], emp,   admin.id,   days_ago(120),None,               AllocationStatus.ACTIVE),
        (a["NET-001"], head,  admin.id,   days_ago(200),None,               AllocationStatus.ACTIVE),
        (a["LAP-001"], emp,   manager.id, days_ago(200),days_ago(61),       AllocationStatus.RETURNED),
    ]
    for asset, employee, allocated_by, alloc_at, exp_ret, status in alloc_data:
        alloc = AssetAllocation(
            asset_id=asset.id, employee_id=employee.id, allocated_by=allocated_by,
            allocated_at=alloc_at,
            expected_return_date=exp_ret,
            returned_at=days_ago(62).date() if status == AllocationStatus.RETURNED else None,
            status=status,
        )
        db.add(alloc)
    await db.flush()
    print(f"  ✓ 8 allocations created")

    # ── Transfer Requests ─────────────────────────────────────────────────

    tr = TransferRequest(
        asset_id=a["LAP-003"].id, from_employee_id=emp2.id, to_employee_id=emp3.id,
        requested_by=emp2.id, status=TransferStatus.PENDING, remarks="Department transfer",
        requested_at=days_ago(3),
    )
    db.add(tr)
    await db.flush()
    print(f"  ✓ 1 transfer request created")

    # ── Bookings ───────────────────────────────────────────────────────────

    now = utcnow()
    bookings_data = [
        (a["MON-001"], emp,   "Quarterly Review",       "Presentation",   now + timedelta(days=1), now + timedelta(days=1, hours=2)),
        (a["MON-001"], emp2,  "Team Standup",           "Daily meeting",  now + timedelta(days=3), now + timedelta(days=3, hours=1)),
        (a["VEH-001"], head,  "Client Site Visit",      "Client delivery",now + timedelta(days=2), now + timedelta(days=2, hours=4)),
        (a["MOB-003"], emp3,  "Field Inspection",       "Inventory check",now + timedelta(hours=2),now + timedelta(hours=5)),
        (a["FRN-003"], emp,   "All-Hands Meeting",      "Company meeting",now + timedelta(days=7), now + timedelta(days=7, hours=3)),
        (a["MOB-003"], emp2,  "Past Training Session",  None,             days_ago(5),             days_ago(5) + timedelta(hours=2)),
    ]
    for asset, employee, title, purpose, start, end in bookings_data:
        status = BookingStatus.COMPLETED if start < now else (
            BookingStatus.ONGOING if start <= now <= end else BookingStatus.UPCOMING
        )
        b = ResourceBooking(
            asset_id=asset.id, employee_id=employee.id, title=title, purpose=purpose,
            start_datetime=start, end_datetime=end, status=status,
            department_id=employee.department_id,
        )
        db.add(b)
    await db.flush()
    print(f"  ✓ 6 bookings created")

    # ── Maintenance Requests ───────────────────────────────────────────────

    maint_data = [
        (a["LAP-004"], emp2,   "Screen Flickering",    "Display flickers randomly",         MaintenancePriority.HIGH,     MaintenanceStatus.APPROVED,  manager.id),
        (a["VEH-002"], emp3,   "Engine Warning Light", "Check engine warning appeared",     MaintenancePriority.CRITICAL, MaintenanceStatus.IN_PROGRESS,manager.id),
        (a["MOB-004"], emp,    "Device Not Charging",  "Charging port damaged",             MaintenancePriority.MEDIUM,   MaintenanceStatus.RESOLVED,  manager.id),
        (a["NET-001"], head,   "Port Failure",         "Two ports stopped working",         MaintenancePriority.HIGH,     MaintenanceStatus.PENDING,   None),
        (a["FRN-001"], emp,    "Wobbling Leg",         "Desk leg is unstable",             MaintenancePriority.LOW,      MaintenanceStatus.PENDING,   None),
    ]
    for asset, raised_by, title, desc, priority, status, approved_by in maint_data:
        m = MaintenanceRequest(
            asset_id=asset.id, raised_by=raised_by.id, issue_title=title,
            issue_description=desc, priority=priority, status=status,
            approved_by=approved_by,
            approved_at=days_ago(5) if approved_by else None,
            resolved_at=days_ago(2) if status == MaintenanceStatus.RESOLVED else None,
            resolution_notes="Charging port replaced" if status == MaintenanceStatus.RESOLVED else None,
            technician_name="Bob Tech" if status in (MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.RESOLVED) else None,
        )
        db.add(m)
    await db.flush()
    print(f"  ✓ 5 maintenance requests created")

    # ── Audit Cycles ───────────────────────────────────────────────────────

    audit1 = AuditCycle(
        name="Q2 2026 Full Audit", scope_type=AuditScopeType.ALL,
        start_date=days_ago(30).date(), end_date=days_ago(10).date(),
        status=AuditCycleStatus.CLOSED, created_by=admin.id,
        closed_by=admin.id, closed_at=days_ago(10),
    )
    audit2 = AuditCycle(
        name="IT Department Audit", scope_type=AuditScopeType.DEPARTMENT,
        department_id=dept_it.id,
        start_date=days_ago(5).date(), end_date=days_from_now(10),
        status=AuditCycleStatus.IN_PROGRESS, created_by=admin.id,
    )
    db.add_all([audit1, audit2])
    await db.flush()

    # Auditors
    db.add_all([
        AuditAuditor(audit_cycle_id=audit1.id, user_id=manager.id),
        AuditAuditor(audit_cycle_id=audit2.id, user_id=manager.id),
        AuditAuditor(audit_cycle_id=audit2.id, user_id=head.id),
    ])
    await db.flush()

    # Audit records for closed audit
    for asset, v_status in [
        (a["LAP-001"], VerificationStatus.VERIFIED),
        (a["LAP-002"], VerificationStatus.VERIFIED),
        (a["LAP-003"], VerificationStatus.VERIFIED),
        (a["LAP-004"], VerificationStatus.DAMAGED),
        (a["MOB-004"], VerificationStatus.MISSING),
        (a["MON-001"], VerificationStatus.VERIFIED),
        (a["MON-002"], VerificationStatus.VERIFIED),
    ]:
        db.add(AuditRecord(
            audit_cycle_id=audit1.id, asset_id=asset.id,
            auditor_id=manager.id, verification_status=v_status,
            verified_at=days_ago(15),
        ))

    # Records for open audit
    for asset, v_status in [
        (a["NET-001"], VerificationStatus.VERIFIED),
        (a["NET-002"], VerificationStatus.VERIFIED),
        (a["LAP-002"], VerificationStatus.VERIFIED),
    ]:
        db.add(AuditRecord(
            audit_cycle_id=audit2.id, asset_id=asset.id,
            auditor_id=manager.id, verification_status=v_status,
            verified_at=days_ago(2),
        ))
    await db.flush()
    print(f"  ✓ 2 audit cycles with records created")

    # ── Notifications ──────────────────────────────────────────────────────

    notifications = [
        Notification(user_id=emp.id,   title="Asset Allocated",       message=f"Dell XPS 15 ({a['LAP-001'].asset_tag}) has been allocated to you.", type=NotificationType.ASSET_ASSIGNED,       entity_type="asset",      entity_id=a["LAP-001"].id, is_read=False),
        Notification(user_id=emp2.id,  title="Booking Confirmed",     message="Your booking for LG Monitor has been confirmed.",                     type=NotificationType.BOOKING_CONFIRMED,     entity_type="booking",    entity_id=1,               is_read=False),
        Notification(user_id=emp2.id,  title="Maintenance Approved",  message="Your maintenance request for HP EliteBook has been approved.",        type=NotificationType.MAINTENANCE_APPROVED,  entity_type="maintenance",entity_id=1,               is_read=True),
        Notification(user_id=emp3.id,  title="Transfer Rejected",     message="Your transfer request has been rejected.",                            type=NotificationType.TRANSFER_REJECTED,     entity_type="transfer",   entity_id=1,               is_read=False),
        Notification(user_id=head.id,  title="Audit Discrepancy",     message="Missing asset detected in Q2 2026 Full Audit.",                      type=NotificationType.AUDIT_DISCREPANCY,     entity_type="audit",      entity_id=audit1.id,       is_read=False),
        Notification(user_id=emp3.id,  title="Overdue Return",        message=f"Ford Transit Van ({a['VEH-002'].asset_tag}) return is overdue.",      type=NotificationType.OVERDUE_RETURN,        entity_type="allocation", entity_id=1,               is_read=False),
        Notification(user_id=admin.id, title="Maintenance Request",   message="New high-priority maintenance request from IT.",                      type=NotificationType.GENERAL,               entity_type="maintenance",entity_id=4,               is_read=False),
    ]
    db.add_all(notifications)
    await db.flush()
    print(f"  ✓ {len(notifications)} notifications created")

    # ── Activity Logs ──────────────────────────────────────────────────────

    logs = [
        ActivityLog(user_id=admin.id,   action="LOGIN",             entity_type="auth",        description="Admin logged in",                                    ip_address="192.168.1.1"),
        ActivityLog(user_id=admin.id,   action="DEPARTMENT_CREATED",entity_type="department",  entity_id=dept_it.id,   description=f"Department '{dept_it.name}' created"),
        ActivityLog(user_id=admin.id,   action="ASSET_CREATED",     entity_type="asset",       entity_id=a["LAP-001"].id, description=f"Asset '{a['LAP-001'].name}' registered"),
        ActivityLog(user_id=manager.id, action="ASSET_ALLOCATED",   entity_type="allocation",  description=f"Dell XPS 15 allocated to Sam Employee"),
        ActivityLog(user_id=manager.id, action="LOGIN",             entity_type="auth",        description="Asset Manager logged in",                            ip_address="192.168.1.2"),
        ActivityLog(user_id=emp.id,     action="BOOKING_CREATED",   entity_type="booking",     description="Booking created: Quarterly Review"),
        ActivityLog(user_id=manager.id, action="MAINTENANCE_APPROVED",entity_type="maintenance",description="Maintenance request approved: Screen Flickering"),
        ActivityLog(user_id=admin.id,   action="AUDIT_CREATED",     entity_type="audit",       entity_id=audit1.id, description=f"Audit cycle '{audit1.name}' created"),
        ActivityLog(user_id=manager.id, action="ASSET_VERIFIED",    entity_type="audit",       entity_id=audit1.id, description="Dell XPS 15 verified in Q2 2026 Audit"),
        ActivityLog(user_id=admin.id,   action="AUDIT_CLOSED",      entity_type="audit",       entity_id=audit1.id, description=f"Audit cycle '{audit1.name}' closed"),
        ActivityLog(user_id=emp3.id,    action="TRANSFER_REQUESTED",entity_type="transfer",    description="Transfer requested: Lenovo ThinkPad"),
        ActivityLog(user_id=admin.id,   action="CATEGORY_CREATED",  entity_type="category",   entity_id=cat_laptop.id, description=f"Category '{cat_laptop.name}' created"),
    ]
    db.add_all(logs)
    await db.flush()
    print(f"  ✓ {len(logs)} activity logs created")

    await db.commit()
    print("\n✅ Seed complete!")
    print("\nDemo accounts:")
    print("  Admin:         admin@assetflow.demo     / Admin@123")
    print("  Asset Manager: manager@assetflow.demo   / Manager@123")
    print("  Dept Head:     head@assetflow.demo      / Head@123")
    print("  Employee:      employee@assetflow.demo  / Employee@123")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await seed(db)
        except Exception as e:
            await db.rollback()
            print(f"\n❌ Seed failed: {e}")
            import traceback; traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
