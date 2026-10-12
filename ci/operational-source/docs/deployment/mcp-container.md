# Frozen local MCP container

This recipe serves the MCP protocol, independently of the redesigned main UI, morning official-data updater, Registry REST API and Policy Chat. It uses Python 3.12.12 and uv 0.9.26 by immutable base-image digest, and installs the exact `mcp_server/uv.lock` with `--frozen` and pinned build tooling.

## Build

From the repository root, prepare and validate the reviewed historical derivatives before building:

```bash
uv sync --project mcp_server --frozen --extra dev --group build --no-editable
uv run --project mcp_server --frozen --extra dev --group build --no-editable python scripts/testing/prepare_model_fixtures.py prepare
uv run --project mcp_server --frozen --extra dev --group build --no-editable python scripts/testing/prepare_model_fixtures.py validate
docker build -f mcp_server/Dockerfile -t uz-policy-mcp:local .
```

The build requires all three manifest-matched converted datasets. Preparation grants no approval or new vintage. The adjacent `Dockerfile.dockerignore` allowlist includes Python/runtime metadata, those three derivatives, the model manifest/QPM core specification and three named public shared-data files. It excludes credentials, real databases, raw private workbooks, tests, install state and UI source/builds.

## Use from a local MCP client

Configure the client's stdio command as `docker` with these arguments:

```text
compose -f /absolute/path/to/repository/mcp_server/docker-compose.yml run --rm --no-deps -T mcp-server
```

Run from the repository root or provide the absolute Compose path. The image must be built first. The `-T` option keeps JSON protocol output free of terminal formatting. Compose opens stdin, uses an init process, and removes the client-owned container on completion. Use a client session rather than starting this stdio service as a background daemon.

Default container permissions are **`policy:read`**. Read tool discovery does not grant model execution or shared-data mutation. A trusted local client can explicitly add `-e MCP_STDIO_SCOPES=policy:read,policy:execute` before the service name when diagnostics are required. Exact manifest readiness, accepted artifacts, freshness and model approval still apply. Mutation is outside this read-only recipe; it has no writable shared-data mount.

The Compose recipe runs as UID 10001 with a read-only filesystem, a small ephemeral `/tmp`, dropped capabilities, no privilege escalation, bounded process count, `network_mode: none`, and no published ports or automatic restart. Network-dependent source-fetch tools need a separately reviewed network-enabled configuration; this isolated default cannot retrieve remote publications.

MCP stdio has no HTTP `/health` URL. Acceptance uses a real MCP client to initialize, discover and invoke read tools, verify scope/readiness denials, and shut down. The removed HTTP healthcheck must not be used as MCP readiness evidence.

## HTTP and remote boundary

The same image supports the existing HTTP transport, but the Compose default does not expose it. Isolated tests bind HTTP to loopback *inside* a network-disabled container, exercise anonymous read-only and provisioned bearer modes, and publish no host port. The token fixture contains hashes only, belongs to UID 10001 and is owner-private; plaintext test tokens pass only through the test client's stdin.

Remote binding still fails closed without bearer authentication, HTTPS issuer/resource, exact host/origin allowlists and explicit TLS-proxy prerequisites. A configuration flag is not proof of a deployed proxy. No production HTTP Compose profile or bypass was introduced. Operators must supply and verify their actual authenticated TLS/network setup before enabling remote service.

## Verification

`scripts/testing/linux_mcp_container_gate.py` builds the exact captured source and checks standalone stdio, the actual Compose client lifecycle, optional execution permission without FPP approval, anonymous/bearer HTTP, malformed Host/Origin, missing/bad credentials, private token-file ownership, credential-safe logs, read-only source, exclusion of injected private fixtures, fail-closed remote binding, and removal of all owned containers/token volumes. Its output binds the source and image IDs without granting deployment or model approval.

The original floating Registry Dockerfile is a separate service and remains outside this MCP recipe. Historical reports retain their original platform limitations. The new acceptance report will identify the completed run and remaining operator checks.

Docker configuration references: [container run options](https://docs.docker.com/reference/cli/docker/container/run/) and [Compose service controls](https://docs.docker.com/reference/compose-file/services/).
