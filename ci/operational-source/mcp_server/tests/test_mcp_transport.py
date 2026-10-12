"""Actual MCP lifecycle and fail-closed invocation permissions; loopback only."""
import asyncio
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamable_http_client
from mcp.server.auth.provider import AccessToken

sys.path.insert(0, str(Path(__file__).parent.parent))
from mcp_security import (AuthorizedFastMCP, MCPConfiguration, ConfigurationError,
                          READ, EXECUTE, MUTATE, READ_TOOLS, MODEL_TOOLS, MUTATION_TOOLS)
from tools.registry import register_tools

ROOT = Path(__file__).parent.parent


def environment(**values):
    env = {key: value for key, value in os.environ.items() if not key.startswith("MCP_")}
    return {**env, "MCP_HOST": "127.0.0.1", **values}


def token_configuration(tmp_path, scopes=(READ,), *, transport="http"):
    token = "test-secret-only-not-a-production-token"
    resource = "http://127.0.0.1:8000/mcp"
    path = tmp_path / "tokens.json"
    path.write_text(json.dumps([{
        "token_sha256": hashlib.sha256(token.encode()).hexdigest(), "client_id": "test-owner",
        "scopes": list(scopes), "expires_at": int(time.time()) + 600, "resource": resource,
    }]), encoding="utf-8")
    return token, {"MCP_TRANSPORT": transport, "MCP_AUTH_MODE": "bearer", "MCP_TOKEN_FILE": str(path),
                   "MCP_AUTH_ISSUER": "http://127.0.0.1:9000", "MCP_AUTH_RESOURCE": resource}


@pytest.mark.parametrize("extra", [
    {}, {"MCP_ALLOW_REMOTE": "true"},
    {"MCP_ALLOW_REMOTE": "true", "MCP_AUTH_MODE": "bearer"},
])
def test_remote_configuration_fails_closed(extra):
    with pytest.raises(ConfigurationError):
        MCPConfiguration.from_env({"MCP_TRANSPORT": "http", "MCP_HOST": "0.0.0.0", **extra})


def test_supported_api_and_defaults():
    config = MCPConfiguration.from_env({"MCP_TRANSPORT": "http"})
    server = AuthorizedFastMCP(config)
    assert server.settings.host == "127.0.0.1"
    assert server.settings.stateless_http
    assert server.settings.transport_security.enable_dns_rebinding_protection


def payload(result):
    if isinstance(result, dict):
        return result
    if isinstance(result, list):
        return json.loads(result[0].text)
    return result.structuredContent or json.loads(result.content[0].text)


def test_invocation_checks_permissions_before_function(tmp_path):
    asyncio.run(invocation_checks(tmp_path))


async def invocation_checks(tmp_path):
    _, env = token_configuration(tmp_path)
    server = AuthorizedFastMCP(MCPConfiguration.from_env(env))
    register_tools(server, lambda: None, lambda: None, lambda: None)
    names = {tool.name for tool in await server.list_tools()}
    assert names == READ_TOOLS | MODEL_TOOLS | MUTATION_TOOLS
    for tool in MODEL_TOOLS | MUTATION_TOOLS:
        with (patch("mcp_security.get_access_token", return_value=AccessToken(token="test", client_id="owner", scopes=[READ])),
              patch.object(server._tool_manager, "call_tool", new_callable=AsyncMock) as kernel):
            result = await server.call_tool(tool, {})
            kernel.assert_not_called()
        assert result["error"]["code"] == "permission_denied"
    with patch("mcp_security.get_access_token", return_value=None):
        assert (await server.call_tool("list_models", {}))["error"]["code"] == "permission_denied"
    with patch("mcp_security.get_access_token", return_value=AccessToken(token="test", client_id="owner", scopes=[READ, EXECUTE])):
        result = await server.call_tool("model_execute", {"variant_id": "fpp-reduced-form-v0", "inputs": {}, "intent": "diagnostic"})
        assert "model_not_ready" in json.dumps(payload(result))
        assert (await server.call_tool("update_tracker_data", {}))["error"]["code"] == "permission_denied"


def test_authorized_permissions_are_independent(tmp_path):
    _, env = token_configuration(tmp_path)
    server = AuthorizedFastMCP(MCPConfiguration.from_env(env))
    async def check():
        for name, scope in (("model_execute", EXECUTE), ("update_tracker_data", MUTATE)):
            with (patch("mcp_security.get_access_token", return_value=AccessToken(token="test", client_id="owner", scopes=[READ, scope])),
                  patch.object(server._tool_manager, "call_tool", new_callable=AsyncMock, return_value={"ok": True}) as kernel):
                assert await server.call_tool(name, {}) == {"ok": True}
                kernel.assert_awaited_once()
    asyncio.run(check())


@pytest.mark.parametrize("defect", ["expired", "unknown_scope", "wrong_resource", "plaintext", "duplicate"])
def test_bad_token_configuration_rejected(tmp_path, defect):
    _, env = token_configuration(tmp_path)
    path = Path(env["MCP_TOKEN_FILE"])
    rows = json.loads(path.read_text())
    if defect == "expired":
        rows[0]["expires_at"] = 1
    elif defect == "unknown_scope":
        rows[0]["scopes"].append("admin")
    elif defect == "wrong_resource":
        rows[0]["resource"] = "https://other.invalid/mcp"
    elif defect == "plaintext":
        rows[0]["token"] = "secret"
    else:
        rows.append(rows[0])
    path.write_text(json.dumps(rows))
    with pytest.raises(ConfigurationError, match="invalid_token_configuration"):
        MCPConfiguration.from_env(env)


def test_remote_requirements_validated_without_opening_listener(tmp_path):
    _, env = token_configuration(tmp_path)
    path = Path(env["MCP_TOKEN_FILE"])
    rows = json.loads(path.read_text())
    rows[0]["resource"] = "https://mcp.example.org/mcp"
    path.write_text(json.dumps(rows))
    env.update({"MCP_HOST": "0.0.0.0", "MCP_ALLOW_REMOTE": "true",
        "MCP_AUTH_ISSUER": "https://auth.example.org", "MCP_AUTH_RESOURCE": rows[0]["resource"],
        "MCP_ALLOWED_HOSTS": "mcp.example.org", "MCP_ALLOWED_ORIGINS": "https://client.example.org"})
    with pytest.raises(ConfigurationError):
        MCPConfiguration.from_env(env)
    env["MCP_TLS_TERMINATED_BY_PROXY"] = "true"
    assert MCPConfiguration.from_env(env).host == "0.0.0.0"
    for field, value in (("MCP_ALLOWED_HOSTS", "*"), ("MCP_ALLOWED_ORIGINS", "https://*.example.org"),
                         ("MCP_AUTH_ISSUER", "http://auth.example.org")):
        with pytest.raises(ConfigurationError):
            MCPConfiguration.from_env({**env, field: value})


def test_tool_errors_do_not_disclose_credentials_or_inputs(caplog):
    from tools.literature import fetch_papers, curate_papers
    from tools.reforms import fetch_reforms, categorize_reform
    secret = "private-input-and-credential"
    client = AsyncMock()
    client.__aenter__.return_value = client
    client.get.side_effect = RuntimeError(secret)
    client.post.side_effect = RuntimeError(secret)
    async def check():
        with patch("httpx.AsyncClient", return_value=client):
            results = [await fetch_papers(model_id="qpm", keywords=secret, max_results=5),
                await fetch_reforms(source="cbu", limit=1),
                await curate_papers(candidates=[{"title": "fixture"}], model_id="qpm", api_key=secret),
                await categorize_reform(raw_text="Fixture policy document text for classification", api_key=secret)]
            assert secret not in json.dumps(results)
    asyncio.run(check())
    assert secret not in caplog.text


def test_anonymous_and_stdio_mutation_are_denied():
    for transport in ("http", "stdio"):
        server = AuthorizedFastMCP(MCPConfiguration.from_env({"MCP_TRANSPORT": transport}))
        result = asyncio.run(server.call_tool("save_research_article", {}))
        assert result["error"]["required_scope"] == MUTATE


async def protocol_lifecycle(url, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(headers=headers, timeout=10) as client:
        async with streamable_http_client(url, http_client=client) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                assert "list_models" in {tool.name for tool in tools.tools}
                result = await session.call_tool("list_models", {})
                assert not result.isError and "model_manifest" in payload(result)
                for tool in ("update_tracker_data", "qpm_impulse_response"):
                    denied = await session.call_tool(tool, {})
                    assert payload(denied)["error"]["code"] == "permission_denied"


@pytest.mark.parametrize("authenticated", [False, True])
def test_real_http_lifecycle(tmp_path, authenticated):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}/mcp"
    token = None
    values = {"MCP_TRANSPORT": "http", "MCP_PORT": str(port)}
    if authenticated:
        token, auth = token_configuration(tmp_path)
        rows = json.loads(Path(auth["MCP_TOKEN_FILE"]).read_text())
        rows[0]["resource"] = url
        Path(auth["MCP_TOKEN_FILE"]).write_text(json.dumps(rows))
        values.update({**auth, "MCP_AUTH_RESOURCE": url})
    log = tmp_path / "server.log"
    with log.open("w", encoding="utf-8") as stderr:
        process = subprocess.Popen([sys.executable, str(ROOT / "main.py")], cwd=ROOT,
            env=environment(**values), stdout=stderr, stderr=stderr,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                assert process.poll() is None, "MCP startup exited unexpectedly"
                try:
                    with socket.create_connection(("127.0.0.1", port), timeout=.2):
                        break
                except OSError:
                    time.sleep(.05)
            else:
                pytest.fail("MCP did not listen before deadline")
            if authenticated:
                response = httpx.post(url, json={}, timeout=5)
                assert response.status_code == 401
                response = httpx.post(url, headers={"Authorization": "Bearer invalid"}, json={}, timeout=5)
                assert response.status_code == 401
            response = httpx.post(url, headers={"Origin": "https://evil.invalid", **({"Authorization": f"Bearer {token}"} if token else {})}, json={}, timeout=5)
            assert response.status_code == 403
            asyncio.run(protocol_lifecycle(url, token))
        finally:
            if os.name == "nt" and process.poll() is None:
                # venv python.exe may launch a child interpreter on Windows.
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW, check=False)
            elif process.poll() is None:
                process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
    assert process.poll() is not None
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        with socket.socket() as sock:
            sock.settimeout(.2)
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                break
        time.sleep(.05)
    else:
        pytest.fail("MCP listener remained after process-tree cleanup")
    assert token is None or token not in log.read_text(encoding="utf-8")


def test_real_stdio_lifecycle():
    asyncio.run(stdio_lifecycle())


async def stdio_lifecycle():
    parameters = StdioServerParameters(command=sys.executable, args=[str(ROOT / "main.py")],
        cwd=str(ROOT), env=environment(MCP_TRANSPORT="stdio"))
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            assert (await session.list_tools()).tools
            result = await session.call_tool("list_models", {})
            assert "model_manifest" in payload(result)
            denied = await session.call_tool("update_tracker_data", {})
            assert payload(denied)["error"]["code"] == "permission_denied"
