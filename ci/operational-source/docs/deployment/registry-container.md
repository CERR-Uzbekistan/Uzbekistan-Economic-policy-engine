# Frozen Registry API container

The root `Dockerfile` builds the separate read-only Registry REST API. It uses digest-pinned Python 3.12.12/uv 0.9.26 and the existing frozen `mcp_server/uv.lock`. It installs locked dependencies without installing the complete MCP/model project. The image contains only the Registry API modules, dependency metadata and four named public JSON artifacts: QPM, DFM, I-O and PE.

The adjacent `Dockerfile.dockerignore` is an explicit allowlist. Model execution code, MCP/Policy Chat entry points, environment files, real storage, private data, shared mutable data and UI source/builds are excluded. It takes precedence only for this root Dockerfile; the MCP and Policy Chat recipes retain their own build contexts.

## Build and inspect

From the repository root:

```bash
docker build -f Dockerfile -t uz-policy-registry:local .
```

The process runs as UID 10001 and binds to loopback inside its container by default. The acceptance environment uses `--network none`, a read-only filesystem, dropped capabilities, no privilege escalation, bounded processes and no published host ports. No container starts automatically when this recipe is edited.

`REGISTRY_API_HOST` and `PORT` explicitly configure a future operator-controlled listener. To reach a container from a host browser, an operator would need to bind the service inside its container and publish the host port deliberately. No remote/public profile, production proxy or automatic port publication is added here. The main local engine does not depend on this test container and retains its existing URL.

## API and health boundary

`GET /api/v1/registry/artifacts` returns the unchanged v1 metadata contract with exact artifact checksums, original vintages/times, caveats and warnings. POST, PUT, PATCH and DELETE are rejected. It has no MCP or Policy Chat endpoint and does not execute a model, refresh data or modify a stored run.

The healthcheck calls that endpoint; it becomes unhealthy when required artifacts are missing or invalid JSON. Its checks establish JSON parsing and metadata extraction. They do **not** establish model execution readiness, source freshness, schema approval or authoritative model approval. The four packaged artifacts are frozen evidence; the main engine's automatic Overview/history channel is a separate data path.

The command uses `exec` for stop-signal delivery. The isolated gate checks successful startup, repeated byte-derived checksums, read-only source, restart agreement and graceful shutdown. It separately mounts empty/malformed synthetic artifact fixtures read-only, requiring HTTP 503 and Docker unhealthy status, then removes every owned test resource.

## Acceptance

`scripts/testing/linux_registry_container_gate.py` binds the exact source and locally built image IDs. `registry_container_probe.py` checks non-root UID, private-file/model-code exclusions, exact checksums, rejected write methods, absence of other services, deterministic responses and honest artifact failures. These probes publish no host port, use no production credential and change no active source artifact.

The existing nonpublishing container CI job includes this gate, and root Dockerfile/ignore changes now trigger it. The acceptance report identifies the completed isolated run; actual deployment proxy/network configuration remains an operator decision. Scientific model and source qualifications remain unchanged.
