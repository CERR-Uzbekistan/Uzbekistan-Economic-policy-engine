# FPP Bridge / Frontend Contract

Date: 2026-04-27  
Status: planning contract only; no FPP artifact, frontend implementation, backend implementation, Scenario Lab implementation, or artifact build is authorized by this document  
Scope: bridge contract from the canonical FPP workbook and existing simulator semantics to future frontend surfaces

Review resolution: Claude Code required five corrections before acceptance: methodology-tag correction, artifact path fix, baseline/scenario split, CAEM parity correction, and a testable STOP gate 8 tied to a named baseline artifact schema.

## 1. Purpose

FPP is a fiscal/path consistency framework. It checks whether real-sector, external-sector, fiscal-sector, and monetary-sector paths can be presented as an internally consistent accounting path under declared assumptions.

FPP must not be presented as a macro forecast. It is not the authority for the QPM inflation path, DFM nowcast, or any live policy forecast. Its role in the frontend is to expose simulator-aligned consistency outputs with clear assumptions, caveats, authority boundaries, provenance, and parity evidence.

This contract defines the bridge from the canonical workbook and already-shipped simulator to future frontend surfaces. It does not redefine the model, replace the simulator, generate an artifact, or authorize implementation.

## 2. Non-Goals

- no simulator rewrite;
- no macro forecast claim;
- no synthesis bridge;
- no live refresh;
- no backend implementation;
- no artifact build;
- no Scenario Lab implementation yet.

## 3. Workbook Variants and Canonical Lineage

Known workbook variants:

| Variant | Status | Contract treatment |
|---|---|---|
| `desk-2024-09` | Non-canonical | Reference only; may help explain lineage but must not drive frontend output. |
| `caem-2025-09` | Non-canonical | Reference only for documentary parity / variant drift checks; it is not a data source, including transitionally. |
| `unified-v1` | Canonical | Only canonical source for future artifact export and frontend bridge acceptance. |

Only `unified-v1` is canonical. Non-canonical variants are reference material only and must not be treated as active data sources, export sources, or frontend authority.

Before any implementation, the owner must provide a sheet/range map for `unified-v1`. The map must identify every source workbook sheet/range used for each simulator output series, each imposed scenario input, each identity calculation, and each diagnostic.

## 4. Existing Simulator Relationship

`fpp_model/index.html` is the already-shipped FPP simulator. It contains the current browser implementation, visible sector organization, scenario inputs, projection table, consistency matrix, charts, export functions, and explanatory model/equation copy.

This contract must preserve simulator semantics. Any future frontend FPP tab consumes a simulator-aligned artifact; it must not rewrite the model, reinterpret output series, or replace `fpp_model/index.html` with a new calculation path.

The frontend bridge may normalize names, metadata, caveats, and validation state, but numerical semantics must remain aligned with the shipped simulator and the canonical `unified-v1` workbook after parity gates are accepted.

## 5. Artifact Concept

Proposed future static artifact path: `/data/fpp_baseline.json`.

This path is proposed only. No artifact is created in this slice.

The artifact must represent the full simulator baseline output surface, not only a fiscal subset. It must include the four FPP sectors, cross-sector closure outputs, diagnostics, methodology tags, caveats, provenance, and parity status needed for the frontend to show the FPP baseline path without recomputing the model.

### Baseline Projection vs Scenario Simulation

`baseline_projection` is the persisted static artifact output class. Its named schema is `FppBaselineProjectionArtifact`, and its future path is `/data/fpp_baseline.json`.

`FppBaselineProjectionArtifact` must contain the accepted baseline output catalogue, workbook lineage, sector organization, methodology tags, caveat ids, authority metadata, and parity/diagnostic status. It is the only FPP artifact class covered by this contract.

`scenario_simulation` is runtime-only. It is produced by `fpp_model/index.html` against a baseline when a user changes scenario inputs. Scenario simulations must not be written into `/data/fpp_baseline.json`.

Scenario runs require a separate future persistence contract before they can be saved outside the existing simulator/runtime context.

## 6. Full Simulator Output Surface

The output catalogue must cover all four FPP sectors plus cross-sector closure and diagnostics. It must not filter the bridge down to fiscal balance or debt alone.

For every output series, the accepted catalogue must include:

| Required field | Meaning |
|---|---|
| `artifact_field` | Stable path in the future artifact, for example `series.real.gdp_growth_pct`. |
| `sector` | One of the accepted FPP sector labels or `cross_sector_closure` / `diagnostic`. |
| `methodology_tag` | `E`, `C`, `I`, or `A`. |
| `unit` | Display and numeric unit, including percent, percentage point, UZS, USD, months, index, or dimensionless. |
| `frequency` | Annual in the current simulator surface unless the canonical workbook map proves otherwise. |
| `caveat_template` | Caveat id or copy template required for the series. |
| `authority_owner` | QPM, DFM, FPP, source owner, or shared governance owner, as accepted in the authority table. |
| `parity_tolerance` | Numerical tolerance against workbook and simulator, declared before implementation. |
| `source_workbook_sheet_range` | Exact `unified-v1` sheet/range. `TO CONFIRM` until mapped. |

Minimum visible series groups from `fpp_model/index.html` that must be catalogued before implementation:

| Group | Visible simulator outputs | Required status |
|---|---|---|
| KPI cards | average GDP growth, final-year reserve import cover, final-year fiscal balance, final-year inflation | Required |
| Real sector table/chart | real GDP growth, CPI inflation via Phillips Curve, imported inflation, output gap, NER depreciation, NER level, nominal GDP in UZS, nominal GDP in USD, real policy rate | Required |
| External sector table/chart | current account percent of GDP, current account USD, change in reserves, reserve assets, import cover, external debt percent of GDP, FDI inflows where charted | Required |
| Fiscal sector table/chart | revenue, expenditure, overall fiscal balance, primary balance, interest payments, financing need, government debt | Required |
| Monetary sector table/chart | monetary aggregate level (M2/M3 label TO CONFIRM), monetary aggregate growth (M2/M3 TO CONFIRM), velocity, NFA, change in NFA contribution, change in NDA contribution, NFA/GDP, NDA/GDP, real policy rate | Required |
| Consistency matrix | growth vs potential, inflation vs target, reserve adequacy, fiscal position, debt dynamics | Required |
| Chart uncertainty surface | inflation fan bands if retained from simulator | Required if displayed |
| Export surface | CSV/PDF/PNG output fields | Required only if future frontend exposes export |

The catalogue may add workbook-native series only if they are present in `unified-v1`, aligned to simulator semantics, and accepted by the owner. It must not omit any simulator output series.

## 7. Four-Sector Organization

The current simulator labels the four FPP sectors as:

| Sector key | Simulator label | Status |
|---|---|---|
| `real` | Real Sector | Known from `fpp_model/index.html`. |
| `external` | External Sector | Known from `fpp_model/index.html`. |
| `fiscal` | Fiscal Sector | Known from `fpp_model/index.html`. |
| `monetary` | Monetary Sector | Known from `fpp_model/index.html`. |

Any workbook-specific sector labels, sheet names, or CAEM terminology that differ from the simulator labels are `TO CONFIRM` until the `unified-v1` sheet/range map is accepted. Do not invent alternate sector names.

## 8. Methodology Tags

Every simulator output series must carry exactly one primary methodology tag:

| Tag | Definition |
|---|---|
| `E` | Estimated. The value comes from observed data, empirical estimation, or accepted workbook estimates. |
| `C` | Calibrated. The value is a calibrated parameter, benchmark, target, or coefficient accepted by the workbook/model owner. |
| `I` | Identity. The value is produced by an accounting identity, residual closure, transformation, or cross-sector closure calculation. |
| `A` | Assumption. The value is an imposed baseline or scenario assumption. |

Do not overload `I` to mean imposed assumption. If existing FPP workbook terminology uses different labels, the bridge may show the workbook wording as display copy, but the artifact catalogue must still map each series to `E`, `C`, `I`, or `A`.

## 9. Authority Table

Shared variables must not blur model authority. FPP values are consistency-path values under FPP assumptions unless explicitly accepted by another model owner.

| Variable family | QPM authority | DFM authority | FPP authority | Boundary rule |
|---|---|---|---|---|
| Inflation | Macro scenario and monetary transmission authority when QPM is the selected macro scenario. | Nowcast context only if DFM exposes observed/near-term inflation inputs; not a structural inflation authority. | FPP Phillips Curve consistency path under imposed assumptions. | FPP inflation must not be read as the QPM inflation forecast or DFM nowcast. |
| FX | QPM macro scenario authority where QPM produces or consumes FX paths. | Indicator/nowcast context only where DFM inputs include FX-related series. | FPP NER path and depreciation assumptions for consistency accounting. | FPP FX is an imposed/derived path, not the platform FX forecast. |
| Growth | QPM macro scenario authority for scenario growth paths. | DFM nowcast authority for near-term GDP nowcast where accepted. | FPP real-sector consistency path and output-gap accounting. | FPP growth is a path assumption/consistency output, not a DFM nowcast. |
| Policy rate | QPM owns policy-rate scenario authority where QPM monetary policy scenarios are active. | DFM has no policy-rate authority except as an input indicator if separately accepted. | FPP may consume/display policy-rate assumptions for real-rate and consistency calculations. | FPP policy rate values are assumptions or derived real-rate inputs, not FPP policy recommendations. |
| Monetary aggregates | QPM may own monetary-transmission channels if contracted. | DFM may consume monetary indicators as nowcast inputs only. | FPP owns monetary aggregate closure within the FPP path; exact M2/M3 label is TO CONFIRM. | FPP monetary aggregates are accounting-path values, not DFM signals or QPM forecasts. |
| Fiscal balance | No authority unless a QPM scenario explicitly imports fiscal assumptions. | No authority. | FPP owns fiscal balance consistency within the FPP path. | FPP fiscal balance is a fiscal/path consistency result, not a macro forecast. |
| Debt | No authority unless separately contracted. | No authority. | FPP owns debt dynamics within the FPP path. | Debt paths must carry FPP caveats and source lineage. |
| Revenue/expenditure | No authority unless separately contracted. | No authority. | FPP owns revenue/expenditure assumptions and calculated fiscal ratios within the FPP path. | Revenue/expenditure values must be shown as assumptions or accounting outputs, not policy recommendations. |

## 10. Caveat Framework

The FPP bridge must include caveat copy in English, Russian, and Uzbek before any user-facing implementation. EN/RU/UZ caveat strings must be authored and reviewed together; partial-language caveats block UI display.

Required caveat layers:

- sector-level caveats for Real, External, Fiscal, and Monetary sectors;
- series-level overrides for outputs whose interpretation differs from the sector default;
- no-forecast language stating that FPP is a consistency path, not a macro forecast;
- internal-preview language if the artifact or caveats have not completed review.

Minimum caveat themes:

- assumptions drive the path;
- calculated identities are accounting closure, not causal estimates;
- imposed assumptions must be labelled;
- FPP values do not override QPM or DFM authority;
- workbook lineage and redistribution limits must be visible where relevant;
- internal-preview outputs require review before external use.

## 11. Scenario Lab FPP Tab Boundary

A future Scenario Lab FPP tab may show fiscal/path consistency outputs once the artifact is accepted.

Boundaries:

- no cross-model synthesis;
- no automatic QPM/DFM coupling;
- no policy recommendation from FPP alone;
- no hidden recomputation in the frontend;
- no activation before the accepted artifact, catalogue, caveats, parity tests, and Data Registry representation exist.

## 12. Comparison Boundary

FPP outputs must not enter the macro 7-row comparison table unless separately contracted.

If FPP comparison is implemented later, it should be a separate fiscal/path block with FPP-specific labels, authority boundaries, caveats, and comparison logic. It must not silently populate macro forecast rows or overwrite QPM/DFM values.

## 13. Data Registry Representation

Until an artifact exists, Data Registry state for FPP must remain planned/unavailable and must not look like a failed artifact.

Required future Data Registry fields:

| Field | Required representation |
|---|---|
| Workbook variant | `unified-v1` canonical; non-canonical variants listed only as reference lineage where useful. |
| Canonical snapshot | Frozen snapshot id/date/hash/owner once accepted; planned/unavailable until freeze. |
| Artifact export | `/data/fpp_baseline.json` only after artifact exists; planned/unavailable before then. |
| Simulator parity status | planned/unavailable until parity tests exist; then pass/warning/failed with tolerance summary. |
| `parity_caem_2025_09` | Documentary parity / variant drift status against `caem-2025-09`, not a canonical data-source status. |
| `methodology_tag_coverage_pct` | Percent of accepted output catalogue entries with populated `E`, `C`, `I`, or `A` tags. |
| Caveat/review status | EN/RU/UZ caveat approval state plus internal-preview status where relevant. |
| Planned/unavailable state | Required default until artifact, provenance, caveats, catalogue, and parity are accepted. |

Data Registry guard validation, when implemented, may validate artifact shape and metadata. It must not claim economic validation, model validation, or live refresh.

## 14. Identity Closure

Six identity-closure tests are required before implementation. Exact formulas are `TO CONFIRM` until documented from `unified-v1` and reconciled with `fpp_model/index.html`. Import cover is a derived adequacy ratio, not an identity, unless the workbook owner proves otherwise.

Required closure-test slots:

| Test id | Identity area | Formula status |
|---|---|---|
| `fpp_identity_real_gdp` | Real GDP | TO CONFIRM |
| `fpp_identity_nominal_gdp` | Nominal GDP | TO CONFIRM |
| `fpp_identity_bop` | Balance of payments | TO CONFIRM |
| `fpp_identity_savings_investment` | Savings-investment closure | TO CONFIRM |
| `fpp_identity_fiscal` | Fiscal balance, financing, and debt dynamics | TO CONFIRM |
| `fpp_identity_monetary` | Monetary survey closure, including M2/M3 label and aggregate definition TO CONFIRM | TO CONFIRM |

Each identity must have test cases before implementation. Test cases must include baseline values, at least one changed-assumption scenario, expected outputs, tolerance, and source workbook sheet/range references.

## 15. Three-Way Parity

The bridge must require three-way parity / variant-drift checking between:

- `unified-v1` workbook;
- `fpp_model/index.html` simulator;
- `caem-2025-09` documentary parity / variant drift check.

Parity tolerances must be declared per sector before implementation. At minimum, tolerances must cover Real, External, Fiscal, Monetary, cross-sector closure, and diagnostics. The tolerance declaration must state rounding rules, units, acceptable absolute/relative differences, treatment of displayed percentages, and any fields intentionally excluded from parity.

Future frontend-vs-artifact checks are rendering/regression tests, not parity tests. They may verify that the frontend renders `FppBaselineProjectionArtifact` faithfully, handles unavailable states, and preserves labels/caveats, but they must not replace workbook/simulator/variant parity review.

No frontend FPP tab should ship until parity and rendering/regression status are accepted or explicitly marked as failed/unavailable with the tab disabled.

## 16. Simulator Self-Labeling

FPP UI labels and copy must prevent forecast misreading.

Required label concepts:

- consistency path;
- accounting identity;
- imposed assumption;
- not a macro forecast.

Examples of acceptable UI phrasing:

- "FPP consistency path";
- "Accounting identity result";
- "Imposed scenario assumption";
- "Not a macro forecast";
- "Simulator-aligned path".

Avoid labels that imply forecast authority, such as "official forecast", "macro forecast", "expected outcome", or "recommended policy path".

## 17. STOP Conditions

Any one missing means STOP.

1. unified-v1 workbook frozen snapshot exists, owner-confirmed, with sheet/range map
2. Workbook owner, license/access class, redistribution rule confirmed in writing
3. Caveat copy approved EN/RU/UZ, defined per sector with per-series overrides where needed
4. QPM / DFM / FPP authority table accepted across the full series list
5. Identity-closure test cases written for all six identities
6. Three-way parity tolerances declared per sector
7. Data Registry entry shape accepted
8. Existing in-app FPP simulator confirmed to accept `FppBaselineProjectionArtifact` / `baseline_projection` schema
9. Backend operations + fallback contracts accepted
10. Methodology tags E / C / I / A populated for every simulator output series
11. Output series catalogue accepted: every simulator output mapped to artifact field, sector, methodology tag, caveat template

## 18. Risks

Ranked risks:

1. full output surface mis-presentation;
2. schema drift with simulator;
3. variant lineage confusion;
4. workbook provenance debt;
5. QPM/DFM/FPP shared-variable collision;
6. premature backend coupling;
7. synthesis scope creep.

## 19. Review / Implementation Sequence

Required sequence:

1. stakeholder review;
2. `unified-v1` freeze;
3. caveat approval;
4. output catalogue acceptance;
5. then artifact contract/implementation slice;
6. PE contract follows as docs-only later at `docs/data-bridge/08_pe_contract.md`.

No FPP implementation, backend implementation, artifact generation, Scenario Lab activation, or push is authorized by this contract.

## 20. Open Questions

The following items remain unresolved and block implementation:

- sheet/range map for `unified-v1`;
- exact formulas for the six identity-closure tests;
- whether the monetary aggregate label and source definition should be M2, M3, or another workbook-specific aggregate;
- sector label normalization between workbook terminology, CAEM wording, simulator labels, and future frontend labels.
