# AssetFlow — Enterprise Asset & Resource Management System

> A production-ready, full-stack ERP system for tracking, allocating, maintaining, and auditing organizational assets — built for the hackathon.

---

## Overview
### Database Schema:
<img width="1433" height="1098" alt="Database" src="https://github.com/user-attachments/assets/6090cd84-7192-4ed2-8139-8c468d5fc682" />

AssetFlow gives organizations full visibility and control over every asset they own. From laptops and vehicles to shared conference rooms, AssetFlow tracks the entire asset lifecycle: registration → allocation → maintenance → audit → reporting.
<img width="1919" height="919" alt="Screenshot 2026-07-12 183446" src="https://github.com/user-attachments/assets/fc906018-5175-4b97-9b0d-f90f4c25d065" />
<img width="1919" height="925" alt="Screenshot 2026-07-12 183457" src="https://github.com/user-attachments/assets/cc0c2bf0-0d3c-46e7-835c-8d66184c214a" />
<img width="1919" height="919" alt="Screenshot 2026-07-12 183615" src="https://github.com/user-attachments/assets/8534a0f4-5ee4-44c3-8c52-79a4ed1ce4de" />
<img width="1919" height="915" alt="Screenshot 2026-07-12 183602" src="https://github.com/user-attachments/assets/b32589b6-dd85-44fd-8cd7-c5620cf2c4ab" />
<img width="1919" height="911" alt="Screenshot 2026-07-12 183628" src="https://github.com/user-attachments/assets/1ef4acce-77ef-4bd1-ad7f-c353ff146c97" />


**Live demo accounts (after seeding):**

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@assetflow.demo | Admin@123 |
| Asset Manager | manager@assetflow.demo | Manager@123 |
| Department Head | head@assetflow.demo | Head@123 |
| Employee | employee@assetflow.demo | Employee@123 |

---

## Features

| Module | Capabilities |
|--------|-------------|
| **Authentication** | JWT login/signup, role-based access (Admin, Asset Manager, Dept Head, Employee) |
| **Organization Setup** | Departments, categories, employee directory |
| **Asset Registry** | Full asset lifecycle, status tracking, condition management |
| **Allocations** | Allocate/return assets, transfer requests, overdue tracking |
| **Resource Booking** | Calendar-based booking, conflict detection, booking heatmap |
| **Maintenance** | Raise requests, approve/reject, assign technicians, resolve |
| **Audit Management** | Create audit cycles, assign auditors, verify assets, discrepancy reports |
| **Dashboard** | Role-aware KPI cards, recent activity feed, quick actions |
| **Notifications** | Real-time notification center with mark-read and delete |
| **Activity Logs** | Full audit trail with timeline and table views |
| **Reports & Analytics** | Asset utilization, department allocation, maintenance trends, booking analytics, audit analytics with Recharts |

---

## Architecture

AssetFlow follows **Clean Architecture** principles:

```
Request → Router → Service → Repository → Database
                                        ↑
                               (Pydantic schemas isolate layers)
```

- **Routers** — HTTP boundary only; no business logic
- **Services** — all business rules and orchestration
- **Repositories** — data access layer, abstracts SQLAlchemy
- **Models** — SQLAlchemy ORM definitions
- **Schemas** — Pydantic v2 for request/response validation

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.111+ | REST API framework |
| SQLAlchemy | 2.x | Async ORM |
| Alembic | 1.x | Database migrations |
| PostgreSQL | 15+ | Database |
| Pydantic | v2 | Data validation |
| python-jose | 3.x | JWT tokens |
| bcrypt | 4.x | Password hashing |
| uvicorn | 0.29+ | ASGI server |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| Recharts | 2.x | Data visualizations |

---

## Folder Structure

```
AssetFlow/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # Route handlers (thin HTTP layer)
│   │   ├── core/                # Config, logging
│   │   ├── database/            # Base, session, connection
│   │   ├── dependencies/        # FastAPI DI (auth, db)
│   │   ├── middleware/          # CORS, logging middleware
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── repositories/        # Data access layer
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic layer
│   │   └── utils/               # JWT, password, helpers
│   ├── alembic/                 # Database migration scripts
│   ├── seed.py                  # Demo data seeder
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Button, Card, Table, Modal, Badge, Skeleton, EmptyState
│   │   │   ├── charts/          # ChartCard, StatCard (Recharts wrappers)
│   │   │   ├── Sidebar.tsx      # Role-aware navigation
│   │   │   └── Navbar.tsx       # Top bar with notification badge
│   │   ├── context/             # AuthContext (JWT + user state)
│   │   ├── hooks/               # useDocumentTitle, useDebounce
│   │   ├── layouts/             # MainLayout, AuthLayout
│   │   ├── pages/               # One file per page/module
│   │   ├── routes/              # AppRouter, ProtectedRoute
│   │   ├── services/            # Axios service wrappers
│   │   ├── types/               # Shared TypeScript interfaces
│   │   └── utils/               # cn(), formatDate(), formatDateTime()
│   ├── .env
│   └── vite.config.ts
│
├── docs/
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file (see Environment Variables section)
copy .env.example .env          # Windows
cp .env.example .env            # macOS/Linux

# 5. Run database migrations
python -m alembic upgrade head

# 6. Seed demo data
python seed.py

# 7. Start the server
uvicorn app.main:app --reload --port 8000
```

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env file (see Environment Variables section)
copy .env.example .env          # Windows
cp .env.example .env            # macOS/Linux

# 4. Start dev server
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/assetflow
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=AssetFlow
VITE_APP_VERSION=1.0.0
```

---

## Run Commands

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Start backend dev server |
| `npm run dev` | Start frontend dev server |
| `python -m alembic upgrade head` | Apply database migrations |
| `python -m alembic revision --autogenerate -m "desc"` | Create new migration |
| `python seed.py` | Load demo data |
| `npm run build` | Build frontend for production |
| `npx tsc --noEmit` | TypeScript type check |

---

## API Documentation

Once the backend is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Demo Flows

### Flow 1 — Admin Full Cycle
```
Login as admin → Dashboard (KPIs) → Organization Setup
→ Register Asset → Allocate to Employee → Dashboard (updated KPIs)
```

### Flow 2 — Employee
```
Login as employee → My Bookings → Book Shared Resource
→ Raise Maintenance Request → View Notifications
```

### Flow 3 — Asset Manager
```
Login as manager → Approve Maintenance → Process Return
→ Approve Transfer → View Reports
```

### Flow 4 — Audit Flow
```
Login as admin → Create Audit Cycle → Assign Auditors
→ Verify Assets → View Discrepancy Report → Close Audit → Reports
```

---

## Role-Based Access Control

| Feature | Employee | Dept Head | Asset Manager | Admin |
|---------|----------|-----------|---------------|-------|
| View own assets | ✓ | ✓ | ✓ | ✓ |
| Book resources | ✓ | ✓ | ✓ | ✓ |
| Raise maintenance | ✓ | ✓ | ✓ | ✓ |
| Approve maintenance | | | ✓ | ✓ |
| Allocate assets | | | ✓ | ✓ |
| Organization setup | | | | ✓ |
| Create audits | | | ✓ | ✓ |
| View all activity logs | | | | ✓ |
| Full reports | | | ✓ | ✓ |

---

## Future Scope

- **Mobile App** — React Native companion app
- **Real-time Notifications** — WebSocket push notifications
- **QR Code Scanning** — Scan asset tags for instant lookup
- **Email Alerts** — SMTP integration for overdue/maintenance
- **CSV Import** — Bulk asset import via spreadsheet
- **Asset Photos** — S3/CDN image upload for assets
- **Advanced Reports** — PDF export, scheduled reports
- **Multi-tenant** — Organization-level data isolation
- **SSO Integration** — LDAP/Active Directory support
- **Depreciation Tracking** — Automatic asset value calculation

---

## Contributors

Built with dedication for the hackathon.

- Full-stack architecture and implementation
- Clean Architecture with FastAPI + React
- Professional ERP-grade UI with Tailwind CSS

---

## License

MIT License — see [LICENSE](LICENSE) for details.
