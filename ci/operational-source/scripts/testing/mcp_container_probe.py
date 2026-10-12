"""Protocol checks inside an isolated MCP container; synthetic credentials only."""
import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


def payload(result):
    return result.structuredContent or json.loads(result.content[0].text)


async def check_session(session, *, execution=False):
    await session.initialize()
    tools = await session.list_tools()
    assert len(tools.tools) == 20
    models = payload(await session.call_tool("list_models", {}))
    assert "model_manifest" in models
    for name, inputs in [
        ("update_tracker_data", {}),
        ("model_execute", {"variant_id": "fpp-reduced-form-v0", "inputs": {},
                           "intent": "diagnostic"}),
    ]:
        value = payload(await session.call_tool(name, inputs))
        if execution and name == "model_execute":
            assert "model_not_ready" in json.dumps(value), value
        else:
            assert value["error"]["code"] == "permission_denied", value
    return {"initialize_discover_read": True, "tools": len(tools.tools),
            "mutation_denied": True, "execution_permission": execution,
            "blocked_model_stays_blocked": execution}


async def http_probe(authenticated):
    assert os.getuid() == 10001
    for name in [".env", "data/private-container-fixture.json"]:
        assert not (Path("/app/mcp_server") / name).exists()
    assert not Path("/app/shared/private-container-fixture.txt").exists()
    assert not Path("/app/apps/policy-ui/src").exists()
    try:
        Path("/app/shared/should-not-write").write_text("synthetic")
    except PermissionError:
        pass
    except OSError as error:
        assert error.errno == 30
    else:
        raise AssertionError("shared source was writable")
    url = "http://127.0.0.1:8000/mcp"
    token = sys.stdin.read().strip() if authenticated else None
    async with httpx.AsyncClient() as client:
        deadline = time.monotonic() + 15
        while True:
            try:
                response = await client.post(url, json={}, timeout=1)
                break
            except httpx.TransportError:
                if time.monotonic() >= deadline:
                    raise
                await asyncio.sleep(0.1)
        if authenticated:
            assert response.status_code == 401
            assert (await client.post(url, headers={"Authorization": "Bearer invalid"},
                              json={}, timeout=3)).status_code == 401
            path = Path("/run/mcp-config/tokens.json")
            assert path.stat().st_uid == 10001 and path.stat().st_mode & 0o077 == 0
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        assert (await client.post(url, headers={**headers, "Origin": "https://evil.invalid"},
                          json={}, timeout=3)).status_code == 403
        assert (await client.post(url, headers={**headers, "Host": "evil.invalid"},
                          json={}, timeout=3)).status_code == 421
    async with (
        httpx.AsyncClient(headers=headers, timeout=10) as client,
        streamable_http_client(url, http_client=client) as (read, write, _),
        ClientSession(read, write) as session,
    ):
        result = await check_session(session)
    return {**result, "non_root_uid": os.getuid(), "bearer_required": authenticated,
            "bad_host_origin_rejected": True, "private_token_file": authenticated,
            "read_only_sources": True, "private_fixtures_excluded": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["anonymous", "bearer"])
    args = parser.parse_args()
    print(json.dumps(asyncio.run(http_probe(args.mode == "bearer"))))
