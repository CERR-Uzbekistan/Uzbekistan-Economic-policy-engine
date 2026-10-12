"""Fail-closed MCP transport configuration and invocation authorization."""
from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.provider import AccessToken
from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

READ = "policy:read"
EXECUTE = "policy:execute"
MUTATE = "policy:mutate"
SCOPES = {READ, EXECUTE, MUTATE}
READ_TOOLS = {"list_models", "io_sector_info", "pe_trade_overview", "fetch_academic_papers",
              "fetch_policy_reforms"}
MODEL_TOOLS = {"model_execute", "qpm_impulse_response", "qpm_baseline_forecast", "cge_simulate",
               "fpp_project", "io_demand_shock", "pe_trade_impact", "dfm_nowcast",
               "dfm_kalman_update", "scenario_compare", "curate_academic_papers",
               "categorize_policy_reform"}
MUTATION_TOOLS = {"update_literature_data", "update_tracker_data", "save_research_article"}


class ConfigurationError(ValueError):
    """Messages contain stable codes only, never configuration values or credentials."""


def _url(value, *, https=False, origin=False):
    try:
        parsed = urlsplit(value)
    except ValueError:
        raise ConfigurationError("invalid_security_url") from None
    if (parsed.scheme not in ({"https"} if https else {"http", "https"}) or not parsed.hostname
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or "*" in value or (origin and parsed.path not in ("", "/"))):
        raise ConfigurationError("invalid_security_url")
    return value.rstrip("/")


@dataclass(frozen=True)
class MCPConfiguration:
    transport: str = "stdio"
    host: str = "127.0.0.1"
    port: int = 8000
    auth_mode: str = "none"
    issuer: str | None = None
    resource: str | None = None
    allowed_hosts: tuple[str, ...] = ()
    allowed_origins: tuple[str, ...] = ()
    tokens: tuple[dict, ...] = field(default=(), repr=False)
    stdio_scopes: frozenset[str] = frozenset({READ, EXECUTE})

    @classmethod
    def from_env(cls, env=None):
        env = os.environ if env is None else env
        transport = env.get("MCP_TRANSPORT", "stdio")
        if transport not in {"stdio", "http"}:
            raise ConfigurationError("unsupported_transport")
        host = env.get("MCP_HOST", "127.0.0.1")
        try:
            loopback = host == "localhost" or ipaddress.ip_address(host).is_loopback
        except ValueError:
            loopback = False
        try:
            port = int(env.get("MCP_PORT", "8000"))
        except ValueError:
            raise ConfigurationError("invalid_port") from None
        if not 1 <= port <= 65535:
            raise ConfigurationError("invalid_port")
        scopes = frozenset(env.get("MCP_STDIO_SCOPES", f"{READ},{EXECUTE}").split(","))
        if not scopes <= SCOPES or READ not in scopes:
            raise ConfigurationError("invalid_stdio_scopes")
        mode = env.get("MCP_AUTH_MODE", "none")
        if mode not in {"none", "bearer"}:
            raise ConfigurationError("invalid_auth_mode")
        issuer = resource = None
        tokens = ()
        hosts = tuple(filter(None, env.get("MCP_ALLOWED_HOSTS", "").split(",")))
        origins = tuple(filter(None, env.get("MCP_ALLOWED_ORIGINS", "").split(",")))
        if any("*" in item or "/" in item or item.strip() != item for item in hosts):
            raise ConfigurationError("invalid_allowed_hosts")
        if mode == "bearer":
            issuer = _url(env.get("MCP_AUTH_ISSUER", ""), https=not loopback)
            resource = _url(env.get("MCP_AUTH_RESOURCE", ""), https=not loopback)
            try:
                rows = json.loads(Path(env.get("MCP_TOKEN_FILE", "")).read_text(encoding="utf-8"))
                if not isinstance(rows, list) or not rows:
                    raise ValueError()
                for row in rows:
                    if (set(row) != {"token_sha256", "client_id", "scopes", "expires_at", "resource"}
                            or len(row["token_sha256"]) != 64
                            or any(c not in "0123456789abcdef" for c in row["token_sha256"])
                            or not isinstance(row["client_id"], str) or not row["client_id"].strip()
                            or not isinstance(row["scopes"], list) or not set(row["scopes"]) <= SCOPES
                            or READ not in row["scopes"] or type(row["expires_at"]) is not int
                            or row["expires_at"] <= time.time() or row["resource"] != resource):
                        raise ValueError()
                if len({r["token_sha256"] for r in rows}) != len(rows):
                    raise ValueError()
                tokens = tuple(rows)
            except (OSError, ValueError, TypeError, KeyError):
                raise ConfigurationError("invalid_token_configuration") from None
        if transport == "http" and not loopback:
            if (env.get("MCP_ALLOW_REMOTE") != "true" or mode != "bearer" or not hosts or not origins
                    or env.get("MCP_TLS_TERMINATED_BY_PROXY") != "true"):
                raise ConfigurationError("remote_binding_requires_authenticated_configuration")
            if urlsplit(resource).netloc not in hosts:
                raise ConfigurationError("resource_host_not_allowed")
        if not hosts:
            authority = f"[{host}]:{port}" if ":" in host else f"{host}:{port}"
            hosts = tuple(dict.fromkeys((authority, f"127.0.0.1:{port}", f"localhost:{port}", f"[::1]:{port}")))
        origins = tuple(_url(value, https=not loopback, origin=True) for value in origins)
        return cls(transport, host, port, mode, issuer, resource, hosts, origins, tokens, scopes)


class ConfiguredTokenVerifier:
    """Expiring, resource-bound opaque tokens provisioned by trusted operators."""
    def __init__(self, configuration):
        self.configuration = configuration

    async def verify_token(self, token):
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        for row in self.configuration.tokens:
            if hmac.compare_digest(digest, row["token_sha256"]) and row["expires_at"] > time.time():
                return AccessToken(token=token, client_id=row["client_id"], scopes=row["scopes"],
                                   expires_at=row["expires_at"], resource=row["resource"])
        return None


class AuthorizedFastMCP(FastMCP):
    def __init__(self, configuration):
        self.configuration = configuration
        auth = None
        verifier = None
        if configuration.transport == "http" and configuration.auth_mode == "bearer":
            auth = AuthSettings(issuer_url=configuration.issuer,
                                resource_server_url=configuration.resource, required_scopes=[READ])
            verifier = ConfiguredTokenVerifier(configuration)
        super().__init__("uzbekistan-policy-engine", host=configuration.host, port=configuration.port,
            auth=auth, token_verifier=verifier, stateless_http=True, json_response=True,
            transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=True,
                allowed_hosts=list(configuration.allowed_hosts), allowed_origins=list(configuration.allowed_origins)))

    async def call_tool(self, name, arguments):
        required = READ if name in READ_TOOLS else EXECUTE if name in MODEL_TOOLS else MUTATE if name in MUTATION_TOOLS else None
        if self.configuration.transport == "stdio":
            scopes = self.configuration.stdio_scopes
        else:
            token = get_access_token()
            scopes = set(token.scopes) if token else {READ} if self.configuration.auth_mode == "none" else set()
        if required is None or required not in scopes:
            return {"error": {"code": "permission_denied", "required_scope": required}}
        try:
            return await super().call_tool(name, arguments)
        except Exception:
            # SDK ToolError can contain argument values or downstream credentials.
            return {"error": {"code": "tool_execution_failed"}}
