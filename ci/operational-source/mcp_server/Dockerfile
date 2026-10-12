FROM python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c
COPY --from=ghcr.io/astral-sh/uv:0.9.26@sha256:9a23023be68b2ed09750ae636228e903a54a05ea56ed03a934d00fe9fbeded4b /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENV MCP_TRANSPORT=stdio MCP_HOST=127.0.0.1 MCP_PORT=8000
ENV MCP_AUTH_MODE=none MCP_ALLOW_REMOTE=false MCP_STDIO_SCOPES=policy:read
WORKDIR /app

# Build from the repository root with the adjacent Dockerfile.dockerignore.
COPY mcp_server /app/mcp_server
COPY apps/policy-ui/public/data/model-manifest.json /app/apps/policy-ui/public/data/model-manifest.json
COPY model_specs/qpm/qpm-core-v0.3.json /app/model_specs/qpm/qpm-core-v0.3.json
COPY shared/literature-data.js shared/policy-tracker-data.js shared/research-data.js /app/shared/
RUN test -s /app/mcp_server/data/dfm_data.json \
    && test -s /app/mcp_server/data/io_data.json \
    && test -s /app/mcp_server/data/pe_data.json
RUN uv sync --project /app/mcp_server --frozen --group build --no-install-project \
    && uv sync --project /app/mcp_server --frozen --group build --no-editable --no-build-isolation
ENV PATH="/app/mcp_server/.venv/bin:$PATH"
RUN useradd --system --uid 10001 --create-home policy-mcp \
    && mkdir -p /run/mcp-config \
    && chown policy-mcp:policy-mcp /run/mcp-config \
    && chmod 0700 /run/mcp-config
USER policy-mcp

# MCP stdio has no HTTP /health endpoint. The acceptance client probes the protocol.
HEALTHCHECK NONE
CMD ["python", "/app/mcp_server/main.py"]
