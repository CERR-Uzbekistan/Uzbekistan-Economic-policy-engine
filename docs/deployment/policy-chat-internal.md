# Policy Chat internal deployment handoff

Policy Chat is an internal-only service. The application is disabled by default and must not be exposed directly to the public internet.

## Deployment shape

```text
Internal browser
  -> organization TLS + OIDC reverse proxy
  -> Policy Chat FastAPI container (private network, port 8001)
  -> checked-in QPM calibration, approved DFM artifact, and 2022 I-O artifact
```

The reverse proxy is the authentication boundary. It must authenticate the user, remove any client-supplied Policy Chat identity headers, inject the verified identity, and add the backend shared secret. The FastAPI service rejects trusted-proxy requests without both values.

## Build the service

From the repository root:

```bash
python mcp_server/data/convert_js_data.py
docker build -f Dockerfile.policy-chat -t uz-policy-chat:local .
```

The generated model JSON files are intentionally gitignored. The Dockerfile fails closed when the required DFM or I-O artifact is absent, and CI regenerates both from the tracked JavaScript sources before building the image.

The image contains no credentials. Supply configuration through the deployment platform's secret manager.

## Required backend configuration

```dotenv
POLICY_CHAT_ENABLED=true
POLICY_CHAT_AUTH_MODE=trusted_proxy
POLICY_CHAT_PROXY_SECRET=<secret-manager-reference>
POLICY_CHAT_CORS_ORIGINS=https://policy.internal.example
POLICY_CHAT_STATE_PATH=/var/lib/policy-chat/policy-chat.sqlite3
POLICY_CHAT_ENABLED_MODELS=qpm,dfm,io
POLICY_CHAT_MAX_RUNS_PER_MINUTE=10
PORT=8001
```

Do not commit a populated environment file. Rotate the proxy secret through the platform's normal secret-rotation process.

Run a local container bound to loopback for an operator smoke test:

```bash
docker run --rm \
  --name uz-policy-chat \
  --env-file /secure/path/policy-chat.env \
  --mount type=volume,src=policy-chat-state,dst=/var/lib/policy-chat \
  -p 127.0.0.1:8001:8001 \
  uz-policy-chat:local
```

## Durable governance state

The service stores owner-scoped proposals, confirmed runs, idempotency keys, and append-only audit events in SQLite. Prompt bodies are not copied into audit-event metadata. Mount `/var/lib/policy-chat` on encrypted durable storage and include the database in the platform backup/restore schedule.

Use one application replica with SQLite. Before scaling to multiple writers, migrate the store interface to the organization-approved PostgreSQL service and run concurrency/migration tests. Retention and deletion remain governance-owner decisions; do not delete append-only events ad hoc.

The service-level `POLICY_CHAT_MAX_RUNS_PER_MINUTE` limit is a single-process safety backstop. Keep the reverse proxy's per-user and request-size limits as the outer control. Individual model lanes can be stopped without rebuilding by removing their identifier from `POLICY_CHAT_ENABLED_MODELS` and restarting the service.

## Reverse-proxy contract

Before forwarding a request, the authenticated proxy must:

1. reject unauthenticated users;
2. authorize the internal Policy Chat application/role;
3. strip incoming `X-Policy-Chat-User` and `X-Policy-Chat-Proxy-Secret` headers;
4. set `X-Policy-Chat-User` from a verified, stable organizational subject or email claim;
5. set `X-Policy-Chat-Proxy-Secret` from the backend secret store;
6. forward only `/api/v1/policy-chat/*` and `/health` to the private service;
7. enforce TLS, request-size limits, timeouts, and per-user rate limits;
8. avoid logging prompt bodies or the proxy secret.

Identity-provider-specific claim mapping remains an operator decision; it must not be implemented in browser code.

## Frontend build configuration

Use [`.env.policy-chat.example`](../../apps/policy-ui/.env.policy-chat.example) as the non-secret frontend contract. The recommended production URL is the same-origin proxy path:

```dotenv
VITE_POLICY_CHAT_ENABLED=true
VITE_POLICY_CHAT_API_URL=/api/v1/policy-chat
VITE_POLICY_CHAT_TIMEOUT_MS=15000
```

Never set `VITE_POLICY_CHAT_DEV_USER` in a production build.

## Smoke and security checks

```bash
curl --fail http://127.0.0.1:8001/health
curl --fail http://127.0.0.1:8001/ready
```

Direct API calls without the proxy secret must return `401`. Calls with a valid proxy secret but no verified user must also return `401`. The feature must return `404` when `POLICY_CHAT_ENABLED=false`.

Before pilot access, verify:

- QPM, DFM, and I-O appear in `/api/v1/policy-chat/capabilities`;
- PE, CGE, FPP, and experimental models cannot execute;
- an edited proposal invalidates the earlier hash;
- prompts and raw results are excluded from general proxy/application logs;
- the kill switch works without rebuilding the frontend;
- `/ready` reports `storage.durable: true`;
- the mounted database has a tested backup and restore procedure;
- the deployment has an approved retention and audit-store policy;
- `scripts/policy-chat/smoke.py` passes from an authorized operator host.

## Operational ownership still required

The organization must assign owners for the OIDC application, proxy configuration, secret rotation, hosting, audit persistence, retention, incident response, and analyst access approval. Those values are intentionally not guessed in repository configuration.