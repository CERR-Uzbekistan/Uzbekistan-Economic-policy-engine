"""FastAPI application for read-only backend registry API v1."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .registry import build_registry_response


def create_app() -> FastAPI:
    app = FastAPI(
        title="Uzbekistan Economic Policy Engine Registry API",
        version="0.1.0",
    )

    origins = [
        origin.strip()
        for origin in os.getenv(
            "REGISTRY_API_CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5180,http://localhost:5180",
        ).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
    )

    @app.get("/api/v1/registry/artifacts")
    def get_registry_artifacts() -> dict[str, object]:
        return build_registry_response()

    return app


app = create_app()
