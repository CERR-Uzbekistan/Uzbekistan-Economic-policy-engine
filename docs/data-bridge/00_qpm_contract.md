# QPM Data Bridge — Consumer Contract

**Source:** `scripts/export_qpm.R` → `apps/policy-ui/public/data/qpm.json`
**Status:** Option B (nightly static JSON) — TB-P2 adopted 2026-04-20
**Version:** solver 0.3.0, data from QPM attribution

See also: `docs/data-bridge/qpm-v1-validation-note.md` for the QPM v1 validation/model note.

## Purpose

This file is consumed by the frontend Scenario Lab and Model Explorer
pages to replace the illustrative mock with real solver output.

## Shape

```
{
  attribution: ModelAttribution,
  parameters:  ParameterDescriptor[],  // canonical calibration parameters
  scenarios:   QpmScenario[],          // 5 entries
  caveats:     Caveat[],               // severity info/warning
  metadata:    { exported_at, source_script_sha, solver_version, baseline_source? }
}
```

`ModelAttribution` and `Caveat` map directly onto the types in
`apps/policy-ui/src/contracts/data-contract.ts`. `ParameterDescriptor`
and `QpmScenario` are QPM-specific and should be modelled in
`apps/policy-ui/src/data/bridge/qpm-types.ts` when consumer wiring
lands.

## Unit conventions

| Field | Unit | Notes |
|---|---|---|
| `parameters[].value` | decimal or percent | Per parameter. See `range_min`/`range_max` for expected scale. |
| `scenarios[].paths.gdp_growth` | percent YoY | e.g., 5.81 = 5.81% |
| `scenarios[].paths.inflation` | percent YoY | e.g., 3.39 = 3.39% |
| `scenarios[].paths.policy_rate` | percent (annualised) | e.g., 7.20 = 7.20% |
| `scenarios[].paths.exchange_rate` | UZS per USD, level | e.g., 14083 |
| `scenarios[].shocks_applied.rs_shock` | **percentage points** | +1.0 = 100 bp hike |
| `scenarios[].shocks_applied.s_shock` | **percentage points** | +10 = ~10% log depreciation |
| `scenarios[].shocks_applied.gap_shock` | **percentage points** | −0.5 = 50 bp demand weakness |
| `scenarios[].shocks_applied.pie_shock` | **percentage points** | +1.0 = 100 bp inflation shock |

The `s_shock` percentage-points convention is locked by the solver
(`/100` conversion to log units inside `paths_from_solver`). Do not
re-scale on the consumer side.

## Absent fields, by design

- **No uncertainty bands.** The legacy UI has Monte Carlo fan charts
  (8% CV, 80 draws) computed interactively. The nightly export does
  not include them; adding them is a Sprint 3+ item. ChartRenderer
  should degrade gracefully when `uncertainty_band` is absent.
- **No model_id on individual scenarios.** All scenarios in this file
  are QPM-sourced. For multi-model consumption, the caller tags
  attribution from the top-level `attribution` field.
- **No sensitivity table, no parameter overrides.** The export uses
  the canonical Uzbekistan calibration. Parameter-sweep variants are
  out of scope for Option B.
- **Baseline source metadata is additive.** QPM v1 can derive initial
  conditions from the latest approved Overview artifact; if it is
  missing or invalid, the deterministic Q1 2026 fallback remains.
- **Displayed baseline levels are anchored.** Solver 0.3.0 keeps the
  visible baseline path near the accepted Overview/nowcast baseline and
  adds QPM shock deviations around that path. The raw steady-state
  transition is not shown as the baseline forecast.

## Freshness

The JSON is regenerated nightly by a GitHub Actions workflow
(`.github/workflows/data-regen.yml` — to be added in the PR following
this one). `attribution.timestamp` and `attribution.run_id` reflect
the nightly build. If the JSON is older than 48 hours,
ChartRenderer/PageHeader should surface the vintage prominently.

## Consumer wiring checklist (Sprint 2)

- [ ] `apps/policy-ui/src/data/bridge/qpm-types.ts` — QPM-specific
      TypeScript types (`QpmScenario`, `ParameterDescriptor`).
- [ ] `apps/policy-ui/src/data/bridge/qpm-guard.ts` — schema validator
      with path-level issues, matching the per-page guard pattern.
- [ ] `apps/policy-ui/src/data/bridge/qpm-client.ts` — fetch
      `/data/qpm.json`, validate, adapt to `ScenarioLabResultsBundle`
      for each scenario.
- [ ] Integration test: given `qpm.json` fixture → produces a valid
      `ScenarioLabResultsBundle` for each of the five scenarios.
