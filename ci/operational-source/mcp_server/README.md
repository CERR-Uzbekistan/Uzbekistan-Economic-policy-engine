# Uzbekistan Economic Policy Engine — MCP and APIs

Official Python SDK `mcp[cli]==1.27.0`, with the supported Python environment frozen in `uv.lock`. The 20 registered tools are classified for independent read, execute and mutate permissions. Discovery does not authorize invocation. [Current manifest status](../docs/models/CURRENT_STATUS.md) governs exact variants and model prerequisites; no variant currently has authoritative approval.

## Reproducible setup

From the repository root:

```bash
python -m pip install --require-hashes -r scripts/testing/requirements-tools.txt
uv sync --project mcp_server --frozen --extra dev --group build --no-editable
uv run --project mcp_server --frozen --extra dev --group build --no-editable python scripts/testing/prepare_model_fixtures.py prepare
uv run --project mcp_server --frozen --extra dev --group build --no-editable python scripts/testing/prepare_model_fixtures.py validate
uv run --project mcp_server --frozen --extra dev --group build --no-editable pytest mcp_server/tests -q -ra
```

Preparation creates deterministic test fixtures and validated historical MCP derivatives; it grants no model approval or fresh vintage. Missing/corrupt required fixtures fail before tests collect. Production artifact changes need explicit review and manifest hash validation. A floating `pip install -e .` is not the supported frozen verification procedure.

CI supports Python 3.11.14, 3.12.12 and 3.14.2. Current Windows locked Python 3.12.12 evidence is 430 passing tests plus three subtests, zero skips; earlier clean 3.11/3.12 and R 4.5.2 checks are historical. R 4.4.1/Windows Rtools restore, latest-source fresh checkout across the remaining runtimes and actual Docker/Linux CI remain outstanding. See [runtime matrix](../docs/deployment/model-test-reproducibility.md).

## Transports and authorization

Trusted local stdio:

```bash
uv run --project mcp_server --frozen --extra dev --group build --no-editable python mcp_server/main.py
```

For HTTP, set `MCP_TRANSPORT=http` and run the same command. It defaults to `127.0.0.1:8000/mcp`; anonymous loopback HTTP is read-only. Stdio grants read/execute by default and denies shared-data mutation unless `MCP_STDIO_SCOPES` explicitly includes `policy:mutate`. MCP clients should use the locked environment's Python executable and an absolute `main.py` path.

| Scope | Boundary |
| --- | --- |
| `policy:read` | Catalog/source/sector/PE overview reads |
| `policy:execute` | Model diagnostics and AI calculations, still subject to manifest readiness |
| `policy:mutate` | Literature/tracker/research shared-data writes |

Bearer HTTP uses offline provisioned token hashes, resource/expiry/scopes, SDK authentication and host/origin protection on each stateless request. Remote bind requires explicit opt-in, bearer auth, HTTPS issuer/resource, exact host/origin lists and declared TLS proxy termination; the listener itself does not terminate TLS. No remote access is enabled by setup alone. See [full security contract](../docs/deployment/mcp-http-security.md). Real loopback HTTP/stdio lifecycle and denial/cleanup tests pass; actual proxy/network/token deployment remains an operator check.

## Model execution

Existing model-specific tools are qualified diagnostics. `model_execute` defaults to authoritative and fails closed without approval; explicit diagnostic intent still requires a released variant and valid supported inputs/artifacts/freshness. QPM transmission/baseline identities differ; I-O public vs legacy allocations differ; PE uses actual USD v2 share scaling. DFM is stale under current requirements. FPP and research variants are blocked, including when an execution scope is present. Canonical attribution is not a unique execution UUID. See the [variant/readiness report](../docs/models/MODEL_MANIFEST_READINESS.md).

## Registry API (separate read-only service)

From the repository root:

```bash
uv run --project mcp_server --frozen --extra dev --group build --no-editable python -m uvicorn api.app:app --app-dir mcp_server --host 127.0.0.1 --port 8000
```

`/api/v1/registry/artifacts` serves public artifact metadata. It does not execute MCP tools, refresh data, mutate sources or deploy the frontend. It shares port 8000 by default, so do not start it beside MCP HTTP on the same address/port. Public JSON presence/schema validity is not current model execution readiness or approval.

## Policy Chat (separate owner-governed service)

The API is disabled by default. QPM IRF, DFM historical nowcast and I-O legacy proposal routes require actual readiness and explicit confirmation. Production uses an authenticated internal trusted proxy with complete schema-3 subject/issuer ownership, a secret, and durable state. Development memory requires both development authentication and explicit opt-in.

PowerShell, from the repository root:

```powershell
$env:POLICY_CHAT_ENABLED='true'
$env:POLICY_CHAT_AUTH_MODE='dev_header'
$env:POLICY_CHAT_ALLOW_IN_MEMORY_STATE='true'
uv run --project mcp_server --frozen --extra dev --group build --no-editable python -m uvicorn api.policy_chat_app:app --app-dir mcp_server --host 127.0.0.1 --port 8001
```

`/health` is liveness; `/ready` checks operational dependencies. SQLite durable claims and quotas coordinate workers sharing the same correctly locked database. Terminal state/result/audit commit atomically; unresolved pending claims never automatically rerun. Readiness cannot grant model approval. See [deployment guidance](../docs/deployment/policy-chat-internal.md).

## Containers and publication

`Dockerfile.policy-chat` is the digest-pinned/frozen Policy Chat API recipe; its isolated Linux startup, readiness, durable recovery and restart checks passed on 12 October. See [operational evidence](../docs/reviews/2026-10-12-operational-acceptance.md).

`mcp_server/Dockerfile` now uses the same pinned Python/uv bases and frozen lock for MCP. Its adjacent allowlist excludes environment files, user state, private data and UI source. The Compose recipe is a local client-driven stdio setup: non-root, read-only filesystem, no network, no published ports, no environment-file loading and read scope by default. See [container commands and evidence boundaries](../docs/deployment/mcp-container.md). Execution permission requires an explicit client configuration and cannot bypass model readiness or owner approval. Shared-data mutation remains disabled.

The root registry Dockerfile is a separate floating recipe and is not covered by these MCP checks. Neither container setup enables a remote listener, starts the main UI, selects a release or deploys a service. Actual production proxy/network/token provisioning remains an operator check.

Pages creates review-only allowlisted artifacts and exact-artifact verification. No automatic deployment, source refresh approval, model promotion or supervisor switch follows from MCP setup. [Release plans](../docs/deployment/release-verification.md) require an exact retained identity and explicit human approval, and do not publish.
