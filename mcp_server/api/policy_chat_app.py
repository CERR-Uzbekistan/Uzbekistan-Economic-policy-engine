"""Dedicated FastAPI application for the internal Policy Chat service."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .policy_chat import PolicyChatSettings, create_policy_chat_router


def create_policy_chat_app(
    settings: PolicyChatSettings | None = None,
) -> FastAPI:
    runtime = settings or PolicyChatSettings.from_env()
    app = FastAPI(
        title="Uzbekistan Economic Policy Engine - Policy Chat API",
        version="0.1.0",
    )
    origins = [
        origin.strip()
        for origin in os.getenv(
            "POLICY_CHAT_CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        ).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=(
            r"http://(localhost|127\.0\.0\.1):\d+"
            if runtime.auth_mode == "dev_header"
            else None
        ),
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Content-Type",
            "X-Policy-Chat-User",
            "X-Policy-Chat-Proxy-Secret",
        ],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(create_policy_chat_router(runtime))
    return app


app = create_policy_chat_app()
