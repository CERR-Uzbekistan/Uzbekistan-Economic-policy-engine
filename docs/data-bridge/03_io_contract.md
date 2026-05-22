# IO Data Bridge — Consumer Contract

**Source:** `io_model/io_data.json` + `mcp_server/data/io_data.json` → `scripts/export_io.mjs` → `apps/policy-ui/public/data/io.json`
**Status:** First IO bridge slice; static JSON bridge target
**Version:** solver 0.1.0, data 2022
**Upstream input:** Statistics Agency 2022 symmetric input-output table, as committed in `io_model/io_data.json`, plus MCP-converted employment arrays in `mcp_server/data/io_data.json`

## Purpose

This file begins the frontend bridge for the Input-Output Leontief model.
It is bridge-native data for later page adapters/composers. It must not
emit `ComparisonContent` or other page-native presentation models.

## Shape

```
{
  attribution: ModelAttribution,
  sectors: IoSector[],      // 136 entries
  matrices: {
    technical_coefficients: number[][], // A, 136 x 136
    leontief_inverse:       number[][]  // L, 136 x 136
  },
  totals: {
    output_thousand_uzs:          number[],
    total_resources_thousand_uzs: number[],
    final_demand_thousand_uzs:    number[],
    imports_thousand_uzs:         number[]
  },
  caveats: Caveat[],
  metadata: {
    exported_at,
    source_script_sha,
    solver_version,
    source_artifact,
    source_artifact_generated,
    source_title,
    source,
    framework,
    units,
    base_year,
    n_sectors
  }
}
```

`ModelAttribution` and `Caveat` map directly onto
`apps/policy-ui/src/contracts/data-contract.ts`. IO-specific sector,
matrix, totals, and metadata types live in
`apps/policy-ui/src/data/bridge/io-types.ts`.

## Unit Conventions

| Field | Unit | Notes |
|---|---|---|
| `sectors[].output_thousand_uzs` | legacy source monetary field | Source field `output`; field name is retained for compatibility. |
| `sectors[].total_resources_thousand_uzs` | legacy source monetary field | Domestic output plus imports; field name is retained for compatibility. |
| `sectors[].imports_thousand_uzs` | legacy source monetary field | Source imports; field name is retained for compatibility. |
| `sectors[].gva_thousand_uzs` | legacy source monetary field | Gross value added; field name is retained for compatibility. |
| `sectors[].compensation_of_employees_thousand_uzs` | legacy source monetary field | Source `coe`; field name is retained for compatibility. |
| `sectors[].gross_operating_surplus_thousand_uzs` | legacy source monetary field | Source `gos`; field name is retained for compatibility. |
| `sectors[].employment_total` | persons | MCP-converted employment array aligned by sector code/name. |
| `sectors[].employment_formal` | persons | MCP-converted formal employment array aligned by sector code/name. |
| `sectors[].employment_informal` | persons | MCP-converted informal employment array aligned by sector code/name. |
| `sectors[].output_multiplier` | ratio | Type I output multiplier from source JSON. |
| `sectors[].value_added_multiplier` | ratio | Type I value-added multiplier from source JSON. |
| `matrices.technical_coefficients` | ratio | A matrix, computed as intermediate use divided by total resources. |
| `matrices.leontief_inverse` | ratio | L = `(I - A)^-1`. |

The public field names with `_thousand_uzs` are legacy names from the first
bridge slice. Scenario Lab does not display those raw fields directly. It
converts demand shocks and results to **billion UZS** through the audited I-O
Scenario Lab adapter and keeps a scale caveat in the public artifact.

## Absent Fields, By Design

- **No `ComparisonContent`.** Comparison remains a page-native view
  model composed by page adapters/composers.
- **No Type II arrays.** The chosen source artifact `io_model/io_data.json`
  does not carry Type II induced-consumption arrays. Type II reconciliation is
  a later model/data decision.
- **No English or Uzbek sector labels.** The chosen JSON source carries
  Russian sector names. Multilingual sector labels should be added only
  after a reconciled source is chosen.
- **No live UI consumption in this slice.** This PR stops at
  export/contract/client/guard/bridge-native adapter.

## Freshness

The data vintage is the 2022 input-output table. The bridge export is a
deterministic transform of the committed source artifact and stamps
`metadata.exported_at` from `io_model/io_data.json` `metadata.generated`.
Do not conflate source table vintage (`attribution.data_version = "2022"`)
with the export date (`metadata.exported_at`).

## Consumer Wiring Checklist

- [x] `scripts/export_io.mjs` — deterministic source-to-public JSON transform.
- [x] `apps/policy-ui/public/data/io.json` — expected public bridge target.
- [x] `apps/policy-ui/src/data/bridge/io-types.ts` — IO-specific bridge types.
- [x] `apps/policy-ui/src/data/bridge/io-guard.ts` — schema guard with path-scoped issues.
- [x] `apps/policy-ui/src/data/bridge/io-client.ts` — fetch `/data/io.json`, validate, and preserve model-specific errors.
- [x] `apps/policy-ui/src/data/bridge/io-adapter.ts` — bridge-native linkage summaries.

## Downstream PRs

- Decide the first page-native consumer and map IO bridge output through
  that page's adapter/composer.
- Reconcile Type II multipliers and multilingual sector labels before
  exposing them in UI.
- Add IO to the data-regeneration workflow only after deployment timing is
  adjudicated; this slice does not start TB-P1 migration.
