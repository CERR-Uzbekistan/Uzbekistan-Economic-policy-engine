# Uzbekistan Economic Policy Engine

Operational internal-preview frontend for Uzbekistan economic policy workflows. The active preview product is `apps/policy-ui`; legacy static model folders remain reference/simulator assets unless explicitly promoted by contract.

## Operational Preview Status

| Surface | Status |
|---|---|
| `apps/policy-ui` | Active internal-preview product |
| `cge_model/`, `dfm_nowcast/`, `fpp_model/`, `io_model/`, `pe_model/`, `qpm_uzbekistan/` | Legacy reference / not actively maintained in the preview |
| `shared/`, `mcp_server/` | Reference / out-of-scope for preview |

Knowledge Hub is pending-only in the operational preview. FPP, PE, CGE, HFI, backend, and Knowledge Hub implementation remain gated by their contracts/readiness docs.

## Models

Legacy model inventory:

| Model | Description |
|-------|-------------|
| **QPM DSGE Simulator** | New-Keynesian small open economy model with monetary policy impulse responses |
| **GDP Nowcasting (DFM)** | Mixed-frequency Dynamic Factor Model with Kalman filter — 34 monthly indicators, 3-month GDP forecast |
| **Partial Equilibrium** | WTO accession trade impact analysis with WITS-computed tariff effects across HS codes |
| **Input-Output Model** | 136-sector Leontief framework (2022 data) — supply chain multipliers, sectoral linkages |
| **CGE 1-2-3 Model** | Computable General Equilibrium model for sectoral shock simulation (2021 data) |
| **Financial Programming** | IMF 4-sector framework for macroeconomic consistency checks |

## Repository Structure

- `index.html` + model folders (`qpm_uzbekistan`, `dfm_nowcast`, `pe_model`, `io_model`, `cge_model`, `fpp_model`): legacy static application and model pages.
- `apps/policy-ui`: React + TypeScript replatform frontend and Sprint 3 internal-preview deployment surface.
- `mcp_server`: Python MCP server exposing model tools.
- `shared`: shared JS registries, engines, i18n, and data assets used by the static app.

## Getting Started

### Active internal preview (`apps/policy-ui`)

1. `cd apps/policy-ui`
2. `npm ci`
3. `npm run dev` (or `npm run build` / `npm run test`)

### Legacy static reference

1. Clone or download the repository.
2. Open `index.html` in a web browser.
3. Treat root/model-folder pages as legacy reference/simulator assets, not the active internal-preview product.

### Sprint 3 internal-preview deployment

The React rebuild is the Sprint 3 internal-preview deployment surface. GitHub Pages
keeps the legacy static site at the repository root and publishes the React
app as a sidecar under `/policy-ui/`.

Internal-preview entry route:

```text
https://<org>.github.io/Uzbekistan-Economic-policy-engine/policy-ui/#/overview
```

The exact host depends on the repository Pages domain. DFM scheduled
freshness is not considered active until the deployment and data-regeneration
workflows are promoted to `main`; until then, DFM regeneration remains a
manual-dispatch workflow on the epic branch.

### MCP server (`mcp_server`)

1. Install Python 3.11+
2. `cd mcp_server`
3. `pip install -e ".[dev]"`
4. `python -m pytest -q`
5. `python main.py`

### Development Notes

- Legacy model pages are self-contained and use folder-level `index.html` files.
- Shared UI/report utilities live in `shared/report-engine.js` and related modules.
- Data files (`*_data.js`, `*_data.json`) are generated from upstream R/data workflows.

## Tech Stack

- **Frontend:** HTML5/CSS3/Vanilla JS (legacy) + React 19/TypeScript/Vite (`apps/policy-ui`)
- **Charts:** Chart.js 4.4.0
- **Export:** jsPDF 2.5.1 (PDF), XLSX 0.18.5 (Excel)
- **Modeling:** R (data processing and model computation)
- **Tooling/Backend:** Python MCP server (`mcp_server`)
- **Fonts:** Inter, JetBrains Mono (Google Fonts)

## Features

- Active internal-preview surface in `apps/policy-ui`
- Legacy reference/simulator inventory for six economic model folders
- Multi-language interface (English, Русский, Ўзбекча)
- Macro snapshot dashboard with key economic indicators
- GDP forecast chart with DFM nowcast integration
- International Organizations data page (2026 data)
- Export to CSV, PNG, and PDF
- Responsive design for desktop and mobile

## Data Sources

- Statistics Agency of Uzbekistan
- Central Bank of Uzbekistan
- World Integrated Trade Solution (WITS)
- Central Asian Economic Model (CAEM)
- Center for Economic Research & Reforms (CERR)

## License

All rights reserved.
