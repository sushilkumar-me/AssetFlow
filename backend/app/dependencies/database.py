"""
Database-related FastAPI dependencies.
Re-exported here so routers import from a single, stable location.
"""

from app.database.session import get_db

__all__ = ["get_db"]
