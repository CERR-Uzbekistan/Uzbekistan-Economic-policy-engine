# Uzbekistan Economic Policy Engine — MCP Server

An MCP (Model Context Protocol) server that exposes 6 macroeconomic models for Uzbekistan as AI-queryable tools. Inspired by France's [datagouv-mcp](https://github.com/datagouv/datagouv-mcp).

## Models & Tools

| Model | Tools | Description |
|-------|-------|-------------|
| **QPM** (DSGE) | `qpm_impulse_response`, `qpm_baseline_forecast` | Monetary policy transmission — IS curve, Phillips curve, Taylor rule, UIP |
| **DFM** (Nowcast) | `dfm_nowcast`, `dfm_kalman_update` | Real-time GDP nowcasting with 35 monthly indicators |
| **PE** (Trade) | `pe_trade_impact`, `pe_trade_overview` | WTO accession tariff cut simulation (WITS-SMART) |
| **I-O** (Leontief) | `io_demand_shock`, `io_sector_info` | 136-sector supply chain multipliers (2022 data) |
| **CGE** (1-2-3) | `cge_simulate` | General equilibrium with CET/CES and BoP closure |
| **FPP** (IMF) | `fpp_project` | 4-sector financial programming framework (2025-2027) |
| Cross-model | `list_models`, `scenario_compare` | Discovery and multi-scenario comparison |

**Total: 12 tools**

## Quick Start

### 1. Install dependencies

```bash
cd mcp_server
pip install -e .
```

### 2. Convert data files (one-time)

```bash
cd data
python convert_js_data.py
```

### 3. Run the server

**stdio transport** (for Claude Desktop / Claude Code):
```bash
python main.py
```

**HTTP transport** (for remote access):
```bash
MCP_TRANSPORT=http MCP_PORT=8000 python main.py
```

### 4. Connect from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uzbekistan-policy": {
      "command": "python",
      "args": ["path/to/mcp_server/main.py"]
    }
  }
}
```

### 5. Connect from Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "uzbekistan-policy": {
      "command": "python",
      "args": ["mcp_server/main.py"]
    }
  }
}
```

## Example Queries

Once connected, you can ask Claude:

- *"What happens to Uzbekistan's GDP under 2pp monetary tightening?"* → uses `qpm_impulse_response`
- *"What's the latest GDP nowcast?"* → uses `dfm_nowcast`
- *"Simulate a 30% WTO tariff cut on machinery imports"* → uses `pe_trade_impact`
- *"What are the top 10 key sectors by output multiplier?"* → uses `io_sector_info`
- *"How does doubling import tariffs affect the exchange rate?"* → uses `cge_simulate`
- *"Project macro indicators for 2025-2027 with 7% GDP growth"* → uses `fpp_project`

## Docker

```bash
docker compose up --build
```

## Registry API v1 Runbook

The registry API is a separate read-only FastAPI service. It serves metadata
for existing frontend public artifacts and does not run the MCP tools, refresh
data, mutate sources, or deploy the frontend.

Install backend dependencies from the repository root:

```bash
python -m pip install -e ./mcp_server
```

Run the read-only registry API locally:

```bash
python -m uvicorn api.app:app --app-dir mcp_server --host 127.0.0.1 --port 8000
```

Endpoint:

```text
http://127.0.0.1:8000/api/v1/registry/artifacts
```

Expected 200 response shape:

```json
{
  "api_version": "v1",
  "source": "frontend_public_artifacts",
  "artifacts": []
}
```

The live response includes QPM, DFM, and I-O artifact records with checksum,
source vintage, guard status, caveats, and warnings. If a public artifact is
missing or invalid JSON, the API returns HTTP 503 with
`registry_artifact_unavailable` in the `code` field.

### Container image

Build the registry API image from the repository root so the image can preserve
the existing repo-relative artifact path:

```bash
docker build -t uz-policy-registry-api:local .
```

The image keeps this layout:

```text
/app/mcp_server
/app/apps/policy-ui/public/data
```

That preserves the API loader's existing repo-relative access to
`apps/policy-ui/public/data` without changing the API contract.

Run the service locally:

```bash
docker run --rm -p 8000:8000 \
  -e PORT=8000 \
  -e REGISTRY_API_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 \
  uz-policy-registry-api:local
```

The container starts:

```bash
uvicorn api.app:app --app-dir /app/mcp_server --host 0.0.0.0 --port ${PORT:-8000}
```

`PORT` defaults to `8000`. Operators can set a different container port with
`-e PORT=<port>` and map the host port accordingly.

For an HTTPS frontend, set CORS to the deployed origin handled by the TLS
terminating proxy or platform:

```bash
docker run --rm -p 8000:8000 \
  -e REGISTRY_API_CORS_ORIGINS=https://cerr-uzbekistan.github.io,https://policy.example.gov.uz \
  uz-policy-registry-api:local
```

Smoke test:

```bash
python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/registry/artifacts', timeout=3).read(1)"
```

The image includes the checked-in public data JSON files by default. Operators
who need to use externally refreshed artifacts without rebuilding can mount the
same repo-relative data path read-only:

```bash
docker run --rm -p 8000:8000 \
  -v "$PWD/apps/policy-ui/public/data:/app/apps/policy-ui/public/data:ro" \
  uz-policy-registry-api:local
```

GitHub Pages does not require the backend. The checked-in Pages workflow does
not set `VITE_REGISTRY_API_URL`, so the frontend keeps using its static public
artifact fallback unless an API URL is supplied outside checked-in Pages
configuration.

## Testing

```bash
pip install -e ".[dev]"
python -m pytest tests/ -v
```

## Architecture

```
mcp_server/
├── main.py                 # MCP server entry point
├── api/                    # Read-only registry metadata API
├── models/                 # Python ports of JS model solvers
│   ├── qpm.py              # Gauss-Seidel DSGE solver
│   ├── dfm.py              # Kalman filter (numpy)
│   ├── pe.py               # WITS-SMART trade simulation
│   ├── io_model.py         # Leontief demand/price propagation
│   ├── cge.py              # 1-2-3 bisection solver
│   └── fpp.py              # 4-sector IMF framework
├── tools/registry.py       # MCP tool definitions
├── helpers/validation.py   # Parameter validation
├── data/                   # JSON data files (from JS conversion)
└── tests/                  # Unit tests per model
```

## Data Sources

- Statistics Agency of Uzbekistan
- Central Bank of Uzbekistan
- WITS (World Integrated Trade Solution)
- CAEM (Central Asian Economic Model)

## Policy Chat API

Policy Chat is a separate, secure-by-default FastAPI service. It exposes only QPM impulse responses, read-only DFM nowcasts, and I-O final-demand shocks. All operations use a visible proposal hash and require explicit confirmation.

Local development (PowerShell):

```powershell
$env:POLICY_CHAT_ENABLED='true'
$env:POLICY_CHAT_AUTH_MODE='dev_header'
python -m uvicorn api.policy_chat_app:app --app-dir mcp_server --host 127.0.0.1 --port 8001
```

Production must use `POLICY_CHAT_AUTH_MODE=trusted_proxy`, set `POLICY_CHAT_PROXY_SECRET` from the backend secret manager, and place the service behind an authenticated internal reverse proxy that strips client-supplied identity headers before injecting `X-Policy-Chat-User` and `X-Policy-Chat-Proxy-Secret`. The feature remains disabled when identity is not configured. Set `POLICY_CHAT_STATE_PATH` to a volume-backed path for durable owner-scoped proposals, idempotent runs, and append-only audit events. `/health` is the liveness endpoint; `/ready` verifies authentication, enabled models, and storage.