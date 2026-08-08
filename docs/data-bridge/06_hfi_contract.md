# High-Frequency Indicators Contract

Date: 2026-04-27  
Status: planning contract only; no HFI data artifact, backend storage, frontend wiring, or scheduler is authorized by this document  
Scope: source and artifact contract for a future high-frequency indicators monitoring layer

## 1. Purpose

High-frequency indicators (HFI) are a monitoring and early-warning layer for the platform's unified macro/micro snapshot. They should help users see whether current conditions are moving before slower quarterly or annual model inputs are refreshed.

HFI is not a structural model output. It must not be presented as a policy forecast, calibrated causal effect, QPM scenario, DFM refit, I-O shock, CGE result, FPP fiscal projection, or cross-model synthesis result.

Allowed use:

- monitor recent price, FX, trade, fiscal, electricity, energy, and activity signals;
- flag missing, stale, or unusually moving indicators;
- support Overview current-state monitoring signals and future DFM Nowcast context;
- provide source-vintage and update-status evidence in Data Registry.

Not allowed without additional accepted contracts:

- no unsupported policy recommendation from HFI alone;
- no conversion of an HFI signal into a model forecast without a DFM, QPM, or other accepted model bridge;
- no claim of live refresh, scheduler success, or backend authority before operations and fallback contracts are accepted;
- no invented values, manual copy/paste values without provenance, or hidden refresh process.

## 2. Candidate Indicator Families

The first HFI inventory is limited to five in-scope families. Each family below is a candidate source lane, not an accepted data feed.

| Family | Why it matters | Initial posture |
|---|---|---|
| Prices / inflation proxies | Early signal for CPI, food pressure, administered price changes, and inflation persistence. | Candidate |
| FX / financial conditions | Exchange-rate pressure, liquidity, policy transmission, credit, reserves, and market conditions. | Candidate |
| Trade / customs | Imports, exports, border flows, and external demand pressure before quarterly balance data. | Candidate |
| Fiscal / revenue | Budget execution, tax receipts, customs revenue, cash-flow pressure, and fiscal impulse context. | Candidate |
| Electricity / energy activity proxy | Production and demand proxy, especially if available daily, weekly, or monthly. | Candidate |

## 3. Deferred Families

The following families are explicitly deferred and are not required for the first HFI artifact:

| Deferred family | Why deferred |
|---|---|
| Labor / firm activity | Source ownership is unclear; cadence is unclear; tax, payroll, vacancy, firm registry, e-invoice, or sales data may carry provider, licensing, confidentiality, or privacy constraints. |
| Mobility / transport | Source ownership is unclear; cadence is unclear; rail, air, road, border, port, or third-party mobility data may carry provider, licensing, methodology-break, or access restrictions. |

Deferred families should not appear in the first in-scope candidate table, first artifact enum, or first user-facing HFI source inventory. They can be reconsidered only through a later source-contract update.

## 4. Family-Level Source Contract

The table below defines what must be known before any family can move from `candidate` to `accepted`. "Possible source" is intentionally broad because source access, licensing, language, cadence, and owner acceptance remain unresolved.

| Family | Possible source | Frequency | Expected lag | Owner | License / access class | Attribution / usage restriction | Vintage definition | Transformation | Missing / stale rule | Pilot status |
|---|---|---:|---:|---|---|---|---|---|---|---|
| Prices / inflation proxies | Statistics Agency CPI releases; official price bulletins; approved market-price feeds if licensed | Daily, weekly, or monthly depending on source | 1-30 days | HFI source-inventory owner plus macro/price data owner to be assigned | `public`, `internal`, `licensed`, or `restricted` must be declared | Public citation or internal source reference required; usage restrictions must identify whether values can be shown in UI or only used internally | Latest observed date plus source publication date; if scraped/licensed, include extraction timestamp | Native value plus declared transform, such as index level, month-on-month percent change, year-on-year percent change, or contribution flag where source supports it | Missing if latest expected period is absent; stale if latest observation exceeds accepted cadence plus the declared grace period; unavailable if source access is not approved | Candidate |
| FX / financial conditions | Central Bank exchange-rate, policy-rate, money-market, credit, reserves, or monetary statistics releases | Daily, weekly, or monthly | 0-30 days | HFI source-inventory owner plus monetary/financial owner to be assigned | `public`, `internal`, `licensed`, or `restricted` must be declared | Source attribution required; licensed/internal constraints must state redistribution limits | Observation date plus source publication timestamp or release date | Native value plus declared transform, such as level, change, percent change, spread, or z-score for monitoring only | Daily series stale after 3 business days unless source cadence declares a different grace period; monthly series stale after one expected release cycle plus grace period | Candidate |
| Trade / customs | Customs Committee, Statistics Agency trade releases, Central Bank balance-of-payments inputs, approved customs extracts | Daily, weekly, monthly, or quarterly depending on access | 1-60 days | HFI source-inventory owner plus external-sector owner to be assigned | `public`, `internal`, `licensed`, or `restricted` must be declared | Attribution required; customs/internal extracts must state aggregation, confidentiality, and redistribution restrictions | Customs declaration/extract period plus extraction or publication timestamp | Native value plus declared transform, such as value, USD conversion if source supplies it, growth rate, or partner/product grouping if mapping is accepted | Missing if expected extract/release is absent; stale if source period exceeds accepted cadence plus grace period; partial if product/partner coverage is incomplete | Candidate |
| Fiscal / revenue | Ministry of Economy and Finance, Treasury, Tax Committee, Customs revenue releases, budget execution tables | Daily, weekly, monthly, or quarterly depending on access | 1-45 days | HFI source-inventory owner plus fiscal owner to be assigned | `public`, `internal`, `licensed`, or `restricted` must be declared | Attribution required; internal fiscal data must state whether display is allowed and at what aggregation level | Fiscal period plus publication/extraction timestamp; identify cash/accrual basis if relevant | Native value plus declared transform, such as level, percent of planned amount, year-to-date growth, or seasonally adjusted value only if method is documented | Missing if latest budget execution period is absent; stale if one accepted release cycle plus grace period is overdue; partial if central/local or tax/customs split is unavailable | Candidate |
| Electricity / energy activity proxy | Ministry of Energy, grid operator, electricity dispatch/load data, fuel production/sales releases, industrial energy use | Daily, weekly, or monthly | 1-30 days | HFI source-inventory owner plus energy/activity owner to be assigned | `public`, `internal`, `licensed`, or `restricted` must be declared | Attribution required; internal grid or dispatch data must state aggregation, security, and display restrictions | Metering/reporting period plus extraction/publication timestamp | Native value plus declared transform, such as load/generation level, growth, anomaly flag, or temperature-adjusted value only if weather method is accepted | Missing if expected daily/monthly value is absent; stale if latest observation exceeds accepted cadence plus grace period; partial if regional or sector coverage changes | Candidate |

Pilot status vocabulary:

- `planned`: family is useful in principle, but source access or governance is not ready.
- `candidate`: source family is plausible enough for inventory work, but no production artifact should use it yet.
- `accepted`: source, owner, cadence, vintage, transformation, license/access class, attribution/usage restriction, missing/stale rule, and caveats have been accepted.

No family should be shown as `accepted` until every required contract field is filled and reviewed.

## 5. Artifact Shape Proposal

The first artifact path is fixed as `/data/hfi_snapshot.json`.

Do not introduce `/data/hfi.json` in the first implementation. A shorter or split artifact path may be considered later only through a separate compatibility contract.

The first artifact should be static and inspectable, not backend-owned. It should use Data Registry status vocabulary so HFI states can align with current registry behavior.

Proposed top-level shape:

```ts
type HfiSnapshotArtifact = {
  schema_version: string
  artifact_key: 'hfi'
  metadata: {
    exported_at: string
    generated_by: string
    owner: 'HFI source-inventory owner'
    source_inventory_version: string
    source_vintage: string
    update_status: 'valid' | 'warning' | 'failed' | 'missing' | 'unavailable' | 'planned'
    validation_status: 'valid' | 'warning' | 'failed' | 'missing' | 'unavailable' | 'planned'
    validation_scope: string
  }
  indicators: HfiIndicator[]
  vintages: HfiVintage[]
  validation_checks: HfiValidationCheck[]
  caveats: HfiCaveat[]
  source_links: HfiSourceLink[]
  update_status: HfiUpdateStatus
}
```

Proposed indicator shape:

```ts
type HfiIndicator = {
  indicator_id: string
  family:
    | 'prices'
    | 'fx_financial'
    | 'trade_customs'
    | 'fiscal_revenue'
    | 'electricity_energy_activity'
  label: string
  source_id: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'irregular'
  observation_date: string
  publication_date?: string
  vintage_id: string
  native_value: number | null
  native_unit: string
  transformed_value: number | null
  transform_type: 'level' | 'mom_pct' | 'yoy_pct' | 'index' | 'z_score' | 'diff' | 'custom'
  transform_source: 'upstream' | 'downstream'
  display_unit: string
  precision: number
  rounding: 'none' | 'nearest' | 'floor' | 'ceiling'
  missing_value_treatment:
    | 'not_applicable'
    | 'leave_null'
    | 'carry_forward'
    | 'interpolate'
    | 'suppress_indicator'
  status: 'valid' | 'warning' | 'failed' | 'missing' | 'unavailable' | 'planned'
  status_detail: string
  caveat_ids: string[]
}
```

Required metadata:

- `exported_at`: when the static artifact was generated.
- `source_vintage`: human-readable summary of the latest accepted source periods.
- `source_inventory_version`: version of the accepted source inventory.
- `owner`: must name the HFI source-inventory owner role or accepted owner team.
- `validation_scope`: must state that validation checks artifact shape, required metadata, freshness, and source availability, not economic validity.
- `generated_by`: script/job identity when implementation exists; manual exports must say manual and name the owner.

Required transformation discipline:

- every accepted indicator must carry `native_value`;
- every accepted indicator must carry `transformed_value`;
- every accepted indicator must declare `transform_type`;
- every accepted indicator must declare `transform_source` as `upstream` or `downstream`;
- every accepted indicator must declare `native_unit`;
- every accepted indicator must declare `display_unit`;
- every accepted indicator must declare `precision` and `rounding`;
- every accepted indicator must declare `missing_value_treatment`;
- freeform notes can be added later, but they must not replace the structured fields above.

Required `vintages` fields:

- source id;
- latest observation date;
- publication date or extraction timestamp;
- source file/API/report version where available;
- license/access class: `public`, `internal`, `licensed`, or `restricted`;
- attribution requirement;
- usage restriction, if any;
- owner;
- expected cadence;
- grace period;
- stale threshold.

Required validation checks:

- schema version is present and supported;
- each accepted indicator has stable id, family, source id, frequency, native value, native unit, transformed value, transform type, transform source, display unit, precision, rounding, missing-value treatment, observation date, and status;
- no accepted indicator has `native_value: null` unless its missing-value treatment and status explicitly explain why;
- no accepted indicator has `transformed_value: null` unless its missing-value treatment and status explicitly explain why;
- dates parse as ISO dates/timestamps;
- frequency and lag are consistent with the source inventory;
- stale/missing flags follow the family rule and declared grace period;
- source links are present for accepted indicators where public links exist;
- license/access class, attribution requirement, and usage restriction are present before a family can be accepted;
- caveats are present when coverage, methodology, licensing, privacy, or manual extraction limits interpretation.

Required caveats:

- HFI signals are monitoring indicators, not forecasts;
- mixed frequencies cannot be compared without transformation;
- source publication delays differ by family;
- administrative sources may be revised;
- licensed, restricted, or internal data may not be redistributable;
- HFI does not imply policy action without model and analyst review.

Required source links:

- source id;
- source label;
- provider;
- URL or internal source reference;
- access class: `public`, `internal`, `licensed`, or `restricted`;
- attribution requirement;
- usage restriction, if any;
- language status;
- license notes;
- owner contact or owner team.

Required update status:

- artifact-level status using `valid`, `warning`, `failed`, `missing`, `unavailable`, or `planned`;
- family-level status using the same vocabulary;
- latest successful export timestamp;
- latest failed export timestamp, if any;
- stale family count;
- missing accepted indicator count;
- candidate/planned indicator count.

## 6. Data Registry Representation

Before data exists, HFI should remain exactly what Data Registry v2 currently implies:

- record kind: `planned_artifact`;
- status: `planned`;
- source: no public HFI artifact or chart data included;
- owner: HFI source-inventory owner to be assigned during source-inventory work;
- source system: planned source inventory;
- validation scope: no guard scope exists because no HFI artifact contract has been accepted;
- freshness rule: unavailable until accepted HFI contract and source cadence exist;
- caveat: unavailable by design, not a failed artifact.

Once the artifact contract is accepted but no artifact has been published:

- HFI may remain `planned` or move to `unavailable` only if the implementation slice explicitly expects `/data/hfi_snapshot.json` to exist.
- It must not be marked `missing` merely because the source inventory is still incomplete.
- Registry copy should say "contract accepted; artifact not yet published" rather than "failed".

Once indicators are accepted and an artifact exists:

- accepted indicators appear as `source_series` and `model_input` records with source owner, source system, frequency, source vintage, artifact export timestamp, validation scope, freshness rule, license/access class, attribution requirement, usage restriction, and caveats;
- family rollups can be `valid`, `warning`, `failed`, `missing`, `unavailable`, or `planned`;
- planned/candidate indicators remain visible as planned or candidate metadata, not as failed implemented series.

Stale and missing flags:

- `missing`: an accepted indicator has no value or no latest observation for an expected period.
- `stale`: represented as `warning`; an accepted indicator has data, but the latest observation date exceeds the accepted cadence plus declared grace period.
- `partial`: represented as `warning`; family has some current accepted indicators and some stale/missing accepted indicators.
- `unavailable`: source access failed or is not available in the current environment.
- `planned`: source family or indicator has no accepted source contract yet.

API/static fallback behavior later:

- HFI metadata may be served by an API only after the registry fallback adapter is accepted and API mode is enabled.
- Static artifact payload should remain the preview fallback.
- API metadata must not override frontend guard failure.
- API absence must not make planned HFI look like a failed artifact.
- API/static divergence should be surfaced as a governance warning, not hidden.

## 7. HFI And DFM Boundary

HFI indicators are not DFM indicators.

HFI movement does not update the DFM nowcast. HFI freshness does not imply DFM refit, DFM JSON regeneration, or a new upstream DFM source-artifact timestamp.

If CPI, FX, trade, credit, or other series appear in both HFI and DFM:

- Data Registry must declare the overlap explicitly;
- each surface must identify canonical ownership for that series in that surface;
- HFI ownership covers monitoring/source-vintage display only;
- DFM ownership covers nowcast model inputs and model output only;
- overlap must not be used to substitute HFI values into DFM slots.

HFI must not be substituted into QPM or DFM slots in Overview. Overview must distinguish:

- HFI monitoring signal;
- DFM nowcast output;
- QPM macro scenario output;
- I-O sector accounting evidence;
- future PE/CGE/FPP/synthesis outputs.

## 8. Overview Integration Boundary

HFI can support Overview monitoring signals such as:

- "price pressure rising";
- "FX pressure elevated";
- "trade data delayed";
- "energy activity softening";
- "fiscal execution data stale".

HFI should not produce:

- GDP growth forecasts unless passed through an accepted DFM/QPM bridge;
- inflation forecasts unless passed through an accepted model bridge;
- fiscal sustainability conclusions unless passed through an accepted FPP contract;
- sector propagation claims unless passed through I-O, PE, CGE, or synthesis contracts;
- policy recommendations from indicator movement alone.

If HFI is used in Overview before backend storage exists, the UI must show static artifact provenance and source-vintage labels. It must not imply live monitoring or automatic refresh.

## 9. No Composite Index Non-Goal

The first HFI contract explicitly forbids any UI or artifact field that collapses multiple HFI families into one aggregate score.

Do not implement or expose:

- a single HFI heat score;
- a traffic-light aggregate;
- a dashboard light;
- a cross-family monitoring index;
- any UI element that collapses multiple HFI families into one score.

Family-level status labels are allowed only as source/data-health states. They must not become an economic risk score or policy-action signal.

## 10. STOP Conditions Before Implementation

Stop before adding HFI code, data files, backend tables, API endpoints, charts, Overview panels, or dashboard summary elements if any of these are unresolved:

- approved five-family indicator list is missing;
- source access is not confirmed;
- update cadence and lag/grace rules are not accepted;
- owner is not assigned for each accepted source family;
- artifact path `/data/hfi_snapshot.json` and schema are not accepted;
- artifact contract has not been reviewed against Data Registry v2 vocabulary;
- stale/missing rules and grace-period wording are not accepted;
- source links, licensing, language status, access class, attribution requirement, and usage restriction are not documented;
- validation checks are not defined;
- no family accepted without license/access status;
- no DFM overlap claim without canonical ownership by surface;
- no HFI substitution into QPM or DFM Overview slots;
- no composite index, traffic-light aggregate, dashboard light, heat score, or cross-family monitoring index;
- backend operations contract is not accepted, if backend storage or API work is proposed;
- no backend-backed implementation before the backend operations contract is accepted;
- registry API/static fallback adapter is not accepted, if API wiring is proposed;
- implementation would require invented data or manual values without provenance;
- implementation would require mock HFI served from `/data/` or shown in user-facing copy;
- implementation would claim live refresh, scheduler status, DFM refit, model forecast, or policy recommendation from HFI alone.

## 11. First Implementation Recommendation

Do not start with backend-backed HFI. Backend implementation remains blocked until the operations and fallback contracts are accepted, and HFI storage is separately blocked until this source/artifact contract is accepted.

Do not start with a mock artifact as an implementation option.

Recommended first implementation path after contract acceptance:

1. Start with a source inventory only: indicator ids, possible sources, owners, cadence, lag, vintage definition, structured transformation fields, missing/stale rule, license/access class, attribution requirement, usage restriction, caveats, source links, and pilot status.
2. Then publish a static pilot artifact only if at least a small accepted indicator set exists. Use `/data/hfi_snapshot.json`, not live API calls.
3. Add frontend guards and Data Registry rows only after the static artifact shape is accepted and test fixtures exist.
4. Add Overview monitoring signals only after guard behavior, stale/missing flags, HFI/DFM overlap rules, and copy boundaries are tested.
5. Move to backend-backed HFI later, after the backend registry API, source records, validation logs, and operations ownership are accepted.

Test fixtures may exist under tests only. Mock HFI must never be served from `/data/`. Mock HFI must never appear in user-facing copy.

The practical first user-visible artifact should be a static pilot artifact with a small accepted indicator set and honest gaps.

## 12. Review Resolution

Claude Code review required bounded edits before acceptance. This revision resolves that review by:

- cutting first-slice scope from seven indicator families to five;
- moving labor/firm activity and mobility/transport to deferred families;
- adding the no-composite-index rule for heat scores, traffic-light aggregates, dashboard lights, and cross-family scores;
- clarifying that HFI indicators are not DFM indicators and cannot update, refit, or substitute for DFM/QPM signals;
- fixing the first artifact path to `/data/hfi_snapshot.json`;
- hardening the no-mock rule so mocks are limited to tests and never served from `/data/` or user-facing copy;
- replacing freeform-only transformation notes with structured native, transformed, unit, precision, rounding, source, and missing-value fields;
- making license/access class, attribution requirement, and usage restriction mandatory before a source family can be accepted.
