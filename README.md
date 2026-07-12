# AssetFlow

Enterprise Asset & Resource Management System — a full-stack monorepo built with FastAPI and React.

---

## Overview

AssetFlow is a production-ready foundation for managing company assets, employees, departments, allocations, bookings, maintenance, audits, and more. The project follows Clean Architecture principles with a clear separation between the API layer, business logic, and data access.

---

## Tech Stack

### Backend
| | |
|---|---|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.x (async) |
| Migrations | Alembic 1.14 |
| Database | PostgreSQL (asyncpg driver) |
| Validation | Pydantic v2 |
| Settings | pydantic-settings |
| Auth | python-jose + passlib (prepared, not active) |
| Server | Uvicorn |

### Frontend
| | |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| HTTP client | Axios |

---

## Folder Structure

```
AssetFlow/
├── backend/
│   ├── alembic/                  # Database migrations
│   ├── app/
│   │   ├── api/v1/endpoints/     # One router per module
│   │   ├── core/                 # Config & logging
│   │   ├── database/             # Engine, session, Base model
│   │   ├── dependencies/         # FastAPI dependency injection
│   │   ├── middleware/           # CORS, request logging
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── repositories/         # Data access layer
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic
│   │   ├── utils/                # Shared utilities
│   │   └── main.py               # App factory + entry point
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── assets/               # Global CSS
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React context providers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── layouts/              # MainLayout, AuthLayout
│   │   ├── pages/                # One file per route
│   │   ├── routes/               # AppRouter
│   │   ├── services/             # Axios instance + service modules
│   │   ├── types/                # Shared TypeScript types
│   │   ├── utils/                # Helper functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── docs/                         # Architecture docs (to be added)
├── .gitignore
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

---

### Backend

```bash
# 1. Create and activate a virtual environment
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
# Edit .env — set DATABASE_URL and SECRET_KEY

# 4. Create the database
# In psql:  CREATE DATABASE assetflow;

# 5. Run migrations
alembic upgrade head

# 6. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux

# 3. Start the dev server
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `AssetFlow` | Application name |
| `DEBUG` | `false` | Enable debug mode |
| `ENVIRONMENT` | `development` | Runtime environment |
| `DATABASE_URL` | — | PostgreSQL async connection string |
| `DATABASE_ECHO` | `false` | Log all SQL statements |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |
| `SECRET_KEY` | — | JWT signing secret (min 32 chars) |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_FORMAT` | `json` | `json` or `text` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_APP_NAME` | Application display name |
| `VITE_APP_VERSION` | Application version |
| `VITE_API_BASE_URL` | Backend API base URL |

---

## API

| URL | Description |
|---|---|
| `GET /api/v1/health` | Health check |
| `http://localhost:8000/api/docs` | Swagger UI |
| `http://localhost:8000/api/redoc` | ReDoc |

---

## Modules

| Module | Backend router | Frontend page | Status |
|---|---|---|---|
| Auth | `/api/v1/auth` | `/login` | Placeholder |
| Assets | `/api/v1/assets` | `/assets` | Placeholder |
| Employees | `/api/v1/employees` | `/employees` | Placeholder |
| Departments | `/api/v1/departments` | `/departments` | Placeholder |
| Categories | `/api/v1/categories` | `/categories` | Placeholder |
| Allocations | `/api/v1/allocations` | `/allocations` | Placeholder |
| Bookings | `/api/v1/bookings` | `/bookings` | Placeholder |
| Maintenance | `/api/v1/maintenance` | `/maintenance` | Placeholder |
| Audits | `/api/v1/audits` | `/audits` | Placeholder |
| Reports | `/api/v1/reports` | `/reports` | Placeholder |
| Notifications | `/api/v1/notifications` | `/notifications` | Placeholder |
| Activity Logs | `/api/v1/activity-logs` | `/activity-logs` | Placeholder |

---

## Code Quality

- PEP 8 + type hints throughout the Python codebase
- Strict TypeScript (`strict: true`) on the frontend
- Clean Architecture — API → Service → Repository → Model layers
- SOLID principles and dependency injection via FastAPI `Depends()`
- No duplicate code — shared utilities, base classes, and mixins
- ESLint-compatible TypeScript with meaningful, descriptive naming
