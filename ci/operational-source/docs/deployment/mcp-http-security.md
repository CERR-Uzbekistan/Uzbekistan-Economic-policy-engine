# MCP HTTP startup and authorization

Implemented 2026-09-30. This entry point is separate from the registry REST API and Policy Chat API. Their ownership, durable claims, provenance and readiness policies are unchanged.

## Supported implementation

The server imports **`mcp.server.fastmcp.FastMCP` from `mcp[cli]==1.27.0`**, pinned in `mcp_server/pyproject.toml`. It does not use the separate `fastmcp` distribution. Host and port are constructor settings; `run(transport="streamable-http")` accepts neither. This matches the [official SDK v1.27.0](https://github.com/modelcontextprotocol/python-sdk/tree/v1.27.0).

From the repository root, bootstrap uv with `python -m pip install --require-hashes -r scripts/testing/requirements-tools.txt`, then install using `uv sync --project mcp_server --frozen --extra dev --group build --no-editable`. Run `uv run --project mcp_server --frozen --extra dev --group build --no-editable python mcp_server/main.py` for stdio. For loopback HTTP, set `MCP_TRANSPORT=http`, optionally `MCP_PORT`, and run the same command. The MCP endpoint is `/mcp`. HTTP defaults to `127.0.0.1:8000`; anonymous HTTP is read-only. Invalid configuration exits with code 2 and a stable reason, without printing settings or private paths.

## Invocation permissions

Tool discovery is not authorization. `AuthorizedFastMCP.call_tool` checks scopes before argument parsing or tool execution; unknown/unclassified tools fail closed. All 20 registered tools are covered by the classification test.

| Scope | Tools |
|---|---|
| `policy:read` | Model catalog, sector information, accepted PE overview, academic/reform source fetching |
| `policy:execute` | Declared model execution and model-specific calculations/comparison; AI paper curation and reform categorization |
| `policy:mutate` | Literature updates, tracker updates, research-article saves |

Scopes are independent. Execution does not grant shared-data writes; mutation does not grant model execution. AI tools requiring credentials belong to execution permission. Model permissions never replace manifest approval, freshness or artifact gates. FPP and other blocked variants remain blocked. stdio is an explicitly trusted local subprocess boundary, with read/execute by default; mutation requires explicit `MCP_STDIO_SCOPES=policy:read,policy:execute,policy:mutate`. Do not share that subprocess with untrusted clients.

## HTTP authentication

Set `MCP_AUTH_MODE=bearer`, `MCP_AUTH_ISSUER`, `MCP_AUTH_RESOURCE` (the externally visible MCP URL), and `MCP_TOKEN_FILE`. The SDK's supported `TokenVerifier`, `AuthSettings`, bearer middleware and protected-resource metadata are used. The verifier accepts only operator-provisioned opaque tokens whose SHA-256 hashes, scopes, resource and expiration match the configured allowlist. Invalid/missing bearer credentials return HTTP 401; absence of the base read scope returns HTTP 403. Per-tool scope failures return structured `permission_denied` tool payloads.

The private JSON file contains an array of records with exactly these fields:

```json
[
  {
    "token_sha256": "<64 lowercase hexadecimal characters>",
    "client_id": "<complete operator-assigned client identity>",
    "scopes": ["policy:read"],
    "expires_at": 1893456000,
    "resource": "https://mcp.example.org/mcp"
  }
]
```

Never store plaintext tokens in this file. Records require read scope, recognized scopes, distinct hashes, exact resource binding and future expiration. Expiration is checked again for each request. Provisioning/rotation is offline: update the protected file and restart workers. This implementation is not an OAuth authorization server and does not validate arbitrary JWTs or fetch an issuer's keys. Operators must align the declared issuer with their trusted issuance process and provide client token acquisition. Token hashes and access scopes remain sensitive administrative configuration.

HTTP uses stateless requests (`stateless_http=True`, JSON responses), so persistent sessions are not enabled and session IDs cannot act as authorization or transfer permissions. Every request is authenticated anew. There is no event replay store or multi-worker session affinity requirement. Reconnection is a new protocol initialization, not a durable execution retry; Policy Chat's separate claims continue to govern its retries.

DNS-rebinding protection stays enabled. Host values are exact host:port entries (loopback defaults include IPv4, localhost and IPv6). `MCP_ALLOWED_ORIGINS` is an exact HTTP(S) origin list; an absent Origin header is allowed for native MCP clients, while unlisted browser origins are rejected. Wildcards and credential-bearing origin URLs are rejected. No permissive CORS policy is added. SDK protocol/HTTP debug logging is disabled, and unexpected tool errors are sanitized rather than returning downstream exception text or credentials.

## Remote binding prerequisite

Remote binding is refused unless all are present: `MCP_ALLOW_REMOTE=true`, bearer configuration, HTTPS issuer/resource URLs, exact nonempty `MCP_ALLOWED_HOSTS` and `MCP_ALLOWED_ORIGINS`, the resource's authority in the host allowlist, and `MCP_TLS_TERMINATED_BY_PROXY=true`. These are configuration prerequisites, not evidence that deployment is secure. No remote listener was opened during implementation.

Operators must verify TLS termination, private connectivity/firewall between proxy and app, unmodified Authorization forwarding, correct Host/Origin preservation, token issuance/rotation/revocation, least-privilege scopes and protected config files. The FastMCP listener itself does not terminate TLS. Never expose that plain HTTP listener directly to an untrusted network. Native clients without Origin rely on authentication and network controls. Shared-data writes also require a reviewed writable location and coordination for concurrent writers; authorization alone does not supply a transactional shared-file store.

## Verification

Actual SDK `ClientSession` smokes perform startup, initialization, list tools, read-only invocation, denied model/mutation calls, and shutdown. Tests run both anonymous and authenticated HTTP on dynamically selected loopback ports, reject bad origins and credentials, stop the created process tree and verify port closure. stdio initialization/discovery/read-only invocation and mutation denial use the SDK stdio client and its shutdown sequence.

Fresh virtual-environment installation on Windows/Python 3.14 succeeded, followed by **93 passing transport/readiness/FPP tests**. Broader existing-environment regressions passed **205 tests plus 3 subtests** across transport, ownership, claims, provenance, API/store, registry and readiness. The focused security/lifecycle suite contains 17 tests. Ruff passed. The clean dependency resolver emitted upstream Starlette test-client and Pydantic-settings warnings; startup and protocol operations succeeded. This paragraph records the 2026-09-30 startup verification. The later reproducibility work froze the full supported environment in `mcp_server/uv.lock`; declared pyproject ranges do not select newer packages when `--frozen` is used. The 2026-10-01 locked Python 3.12.12 full run passed 430 tests plus three subtests, including all 17 transport cases; exact CI Ruff passes. See [runtime/evidence matrix](model-test-reproducibility.md). Latest-source fresh checkout checks on other supported runtimes, Docker/Linux CI and operator network/token/volume checks remain outstanding.

Changed files: `mcp_server/main.py`, `mcp_security.py`, `pyproject.toml`, `.env.example`, `README.md`, credential-safe error/log handling in `tools/literature.py` and `tools/reforms.py`, `tests/test_mcp_transport.py`, Policy Chat CI coverage, and this document. No shared data, manifest approval, accepted vintage, ownership schema, claim state or stored run envelope was rewritten.

## Container distinction

`Dockerfile.policy-chat` uses pinned Python 3.12.12/uv image digests and the frozen lock for the separate Policy Chat API. Its isolated Linux mechanics passed on 12 October; [operational acceptance](../reviews/2026-10-12-operational-acceptance.md) retains the exact image/source evidence.

The MCP recipe at `mcp_server/Dockerfile` now uses those pinned bases and the frozen lock, with a Dockerfile-specific source allowlist and UID 10001. Its Compose configuration is client-driven stdio with read scope, read-only source files, no network or host-published ports, no automatic restart, and no implicit `.env` loading. It replaces the former floating recipe and invalid `/health` check. See [MCP container instructions](mcp-container.md) for protocol acceptance and the exact evidence boundary. Native local stdio defaults remain unchanged; this container deliberately starts with the narrower read scope.

The root registry Dockerfile remains a separate floating recipe. No remote access or real TLS/proxy configuration was enabled by the MCP repair. Container protocol checks cannot establish actual operator token issuance, TLS termination or network policy.
