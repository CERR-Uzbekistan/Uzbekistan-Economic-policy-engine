# PE Trade Shock Bridge / Frontend Contract

Date: 2026-04-27  
Status: planning contract only; no PE artifact, frontend implementation, backend implementation, live refresh, Scenario Lab activation, or artifact build is authorized by this document  
Scope: bridge contract from the existing PE simulator surface to future frontend surfaces

Review resolution: Claude Code reviewed the proposed PE contract and gave NO-GO until this document fixed output-catalogue column shift, HS coverage reconciliation, elasticity catalogue rows, authority rows, identity tests, partner/regime parity, and runtime-only scenario payload clarification. This document records those fixes while preserving docs-only scope: no simulator rewrite, no backend work, no artifact generation, HFI remains gated, and PE remains excluded from macro comparison surfaces.

## 1. Purpose

PE is a partial-equilibrium product-level trade-shock simulator. It estimates direct product, HS chapter, HS section, partner, trade-creation, trade-diversion, tariff-revenue, and consumer-surplus impacts under declared tariff-scenario assumptions and declared elasticities.

PE is not a macro forecast. It is not a CGE/general-equilibrium engine. It is not a WTO accession recommender. It is not a fiscal-revenue authority.

This contract defines the future bridge from the existing PE simulator at `pe_model/index.html` and `pe_model/pe_data.js` to future frontend and registry surfaces. It must not redefine, replace, or silently broaden the simulator.

## 2. Non-goals

- no artifact build
- no `/data/pe_baseline.json` generated
- no frontend PE tab activation
- no backend implementation
- no live WITS refresh
- no HS coverage expansion
- no CGE coupling
- no GE feedback
- no fiscal-revenue authority claim
- no WTO policy recommendation
- no elasticity re-derivation
- no app-code edits

HFI remains gated. Backend remains gated. This slice is docs-only.

## 3. Existing Simulator Relationship

`pe_model/index.html` is the existing PE simulator. `pe_model/pe_data.js` is the existing simulator data bundle.

The bridge must preserve `pe_model/index.html` and `pe_data.js` semantics. It may define future artifact metadata, caveats, provenance, registry state, and parity expectations, but it must not rewrite trade math.

The bridge must not swap elasticities. Existing sector/chapter elasticity behavior, including any runtime adjustment from registered elasticity values, must be documented and parity-checked before implementation rather than silently replaced.

The bridge must not silently expand HS coverage. Any difference between project-planning coverage, source-data coverage, and simulator-visible coverage is a STOP condition until reconciled in writing.

## 4. Data Lineage

Required lineage fields before implementation:

| Lineage item | Required state before implementation | Current contract state |
|---|---|---|
| WITS snapshot vintage | Frozen snapshot id/date/export hash and source extract location | TO CONFIRM |
| Tariff schedule vintage | Frozen tariff schedule id/date/export hash for MFN, FTA, CIS, and any bound-rate assumptions | TO CONFIRM |
| Owner | Named model/data owner accountable for WITS extract, tariff schedule, and PE baseline | TO CONFIRM |
| License/redistribution class | Written access and redistribution class for WITS/customs/tariff inputs and derived artifact | TO CONFIRM |
| Source script for `pe_data.js` | Script path, version, command, input files, and hash that produced `pe_model/pe_data.js` | TO CONFIRM |
| `pe_data.js` version pin | File hash and accepted baseline version | TO CONFIRM |
| HS-code coverage map | Chapters in, chapters out, partner/regime scope, reason for each exclusion | TO CONFIRM |
| Elasticity provenance | Source, transformation, and tag for every elasticity | TO CONFIRM |

Current known coverage declaration: project docs reference HS 28-40 for PE/WTO accession planning, so the bridge records HS 28-40 as documented `planning_coverage`. The existing simulator also presents an all-HS-sector visible surface, which must be catalogued separately as `simulator_visible_coverage`. The underlying WITS/source extract must be catalogued separately as `source_data_coverage`.

Written reconciliation of `planning_coverage`, `simulator_visible_coverage`, and `source_data_coverage` is required before any UI coverage label is allowed. Simulator all-HS/visible coverage must not silently expand contract authority beyond the accepted coverage map. UI labels must support non-contiguous chapter lists, not only X-Y ranges.

No implementation may proceed until chapters in/out and reasons are accepted by the owner.

## 5. Artifact Concept

Proposed future static artifact path: `/data/pe_baseline.json`.

Named schema: `PeBaselineTradeShockArtifact`.

This artifact is not built in this slice. This contract does not create `/data/pe_baseline.json`, does not regenerate `pe_data.js`, and does not add artifact files.

`PeBaselineTradeShockArtifact` is a future baseline-data artifact concept only. It must represent the accepted baseline WITS/trade/tariff/elasticity surface needed for a future frontend PE tab to render simulator-aligned baseline data and run runtime scenarios without redefining PE math.

## 6. Baseline vs Scenario Split

The baseline artifact contains baseline WITS/trade/tariff/elasticity data, provenance, coverage, methodology tags, caveats, authority metadata, and parity status.

Scenario simulations are runtime-only from `pe_model/index.html` or a future Scenario Lab PE tab. Scenario controls include tariff-cut assumptions, regime filters, HS section/chapter filters, and partner filters.

Scenario outputs are not persisted in `/data/pe_baseline.json` without a separate contract. Saving a scenario, exporting CSV, printing, invoking AI analysis, or emitting a runtime `scenario_save_payload` from the existing simulator does not authorize persistence into the baseline artifact. Runtime-only scenario payloads are out of baseline-catalogue scope unless a later persistence contract explicitly includes them.

## 7. Output Catalogue

Every visible simulator output must be mapped before implementation. The accepted catalogue must include these fields for every output series:

| Required field | Meaning |
|---|---|
| `artifact_field` | Stable field or field pattern in the future `PeBaselineTradeShockArtifact`. |
| `hs_code / product key` | HS10, HS6, HS2/chapter, HS section, partner, regime, or `aggregate`, as applicable. |
| `sector or chapter` | HS section/chapter or partner dimension used by the simulator. |
| `methodology_tag` | `E`, `C`, `I`, or `A`. |
| `unit` | Display and numeric unit. |
| `caveat_template` | Required caveat id/template. |
| `authority_owner` | PE, source owner, shared governance owner, or non-authority label. |
| `parity_tolerance` | Accepted numerical tolerance by chapter/output type. |
| `source_provenance` | WITS/source extract, tariff schedule, elasticity source, identity, or scenario assumption. |

Initial required catalogue:

| Visible output | `artifact_field` | hs_code / product key | sector or chapter | methodology_tag | unit | caveat_template | authority_owner | parity_tolerance | source_provenance |
|---|---|---|---|---|---|---|---|---|---|
| Overview KPI: Total Imports | `meta.total_import_thousand_usd` | aggregate | all accepted coverage | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM | WITS/source extract |
| Overview KPI: data rows | `meta.data_rows_count` | HS10 x country rows | all accepted coverage | E | count | `pe_static_wits_vintage` | PE/source owner | exact integer | WITS/source extract |
| Overview KPI: Goods Imports (MFN) | `regimes.mfn.import_thousand_usd` | regime aggregate | all accepted coverage | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM | WITS/source extract / tariff regime map |
| Overview KPI: FTA/CIS Imports | `regimes.fta.import_thousand_usd` | regime aggregate | all accepted coverage | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM | WITS/source extract / regime map |
| Overview KPI: weighted avg MFN tariff | `tariffs.weighted_avg_mfn_pct` | aggregate | all accepted coverage | I | percent | `pe_tariff_identity` | PE accounting output | TO CONFIRM | import-weighted tariff identity |
| Import by HS section chart | `sections[].import_thousand_usd` | HS section | section | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM by section | WITS/source extract |
| Import by trade regime chart | `regimes[].import_thousand_usd` | regime | all accepted coverage | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM by regime | WITS/source extract / regime map |
| Top import partners chart | `partners[].import_thousand_usd` | partner | partner | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM by partner | WITS/source extract |
| Sections by weighted avg MFN tariff | `sections[].avg_mfn_pct` | HS section | section | I | percent | `pe_tariff_identity` | PE accounting output | TO CONFIRM by section | import-weighted tariff identity |
| Products with highest tariff rates: rate fields | `products_high_tariff[].mfn_rate_pct` | HS10/HS6/product key | chapter/product | E | percent | `pe_product_scope_limited` | source owner | TO CONFIRM by product | tariff schedule |
| Products with highest tariff rates: import/effect fields | `products_high_tariff[].import_and_trade_effect_fields` | HS10/HS6/product key | chapter/product | E/I | thousand USD and percent share | `pe_product_scope_limited` | PE/source owner | TO CONFIRM by product | WITS/source extract / simulator identities |
| Import-demand elasticity | `elasticities.import_demand[]` | HS chapter/section/product key | accepted coverage | C | elasticity coefficient | `pe_partial_equilibrium_only` | PE/source owner | TO CONFIRM by chapter/section | SMART/Armington default or accepted source |
| Substitution / Armington elasticity | `elasticities.substitution_armington[]` | HS chapter/section/product key | accepted coverage | C | elasticity coefficient | `pe_partial_equilibrium_only` | PE/source owner | TO CONFIRM by chapter/section | SMART/Armington default or accepted source |
| Export-supply elasticity if present or used at runtime | `elasticities.export_supply[]` | HS chapter/section/product key | accepted coverage | C | elasticity coefficient | `pe_partial_equilibrium_only` | PE/source owner | TO CONFIRM by chapter/section | SMART/Armington default or accepted source |
| Key findings | `findings[]` | aggregate/derived | all accepted coverage | I | text from numeric identities | `pe_interpretation_not_recommendation` | PE accounting output | generated from accepted fields | simulator-derived narrative |
| Scenario input: tariff cut | `scenario_inputs.tariff_cut_pct` | aggregate/filter-dependent | scenario scope | A | percent | `pe_imposed_tariff_scenario` | user/scenario owner | exact selected value | imposed runtime assumption |
| Scenario input: regime filter | `scenario_inputs.regime` | regime | scenario scope | A | category | `pe_imposed_tariff_scenario` | user/scenario owner | exact selected value | imposed runtime assumption |
| Scenario input: HS section filter | `scenario_inputs.hs_section` | HS section | scenario scope | A | category | `pe_hs_coverage_limited` | user/scenario owner | exact selected value | imposed runtime assumption |
| Scenario input: HS chapter filter | `scenario_inputs.hs_chapter` | HS2 | scenario scope | A | category | `pe_hs_coverage_limited` | user/scenario owner | exact selected value | imposed runtime assumption |
| Scenario input: partner filter | `scenario_inputs.partner` | partner | scenario scope | A | category | `pe_imposed_tariff_scenario` | user/scenario owner | exact selected value | imposed runtime assumption |
| KPI card: Total Trade Effect | `scenario_outputs.total_trade_effect_thousand_usd` | scenario aggregate | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM by output type | trade creation plus diversion identity |
| KPI card: Trade Creation | `scenario_outputs.trade_creation_thousand_usd` | scenario aggregate | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM by output type | simulator PE formula |
| KPI card: Consumer Welfare | `scenario_outputs.consumer_surplus_change_thousand_usd` | scenario aggregate | scenario scope | I | thousand USD | `pe_consumer_surplus_not_total_welfare` | PE accounting output | TO CONFIRM by output type | simulator welfare identity |
| KPI card: Revenue Change | `scenario_outputs.tariff_revenue_change_thousand_usd` | scenario aggregate | scenario scope | I | thousand USD | `pe_revenue_not_fiscal_forecast` | PE accounting output | TO CONFIRM by output type | tariff-revenue accounting identity |
| Trade creation/diversion decomposition chart | `scenario_outputs.trade_decomposition[]` | section/chapter/partner depending view | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM by chapter/output type | simulator decomposition |
| Welfare and revenue chart | `scenario_outputs.welfare_revenue[]` | scenario aggregate | scenario scope | I | thousand USD | `pe_consumer_surplus_not_total_welfare` | PE accounting output | TO CONFIRM by output type | simulator welfare/revenue identities |
| Simulation results table: import base | `scenario_outputs.rows[].import_base_thousand_usd` | section/chapter/partner | scenario scope | E | thousand USD | `pe_static_wits_vintage` | PE/source owner | TO CONFIRM | WITS/source extract filtered at runtime |
| Simulation results table: avg MFN rate | `scenario_outputs.rows[].avg_mfn_pct` | section/chapter | scenario scope | I | percent | `pe_tariff_identity` | PE accounting output | TO CONFIRM | import-weighted tariff identity |
| Simulation results table: trade effect | `scenario_outputs.rows[].trade_effect_thousand_usd` | section/chapter/partner | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM | trade creation plus diversion identity |
| Simulation results table: trade creation | `scenario_outputs.rows[].trade_creation_thousand_usd` | section/chapter/partner | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM | simulator PE formula |
| Simulation results table: trade diversion | `scenario_outputs.rows[].trade_diversion_thousand_usd` | section/chapter/partner | scenario scope | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM | simulator PE formula |
| Simulation results table: welfare gain/change | `scenario_outputs.rows[].consumer_surplus_change_thousand_usd` | section/chapter/partner | scenario scope | I | thousand USD | `pe_consumer_surplus_not_total_welfare` | PE accounting output | TO CONFIRM | simulator welfare identity |
| Simulation results table: revenue change | `scenario_outputs.rows[].tariff_revenue_change_thousand_usd` | section/chapter/partner | scenario scope | I | thousand USD | `pe_revenue_not_fiscal_forecast` | PE accounting output | TO CONFIRM | tariff-revenue accounting identity |
| Simulation results table: impact percent | `scenario_outputs.rows[].impact_pct` | section/chapter/partner | scenario scope | I | percent | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM | trade effect divided by import base |
| Sector/chapter table: share | `baseline.rows[].import_share_pct` | section/chapter | accepted coverage | I | percent | `pe_static_wits_vintage` | PE accounting output | TO CONFIRM | import share identity |
| Partner table: country | `partners[].name` | partner | partner | E | text | `pe_static_wits_vintage` | source owner | exact string after normalization | WITS/source extract |
| Partner table: regime | `partners[].regime` | partner/regime | partner | E | category | `pe_static_wits_vintage` | source owner | exact normalized category | regime map |
| Partner table: net effect | `partners[].net_effect_thousand_usd` | partner | partner | I | thousand USD | `pe_partial_equilibrium_only` | PE accounting output | TO CONFIRM | trade creation plus diversion identity |
| Export surface: simulation CSV | `exports.simulation_csv.columns[]` | export columns | scenario scope | I | CSV metadata | `pe_export_not_authority` | PE/frontend bridge | exact column names and values | simulator export |
| Export surface: sector CSV | `exports.sector_csv.columns[]` | export columns | section/chapter | I | CSV metadata | `pe_export_not_authority` | PE/frontend bridge | exact column names and values | simulator export |
| Export surface: partner CSV | `exports.partner_csv.columns[]` | export columns | partner | I | CSV metadata | `pe_export_not_authority` | PE/frontend bridge | exact column names and values | simulator export |
| Export surface: print output | `exports.print_surface` | rendered current tab | current view | I | rendered document | `pe_export_not_authority` | PE/frontend bridge | visual regression TO CONFIRM | simulator print surface |

If the simulator emits an export surface beyond CSV/print, the accepted catalogue must add it before implementation. Runtime scenario-save payloads and AI advisor surfaces are out of baseline-catalogue scope unless separately contracted.

## 8. Methodology Tags

Every output series must carry one primary methodology tag:

| Tag | Definition |
|---|---|
| `E` | Observed trade flows / tariffs from WITS or accepted source extracts. |
| `C` | Calibrated import-demand and substitution elasticities, SMART/Armington defaults, or accepted calibrated parameters. |
| `I` | Identities/conversions such as tariff-revenue identity, import shares, trade-effect totals, welfare decomposition, and ad-valorem/specific conversions. |
| `A` | Imposed scenario assumptions such as tariff cuts, regime filters, HS filters, partner filters, or WTO bound rates. |

Elasticities must be tagged `C`. Tariff-cut scenarios and WTO bound-rate assumptions must be tagged `A`.

## 9. Authority Table

| Variable family | PE authority | Non-authority / boundary |
|---|---|---|
| Product-level partial-equilibrium trade impact | PE owns product-level partial-equilibrium trade impact under declared elasticities. | PE does not own GE feedback or economy-wide impacts. |
| Trade creation/diversion | PE owns accounting and simulator-aligned decomposition under accepted assumptions. | Not a macro forecast and not a policy recommendation. |
| Consumer-surplus change | PE owns consumer-surplus accounting under PE assumptions. | Consumer-surplus welfare is not total welfare. |
| Tariff-revenue change | PE owns tariff-revenue change as an accounting output. | Tariff-revenue change is not a fiscal forecast and does not own fiscal balance. |
| Tariff schedule / MFN / FTA / CIS regime map | PE may consume accepted source classifications and compute PE outputs from them. | Source owner owns tariff schedule and regime classification authority; PE is non-authority for source tariff/regime definitions. |
| HS classification / partner classification | PE may consume accepted HS and partner classifications for grouping and filtering. | Source owner owns HS classification and partner classification authority; PE is non-authority for classification definitions. |
| BoP closure | None. | PE does not own BoP closure; FPP owns FPP closure when contracted. |
| GE feedback | None. | PE does not own GE feedback; CGE owns GE feedback when contracted. |
| Fiscal balance | None. | PE does not own fiscal balance; FPP owns fiscal balance/path consistency when contracted. |
| Macro inflation | None. | PE does not own macro inflation; QPM owns macro inflation when contracted. |
| Nowcast trade values | None. | PE does not own nowcast trade values; DFM owns nowcast trade values when contracted. |
| WTO accession recommendation | None. | PE may evaluate an imposed scenario, but it must not recommend WTO policy. |

## 10. Caveat Framework

The bridge requires caveats in English, Russian, and Uzbek before any user-facing PE implementation. Caveats must exist at sector and series level where interpretation differs.

Required caveat themes:

| Caveat id | Required EN/RU/UZ meaning |
|---|---|
| `pe_partial_equilibrium_only` | Partial equilibrium only. |
| `pe_no_ge_feedback` | No GE feedback. |
| `pe_consumer_surplus_not_total_welfare` | Consumer-surplus welfare is not total welfare. |
| `pe_wto_assumption_not_recommendation` | WTO accession scenario is an imposed assumption, not a recommendation. |
| `pe_hs_coverage_limited` | HS coverage is limited to accepted chapters and does not imply full product coverage unless proven. |
| `pe_static_wits_vintage` | Static WITS vintage; no live refresh. |
| `pe_revenue_not_fiscal_forecast` | Tariff-revenue change is PE accounting, not a fiscal forecast. |
| `pe_export_not_authority` | Exported files carry the same PE caveats and do not add authority. |
| `pe_runtime_only` | Runtime scenario output is not persisted into the baseline artifact. |

Partial-language caveats block UI activation.

## 11. Boundary vs CGE

PE results must not be presented as economy-wide impact.

CGE owns GE feedback when contracted. PE may provide product-level partial-equilibrium shock outputs under declared assumptions, but it does not model factor reallocation, income feedback, price-system closure, economy-wide welfare, fiscal closure, or macro feedback.

No CGE coupling is authorized by this contract.

## 12. Scenario Lab PE Tab Boundary

The Scenario Lab PE tab remains planned until this contract is accepted and the future artifact exists.

A future PE tab can show product-level trade-shock outputs, including imports, tariff rates, trade creation, trade diversion, tariff-revenue change, consumer-surplus change, partner effects, and HS section/chapter surfaces.

The future PE tab must not show a macro forecast or policy recommendation. It must be labelled as an imposed tariff scenario and partial-equilibrium estimate.

## 13. Comparison Boundary

PE outputs must not enter the macro 7-row comparison table.

If implemented later, PE comparison must use a separate trade-comparison block with PE-specific labels, units, caveats, authority boundaries, and parity status. PE must not populate QPM, DFM, FPP, or CGE macro rows.

## 14. Data Registry Representation

Until the artifact exists, Data Registry state for PE must be planned/unavailable by default.

Required future Data Registry fields:

| Field | Required representation |
|---|---|
| Availability | planned/unavailable default until accepted artifact exists. |
| WITS vintage | frozen WITS/source extract date/id/hash; TO CONFIRM until frozen. |
| Tariff schedule vintage | frozen tariff schedule date/id/hash for MFN, FTA, CIS, and bound-rate assumptions; TO CONFIRM until frozen. |
| HS coverage percent | accepted chapters divided by declared chapter universe, plus chapters-in/out list. |
| `simulator_coverage_vs_planning_coverage_status` | planned/unavailable until written reconciliation of `planning_coverage`, `simulator_visible_coverage`, and `source_data_coverage` is accepted. |
| Methodology-tag coverage percent | percent of accepted output catalogue entries populated with `E`, `C`, `I`, or `A`. |
| Parity status | planned/unavailable until tests exist; then pass/warning/failed by chapter/output type. |
| License/access class | accepted written redistribution/access class. |
| Caveat/review status | EN/RU/UZ caveat approval state and model-owner review state. |
| Simulator relationship | pointer to `pe_model/index.html` and accepted `pe_data.js` version pin. |

The Data Registry must not present planned/unavailable PE as a failed artifact. It must not claim economic validation, live refresh, WTO recommendation, fiscal forecast, or CGE authority.

## 15. Identity Tests

Required identity tests before implementation:

| Test id | Required closure |
|---|---|
| `pe_identity_tariff_revenue` | Tariff revenue identity, including baseline tariff rate, scenario tariff rate, import base, and tariff-revenue change. |
| `pe_identity_import_value` | Import value identity across HS/product, partner, regime, section/chapter, and aggregate totals. |
| `pe_identity_import_share` | Import share percent identity across section, chapter, partner, regime, and aggregate views. |
| `pe_identity_impact_percent` | Impact percent identity, including trade effect divided by import base under accepted rounding rules. |
| `pe_identity_welfare_decomposition` | Welfare decomposition closure for consumer-surplus change, tariff-revenue change, trade creation, trade diversion, and net displayed summaries. |
| `pe_identity_ad_valorem_specific_conversion` | Ad-valorem to specific conversion if applicable; otherwise documented non-applicability. |

Each test case must include input rows, expected outputs, units, rounding rules, scenario assumptions, source provenance, and parity tolerance.

## 16. Three-Way Parity

Three-way parity is required between:

- WITS raw/source extract;
- `pe_data.js`;
- `pe_model/index.html` simulator.

Parity tolerances must be declared per HS chapter and output type. At minimum, tolerance declarations must cover:

| Output type | Required tolerance declaration |
|---|---|
| import values | absolute/relative tolerance by HS chapter and aggregate. |
| partner aggregate | absolute/relative tolerance by partner and aggregate partner totals. |
| regime aggregate | absolute/relative tolerance by MFN, FTA, CIS/full-tariff regime, and aggregate regime totals. |
| tariff rates | percentage-point tolerance by HS chapter/section and regime. |
| trade creation | absolute/relative tolerance by HS chapter and scenario. |
| trade diversion | absolute/relative tolerance by HS chapter and scenario. |
| tariff-revenue change | absolute/relative tolerance by HS chapter and scenario. |
| consumer-surplus change | absolute/relative tolerance by HS chapter and scenario. |
| welfare summary | closure tolerance for displayed totals. |
| export CSV values | exact column/rounding tolerance against simulator export. |

Three-way parity must include rounding rules, unit conventions, treatment of filtered views, treatment of zero-import rows, and any intentionally excluded fields.

## 17. Simulator Self-labeling

Any future PE surface must require these labels:

- Partial-equilibrium estimate
- Imposed tariff scenario
- Not a macro impact
- Limited to accepted HS chapters

The accepted UI copy must show the accepted chapter range or explicit chapter list. Labels must support non-contiguous coverage, for example "Limited to HS chapters 28-31, 34, 39-40", not only a single X-Y range. If coverage reconciliation is not accepted, the PE tab remains unavailable.

## 18. STOP Conditions

Any one missing means STOP.

1. WITS data vintage frozen, owner confirmed, license/redistribution class confirmed in writing.
2. pe_data.js source script + provenance documented and version-pinned.
3. HS-code coverage explicitly catalogued (chapters in, chapters out, reason), with written reconciliation of `planning_coverage`, `simulator_visible_coverage`, and `source_data_coverage`; no UI coverage label may appear before this reconciliation is accepted.
4. Elasticity provenance documented; each elasticity tagged C.
5. Caveat copy approved in EN/RU/UZ at sector and series level.
6. Authority table accepted across PE / CGE / FPP / QPM / DFM for all shared variables.
7. Methodology tags E / C / I / A populated for every simulator output series.
8. Output series catalogue accepted.
9. Identity-closure test cases written.
10. Three-way parity tolerances declared.
11. Data Registry entry shape accepted with planned/unavailable default.
12. Existing pe_model/index.html simulator confirmed to accept PeBaselineTradeShockArtifact schema without rewrite.
13. Backend operations + fallback contracts accepted.
14. Comparison-table boundary accepted: PE excluded from macro 7-row table.

## 19. Risks and Open Questions

Ranked risks:

1. PE presented as macro impact
2. HS coverage gap hidden
3. calibrated elasticities labelled as estimated
4. tariff-revenue read as fiscal balance
5. WTO scenario read as recommendation
6. WITS vintage drift
7. welfare decomposition read as total welfare
8. cross-model collision

Open questions:

- What is the frozen WITS/source vintage, and who owns it?
- Which source script produced `pe_model/pe_data.js`, and which inputs/version generated the accepted data file?
- Is accepted implementation coverage HS 28-40, all simulator-visible HS sectors, or a narrower owner-approved set?
- Which chapters are out of scope, and why?
- Which elasticity set is authoritative for every chapter/section and scenario?
- What license/access class applies to source extracts and any future static artifact?
- How should existing simulator save/AI/export surfaces be represented, if at all, in future frontend contracts?

## 20. Review / Implementation Sequence

Required sequence:

1. stakeholder/model owner review
2. WITS/source freeze
3. caveat approval
4. output catalogue acceptance
5. parity test design
6. then artifact contract/implementation slice
7. no app implementation until STOP gates clear

No PE frontend implementation, backend implementation, artifact generation, `pe_data.js` regeneration, HFI activation, CGE coupling, comparison-table integration, or push is authorized by this contract.
