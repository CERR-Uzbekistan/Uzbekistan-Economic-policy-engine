FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

COPY mcp_server /app/mcp_server
COPY apps/policy-ui/public/data /app/apps/policy-ui/public/data

RUN pip install --no-cache-dir /app/mcp_server

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8000') + '/api/v1/registry/artifacts', timeout=3).read(1)"

CMD ["sh", "-c", "uvicorn api.app:app --app-dir /app/mcp_server --host 0.0.0.0 --port ${PORT:-8000}"]
