"""Read-only HTTP API package for registry metadata."""

from .app import app, create_app

__all__ = ["app", "create_app"]
