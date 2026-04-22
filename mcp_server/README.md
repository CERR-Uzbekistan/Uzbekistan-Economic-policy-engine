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

### Knowledge Hub & curation tools

| Group | Tools | Description |
|-------|-------|-------------|
| **Academic literature pipeline** | `fetch_academic_papers` | Fetch candidate papers from Semantic Scholar and OpenAlex using model-specific or custom keywords |
| | `curate_academic_papers` | AI-score candidates 0–10 for model relevance and attach trilingual (EN/RU/UZ) relevance notes |
| | `update_literature_data` | Merge curated papers into `shared/literature-data.js`; dedup by DOI and title, preserve existing papers, refresh `lastUpdated` |
| **Policy reform tracker** | `fetch_policy_reforms` | Pull recent government documents from lex.uz, CBU announcements, and WTO working-party sources |
| | `categorize_policy_reform` | AI-classify a document by category, sector, region, and document type; generate trilingual summaries and link to relevant economic models |
| | `update_tracker_data` | Merge categorized reforms into `shared/policy-tracker-data.js`; dedup by title, append new entries, refresh `lastUpdated` |
| **Research article storage** | `save_research_article` | Save a research article or policy brief to `shared/research-data.js` with a generated unique ID; used by the AI Advisor "Publish as Brief" button and for manual article creation |

**Total: 19 tools**

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

## Testing

```bash
pip install -e ".[dev]"
python -m pytest tests/ -v
```

## Architecture

```
mcp_server/
├── main.py                 # MCP server entry point
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
