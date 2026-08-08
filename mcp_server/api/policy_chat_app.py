"""Dedicated FastAPI application for the internal Policy Chat service."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .policy_chat import (
    CAPABILITY_VERSION,
    DATA_DIR,
    PolicyChatSettings,
    create_policy_chat_router,
)
from .policy_chat_runners import EngineModelRunner
from .policy_chat_store import PolicyChatStore


def create_policy_chat_app(
    settings: PolicyChatSettings | None = None,
) -> FastAPI:
    runtime = settings or PolicyChatSettings.from_env()
    state = PolicyChatStore(runtime.state_path)
    runner = EngineModelRunner(DATA_DIR)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        state.close()

    app = FastAPI(
        title="Uzbekistan Economic Policy Engine - Policy Chat API",
        version="0.2.0",
        lifespan=lifespan,
    )
    default_origins = (
        "http://127.0.0.1:5173,http://localhost:5173" if runtime.auth_mode == "dev_header" else ""
    )
    origins = [
        origin.strip()
        for origin in os.getenv("POLICY_CHAT_CORS_ORIGINS", default_origins).split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=(
            r"http://(localhost|127\.0\.0\.1):\d+" if runtime.auth_mode == "dev_header" else None
        ),
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Content-Type",
            "X-Policy-Chat-User",
            "X-Policy-Chat-Proxy-Secret",
        ],
    )

    app.state.policy_chat_settings = runtime
    app.state.policy_chat_store = state
    app.state.policy_chat_runner = runner

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    def ready() -> dict[str, object]:
        if not runtime.enabled:
            raise HTTPException(
                status_code=503,
                detail={"code": "policy_chat_disabled"},
            )
        if runtime.auth_mode == "disabled":
            raise HTTPException(
                status_code=503,
                detail={"code": "identity_not_configured"},
            )
        if runtime.auth_mode == "trusted_proxy" and not runtime.proxy_secret:
            raise HTTPException(
                status_code=503,
                detail={"code": "proxy_secret_not_configured"},
            )
        if not runtime.enabled_models:
            raise HTTPException(
                status_code=503,
                detail={"code": "no_models_enabled"},
            )
        storage = state.health()
        return {
            "status": "ready",
            "capability_version": CAPABILITY_VERSION,
            "enabled_models": list(runtime.enabled_models),
            "storage": storage,
        }

    app.include_router(create_policy_chat_router(runtime, state, runner))
    return app


app = create_policy_chat_app()
