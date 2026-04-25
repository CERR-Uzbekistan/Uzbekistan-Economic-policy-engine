# Uzbekistan Economic Policy Engine

Interactive macroeconomic policy simulation platform for analyzing Uzbekistan's economy. Features 6 economic models with real-time visualization, multi-language support (EN/RU/UZ), and data export capabilities.

## Models

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
- `apps/policy-ui`: React + TypeScript replatform frontend and Sprint 3 pilot deployment surface.
- `mcp_server`: Python MCP server exposing model tools.
- `shared`: shared JS registries, engines, i18n, and data assets used by the static app.

## Getting Started

### Legacy static app

1. Clone or download the repository.
2. Open `index.html` in a web browser.
3. Navigate between models using the sidebar or model cards.

### Replatform frontend (`apps/policy-ui`)

1. `cd apps/policy-ui`
2. `npm ci`
3. `npm run dev` (or `npm run build` / `npm run test`)

### Sprint 3 pilot deployment

The React rebuild is the Sprint 3 pilot deployment surface. GitHub Pages
keeps the legacy static site at the repository root and publishes the React
app as a sidecar under `/policy-ui/`.

Pilot entry route:

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

- 6 interactive economic models with real-time parameter adjustment
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
