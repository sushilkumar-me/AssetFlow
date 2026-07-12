"""
Centralized logging configuration.
Supports structured JSON logging for production and human-readable text for development.
"""

import logging
import sys
from typing import Any

from app.core.config import settings


class _JsonFormatter(logging.Formatter):
    """Minimal JSON log formatter for structured logging in production."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        log_entry: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_entry["exception"] = traceback.format_exception(*record.exc_info)

        return json.dumps(log_entry)


class _TextFormatter(logging.Formatter):
    """Human-readable formatter for development."""

    _GREY = "\x1b[38;5;246m"
    _BLUE = "\x1b[34m"
    _YELLOW = "\x1b[33m"
    _RED = "\x1b[31m"
    _BOLD_RED = "\x1b[31;1m"
    _RESET = "\x1b[0m"

    LEVEL_COLORS: dict[str, str] = {
        "DEBUG": _GREY,
        "INFO": _BLUE,
        "WARNING": _YELLOW,
        "ERROR": _RED,
        "CRITICAL": _BOLD_RED,
    }

    FMT = "%(asctime)s | {color}%(levelname)-8s{reset} | %(name)s:%(lineno)d | %(message)s"

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelname, "")
        formatter = logging.Formatter(
            self.FMT.format(color=color, reset=self._RESET),
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        return formatter.format(record)


def configure_logging() -> None:
    """
    Configure the root logger based on application settings.
    Call once at application startup.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    if settings.LOG_FORMAT == "json":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(_TextFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    # Remove any previously added handlers to avoid duplicate output
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DATABASE_ECHO else logging.WARNING
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use this instead of logging.getLogger() directly."""
    return logging.getLogger(name)
