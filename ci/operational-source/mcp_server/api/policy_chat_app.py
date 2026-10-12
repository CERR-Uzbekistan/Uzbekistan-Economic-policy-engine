"""Dedicated FastAPI application for the internal Policy Chat service."""

from __future__ import annotations

import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .policy_chat_readiness import validate_manifest
from models.readiness import load_manifest

from .policy_chat import (
    CAPABILITY_VERSION,
    DATA_DIR,
    PolicyChatSettings,
    create_policy_chat_router,
)
from .policy_chat_runners import EngineModelRunner
from .policy_chat_store import PolicyChatStore, ExecutionLimit


class UnavailableStore:
    """Keep liveness inspectable without falling back to ephemeral storage."""
    durable = False

    def __init__(self, code):
        self.code = code

    def health(self):
        raise ValueError(self.code)

    def close(self):
        pass

    def __getattr__(self, name):
        raise HTTPException(503, detail={"code": "storage_unavailable"})


def create_policy_chat_app(
    settings: PolicyChatSettings | None = None,
) -> FastAPI:
    runtime = settings or PolicyChatSettings.from_env()
    startup_storage_error = None
    try:
        state = PolicyChatStore(runtime.state_path)
    except (OSError, sqlite3.Error, ValueError) as error:
        startup_storage_error = "storage_schema_incompatible" if str(error) == "storage_schema_incompatible" else "storage_unavailable"
        state = UnavailableStore(startup_storage_error)
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
    @app.exception_handler(ExecutionLimit)
    async def capacity_error(request, error):
        return JSONResponse(status_code=429, content={"detail": error.detail})

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
        reasons = []
        def reason(code):
            reasons.append({"code": code, "scope": "service", "blocking": True})
        if not runtime.enabled:
            reason("policy_chat_disabled")
        if runtime.auth_mode not in ("dev_header", "trusted_proxy"):
            reason("identity_not_configured")
        if runtime.auth_mode == "trusted_proxy" and not runtime.proxy_secret:
            reason("proxy_secret_not_configured")
        if runtime.state_path in ("", ":memory:") and not (
                runtime.auth_mode == "dev_header" and runtime.allow_in_memory_state):
            reason("in_memory_state_not_allowed")
        if not runtime.enabled_models:
            reason("no_models_enabled")
        storage = {"status": "unavailable"}
        try:
            storage = {"status": "available", **state.health()}
        except (OSError, sqlite3.Error, ValueError, RuntimeError) as error:
            reason(startup_storage_error or ("storage_schema_incompatible" if str(error) == "storage_schema_incompatible" else "storage_unavailable"))
        try:
            validate_manifest(load_manifest())
        except (OSError, ValueError, TypeError):
            reason("manifest_unavailable_or_incompatible")
        assessments = {model: runner.readiness(model) for model in runtime.enabled_models}
        # Public dependency status includes identity/qualification but no artifact paths.
        models = {model: {key: item[key] for key in (
            "variant", "status", "operational_availability", "qualification", "disclosures")}
            | {"approval": {"status": item["approval"].get("status", "unavailable"),
                            "authoritative": item["approval"].get("authoritative", False),
                            "diagnostic": item["approval"].get("diagnostic", False),
                            "signed_record_present": bool(item["approval"].get("signed_record"))}}
            | {"reasons": [{"code": r["code"], "blocking": r["blocking"]} for r in item["reasons"]]}
            for model, item in assessments.items()}
        executable = [model for model, item in assessments.items()
                      if item["status"] == "qualified" and item["operational_availability"] == "available"]
        if not executable:
            reason("no_models_ready")
        degraded = len(executable) != len(runtime.enabled_models)
        payload = {"status": "not_ready" if reasons else "degraded" if degraded else "ready",
                   "capability_version": CAPABILITY_VERSION,
                   "enabled_models": list(runtime.enabled_models), "storage": storage,
                   "execution_mode": "qualified_diagnostic", "model_readiness": models,
                   "reasons": reasons}
        if reasons:
            return JSONResponse(status_code=503, content={"detail": {"code": reasons[0]["code"], **payload}})
        return payload

    app.include_router(create_policy_chat_router(runtime, state, runner))
    return app


app = create_policy_chat_app()
