#!/usr/bin/env python3
"""Authenticated internal-staging smoke check for Policy Chat."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any
from uuid import uuid4


def request(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any]]:
    encoded = json.dumps(body).encode() if body is not None else None
    outgoing = {"Accept": "application/json", **(headers or {})}
    if encoded is not None:
        outgoing["Content-Type"] = "application/json"
    operation = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=encoded,
        headers=outgoing,
        method=method,
    )
    try:
        with urllib.request.urlopen(operation, timeout=15) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        payload = json.loads(error.read().decode())
        return error.code, payload


def require(status: int, expected: int, label: str) -> None:
    if status != expected:
        raise RuntimeError(f"{label}: expected HTTP {expected}, received {status}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True, help="Private Policy Chat service URL")
    parser.add_argument("--user", required=True, help="Dedicated smoke-test identity")
    parser.add_argument(
        "--execute-qpm",
        action="store_true",
        help="Confirm and run a bounded 1pp QPM smoke scenario",
    )
    args = parser.parse_args()
    proxy_secret = os.getenv("POLICY_CHAT_PROXY_SECRET", "")
    if not proxy_secret:
        parser.error("POLICY_CHAT_PROXY_SECRET must be supplied through the environment")

    status, _ = request(args.base_url, "/health")
    require(status, 200, "liveness")
    status, readiness = request(args.base_url, "/ready")
    require(status, 200, "readiness")
    status, _ = request(args.base_url, "/api/v1/policy-chat/capabilities")
    require(status, 401, "unauthenticated boundary")

    headers = {
        "X-Policy-Chat-User": args.user,
        "X-Policy-Chat-Proxy-Secret": proxy_secret,
    }
    status, capabilities = request(
        args.base_url,
        "/api/v1/policy-chat/capabilities",
        headers=headers,
    )
    require(status, 200, "authenticated capabilities")
    model_ids = {item["model_id"] for item in capabilities.get("models", [])}
    if not model_ids or model_ids - {"qpm", "dfm", "io"}:
        raise RuntimeError(f"unexpected capability set: {sorted(model_ids)}")

    run_id = None
    if args.execute_qpm:
        status, proposal = request(
            args.base_url,
            "/api/v1/policy-chat/proposals",
            method="POST",
            headers=headers,
            body={
                "message": "Raise the policy rate by 1pp for 8 quarters",
                "locale": "en",
                "client_turn_id": f"smoke-turn-{uuid4()}",
            },
        )
        require(status, 200, "QPM proposal")
        status, run = request(
            args.base_url,
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            method="POST",
            headers=headers,
            body={
                "proposal_hash": proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": f"smoke-run-{uuid4()}",
            },
        )
        require(status, 200, "QPM execution")
        run_id = run["run_id"]

    print(
        json.dumps(
            {
                "status": "ok",
                "capability_version": readiness["capability_version"],
                "models": sorted(model_ids),
                "qpm_run_id": run_id,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
