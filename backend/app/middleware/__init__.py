# middleware package
from app.middleware.cors import register_cors
from app.middleware.logging import register_request_logging

__all__ = ["register_cors", "register_request_logging"]
