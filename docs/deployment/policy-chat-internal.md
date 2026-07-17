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
docker build -f Dockerfile.policy-chat -t uz-policy-chat:local .
```

The image contains no credentials. Supply configuration through the deployment platform's secret manager.

## Required backend configuration

```dotenv
POLICY_CHAT_ENABLED=true
POLICY_CHAT_AUTH_MODE=trusted_proxy
POLICY_CHAT_PROXY_SECRET=<secret-manager-reference>
POLICY_CHAT_CORS_ORIGINS=https://policy.internal.example
PORT=8001
```

Do not commit a populated environment file. Rotate the proxy secret through the platform's normal secret-rotation process.

Run a local container bound to loopback for an operator smoke test:

```bash
docker run --rm \
  --name uz-policy-chat \
  --env-file /secure/path/policy-chat.env \
  -p 127.0.0.1:8001:8001 \
  uz-policy-chat:local
```

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
```

Direct API calls without the proxy secret must return `401`. Calls with a valid proxy secret but no verified user must also return `401`. The feature must return `404` when `POLICY_CHAT_ENABLED=false`.

Before pilot access, verify:

- QPM, DFM, and I-O appear in `/api/v1/policy-chat/capabilities`;
- PE, CGE, FPP, and experimental models cannot execute;
- an edited proposal invalidates the earlier hash;
- prompts and raw results are excluded from general proxy/application logs;
- the kill switch works without rebuilding the frontend;
- the deployment has an approved retention and audit-store policy.

## Operational ownership still required

The organization must assign owners for the OIDC application, proxy configuration, secret rotation, hosting, audit persistence, retention, incident response, and analyst access approval. Those values are intentionally not guessed in repository configuration.