FROM python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c
COPY --from=ghcr.io/astral-sh/uv:0.9.26@sha256:9a23023be68b2ed09750ae636228e903a54a05ea56ed03a934d00fe9fbeded4b /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV REGISTRY_API_HOST=127.0.0.1

WORKDIR /app

COPY mcp_server /app/mcp_server
COPY apps/policy-ui/public/data /app/apps/policy-ui/public/data

RUN uv sync --project /app/mcp_server --frozen --group build --no-install-project
ENV PATH="/app/mcp_server/.venv/bin:$PATH"
RUN useradd --system --uid 10001 --create-home policy-registry
USER policy-registry

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8000') + '/api/v1/registry/artifacts', timeout=3).read(1)"

CMD ["sh", "-c", "exec uvicorn api.app:app --app-dir /app/mcp_server --host \"${REGISTRY_API_HOST:-127.0.0.1}\" --port \"${PORT:-8000}\""]
