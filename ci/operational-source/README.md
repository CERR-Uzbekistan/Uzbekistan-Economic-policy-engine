# Uzbekistan Economic Policy Engine

Economic-policy software with qualified diagnostics and historical reference assets. Current source is `apps/policy-ui` plus manifest-gated MCP/Policy Chat services. Software availability does not imply model approval.

## Current source, preview and release status

| Surface | Boundary |
| --- | --- |
| `apps/policy-ui` | Current source and isolated review builds; diagnostic/reference qualifications and blocked lanes are enforced |
| Local supervisor | Older verified release `site-20260930-1000`; current fixes have not been promoted |
| `mcp_server` and shared model manifest | Readiness/authorization-gated execution; all authoritative approvals currently false |
| Six standalone model folders | Historical displays; unregistered legacy execution blocked |
| Pages workflow | Review-only allowlisted assembly and exact-artifact verification; no automatic publication |

See [current variant/route status](docs/models/CURRENT_STATUS.md), [acceptance evidence](docs/reviews/2026-10-01-consolidated-acceptance-audit.md), and [release/promotion contract](docs/deployment/release-verification.md). DFM historical artifacts are not currently fresh; FPP and research variants remain blocked. PE/CGE are released qualified diagnostics/reference calculations when their prerequisites pass. Knowledge Hub is a curated static pilot, not a live legal/research feed.

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
- `apps/policy-ui`: React + TypeScript frontend source and review-build surface.
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

### Review packaging and future authorized release

The intended static route is `/policy-ui/#/overview`; CI preserves the repository prefix `/Uzbekistan-Economic-policy-engine/policy-ui/`. `.github/workflows/pages.yml` assembles only explicitly allowlisted bytes, seals their release identity and requires browser/task verification against those exact bytes. Push, PR and manual runs produce review artifacts only. Approved data regeneration explicitly invokes the review dependency; it does not rely on a token-created commit triggering another workflow.

A future release needs an explicit human approval naming the exact retained release ID and destination. Promotion and rollback commands currently produce nonpublishing selection plans only. Production and preview have separate eligibility/destination boundaries; a nonproduction artifact cannot replace production. A current source build or successful package does not establish what a hosted site serves. Never rebuild or switch the local supervisor as part of documentation/review work.

### MCP server (`mcp_server`)

From the repository root:

```bash
python -m pip install --require-hashes -r scripts/testing/requirements-tools.txt
uv sync --project mcp_server --frozen --extra dev --group build --no-editable
uv run --project mcp_server --frozen --extra dev --group build --no-editable python scripts/testing/prepare_model_fixtures.py prepare
uv run --project mcp_server --frozen --extra dev --group build --no-editable pytest mcp_server/tests -q -ra
uv run --project mcp_server --frozen --extra dev --group build --no-editable python mcp_server/main.py
```

The last command starts trusted local stdio; HTTP defaults to loopback and read-only when configured. Execution and mutation scopes are independent and do not replace manifest readiness. See [MCP setup/security](docs/deployment/mcp-http-security.md) and [supported vs verified runtimes](docs/deployment/model-test-reproducibility.md). Fixture preparation does not approve or refresh production models.

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
- DFM historical/current-eligibility views with explicit vintage and illustrative uncertainty
- International Organizations data page (2026 data)
- Chart numerical tables/CSV and provenance-preserving JSON exports in the current UI; legacy export formats remain reference features
- Responsive design for desktop and mobile

## Data Sources

- Statistics Agency of Uzbekistan
- Central Bank of Uzbekistan
- World Integrated Trade Solution (WITS)
- Central Asian Economic Model (CAEM)
- Center for Economic Research & Reforms (CERR)

## License

All rights reserved.
