# AssetFlow — Backend

FastAPI-based REST API for the AssetFlow Enterprise Asset & Resource Management System.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.x (async) |
| Migrations | Alembic 1.14 |
| Database | PostgreSQL (via asyncpg) |
| Validation | Pydantic v2 |
| Settings | pydantic-settings |
| Auth | python-jose + passlib (prepared) |
| Server | Uvicorn |

---

## Folder Structure

```
backend/
├── alembic/                  # Migration scripts
│   ├── versions/             # Auto-generated revision files
│   ├── env.py                # Async migration environment
│   └── script.py.mako        # Migration file template
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/    # One file per module (auth, assets, …)
│   │       └── router.py     # Aggregates all v1 endpoints
│   ├── core/
│   │   ├── config.py         # Centralized Settings (pydantic-settings)
│   │   └── logging.py        # JSON / text log formatters
│   ├── database/
│   │   ├── base.py           # DeclarativeBase + mixins
│   │   └── session.py        # Async engine, session factory, get_db()
│   ├── dependencies/
│   │   ├── auth.py           # JWT dependency stubs
│   │   └── database.py       # Re-exports get_db
│   ├── middleware/
│   │   ├── cors.py           # CORS registration helper
│   │   └── logging.py        # Per-request logging middleware
│   ├── models/               # SQLAlchemy ORM models (to be added)
│   ├── repositories/         # Data access layer (to be added)
│   ├── routers/              # Alternative router location (to be added)
│   ├── schemas/              # Pydantic request/response schemas (to be added)
│   ├── services/             # Business logic layer (to be added)
│   ├── utils/                # Shared utility functions (to be added)
│   └── main.py               # Application factory + entry point
├── .env                      # Local environment variables (git-ignored)
├── .env.example              # Template for environment variables
├── alembic.ini               # Alembic configuration
└── requirements.txt          # Pinned Python dependencies
```

---

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- (Optional) `virtualenv` or `pyenv`

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

Edit `.env` and set your `DATABASE_URL` and `SECRET_KEY`.

### 4. Create the database

```sql
CREATE DATABASE assetflow;
```

### 5. Run Alembic migrations

```bash
alembic upgrade head
```

### 6. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## API Documentation

| URL | Description |
|---|---|
| `http://localhost:8000/api/docs` | Swagger UI |
| `http://localhost:8000/api/redoc` | ReDoc |
| `http://localhost:8000/api/openapi.json` | Raw OpenAPI schema |

---

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Liveness check |
| GET | `/api/v1/auth` | Auth placeholder |
| GET | `/api/v1/assets` | Assets placeholder |
| GET | `/api/v1/employees` | Employees placeholder |
| … | … | 9 more module placeholders |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `AssetFlow` | Application name |
| `DEBUG` | `false` | Enable debug mode |
| `ENVIRONMENT` | `development` | Runtime environment |
| `DATABASE_URL` | — | PostgreSQL async connection string |
| `DATABASE_ECHO` | `false` | Log all SQL statements |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `SECRET_KEY` | — | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_FORMAT` | `json` | `json` or `text` |

---

## Creating a New Migration

```bash
# Auto-generate from model changes
alembic revision --autogenerate -m "describe your change"

# Apply
alembic upgrade head

# Rollback one step
alembic downgrade -1
```
