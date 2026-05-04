# I-O Analytics Contract Direction

**Date:** 2026-04-25  
**Scope:** Contract direction for Scenario Lab I-O Sector Shock analytics.

## Decision

The existing public `/data/io.json` bridge contract remains valid for bridge
health, Model Explorer enrichment, and lightweight Comparison evidence.

Scenario Lab I-O analytics needs a stronger contract aligned with the MCP server
tools:

- `io_sector_info`;
- `io_demand_shock`.

This should be introduced as an additive analytics contract rather than by
overloading the current evidence-oriented bridge contract.

## Source Alignment

The MCP implementation in `mcp_server/models/io_model.py` is the current
analytical reference for I-O sector shocks. It supports:

- sector output, value-added, and employment data;
- output multipliers;
- value-added multipliers;
- employment multipliers;
- backward and forward linkages;
- linkage classification;
- final-demand shock propagation through the Leontief inverse;
- ranked sector effects.

The current React public I-O bridge is narrower. It should not be used to claim
employment effects or sector shock simulation until the analytics fields are
exported and validated.

## Proposed Request Shape

```ts
type IoDemandShockRequest = {
  demand_bucket: 'consumption' | 'government' | 'investment' | 'export'
  amount: number
  currency: 'bln_uzs' | 'mln_usd'
  exchange_rate_uzs_per_usd?: number
  distribution: 'output' | 'gva' | 'equal' | 'sector'
  sector_code?: string
}
```

## Proposed Result Shape

```ts
type IoDemandShockResult = {
  model_id: 'io'
  run_id: string
  data_vintage: string
  units: {
    monetary: 'bln_uzs'
    employment: 'persons'
  }
  shock: IoDemandShockRequest
  totals: {
    input_shock: number
    input_currency: 'bln_uzs' | 'mln_usd'
    demand_shock_bln_uzs: number
    output_effect_bln_uzs: number
    value_added_effect_bln_uzs: number
    gdp_accounting_contribution_bln_uzs: number
    employment_effect_persons?: number
    aggregate_output_multiplier?: number
  }
  top_sectors: Array<{
    sector_code: string
    sector_name: string
    output_effect_bln_uzs: number
    value_added_effect_bln_uzs: number
    employment_effect_persons?: number
    output_multiplier?: number
    value_added_multiplier?: number
    employment_multiplier?: number
    backward_linkage?: number
    forward_linkage?: number
    linkage_classification?: 'key' | 'backward' | 'forward' | 'weak'
  }>
  caveats: string[]
}
```

`gdp_accounting_contribution_bln_uzs` is intentionally named as an accounting
contribution, not a macro forecast. It equals the I-O value-added effect unless a
future reconciliation layer applies additional macro consistency adjustments.

## UI Use

Scenario Lab may render this result as:

- KPI totals;
- ranked sector table;
- compact bar chart;
- source/caveat block;
- save-run action.

Comparison may render saved `io_sector_shock` runs in a separate sector-results
block. It must not merge these fields into macro rows.

## Guard Requirements

The frontend guard should validate:

- totals are finite numbers;
- USD shocks have a positive exchange-rate assumption before conversion;
- top sectors are present and bounded;
- sector codes and names are strings;
- optional employment fields are only shown when present;
- linkage classes match the allowed enum;
- caveats are present for public-facing interpretation.

## Non-Claims

The contract does not by itself claim:

- macro GDP growth changes;
- inflation changes;
- fiscal deficit effects;
- general-equilibrium reallocation;
- causal reform impacts.

Those claims require QPM, FPP, CGE, or synthesis contracts.
