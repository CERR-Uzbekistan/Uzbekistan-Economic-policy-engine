"""FastAPI application for read-only backend registry API v1."""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .registry import RegistryArtifactLoadError, build_registry_response
from .schemas import RegistryArtifactsResponse


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

    @app.get("/api/v1/registry/artifacts", response_model=RegistryArtifactsResponse)
    def get_registry_artifacts() -> RegistryArtifactsResponse:
        try:
            return build_registry_response()
        except RegistryArtifactLoadError as error:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "registry_artifact_unavailable",
                    "artifact_id": error.artifact_id,
                    "message": str(error),
                },
            ) from error

    return app


app = create_app()
