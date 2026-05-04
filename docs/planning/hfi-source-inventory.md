# HFI Source Inventory

Date: 2026-04-27  
Status: planning inventory only  
Contract reference: `docs/data-bridge/06_hfi_contract.md`

This inventory records candidate sources for a future high-frequency indicators monitoring layer. It does not authorize an HFI artifact, data files, backend storage, frontend wiring, model refits, QPM scenario output, or a composite HFI index.

HFI is monitoring and early-warning context only. It must not be treated as a DFM refit, QPM scenario, FPP fiscal projection, structural model output, policy recommendation, or cross-family aggregate score.

## Pilot Status Vocabulary

| Status | Meaning |
|---|---|
| `accepted` | Source owner, cadence, lag, history, access/license, vintage definition, transformation, stale/missing rule, attribution, usage restriction, and RU/UZ label review are all confirmed. |
| `candidate` | Plausible source for inventory work, but at least one acceptance field remains unresolved. |
| `blocked` | Known restriction prevents pilot use until governance, license, access, confidentiality, or methodology issues are resolved. |
| `deferred` | Out of first HFI scope or useful only after the five accepted families are stable. |
| `cross_reference` | Useful for corroborating definitions or model lineage, but not eligible as an HFI artifact input or source-of-record feed. |

No source in this inventory should be promoted to `accepted` until every required field is confirmed by the source owner and data governance reviewer. Source license/access status is a hard gate: no row can move to `accepted` while access/license remains "to confirm" or while redistribution/display rights are unresolved.

Acceptance role (provisional, sole-owner phase): the project owner acts as HFI source-inventory owner and as the internal acceptance role, alongside the named external source owner for the relevant family. A row may move from `candidate` to `accepted` only when the external source owner has confirmed every required field in writing and the project owner has recorded that confirmation in this inventory. The acceptance role must be reassigned to a named institutional reviewer once one is identified; provisional sole-owner acceptance does not waive external source-owner confirmation.

## In-Scope HFI Families

The first HFI source inventory is limited to the five families accepted by the HFI contract:

- prices/inflation proxies
- FX/financial conditions
- trade/customs
- fiscal/revenue
- electricity/energy activity proxy

## Candidate Source Inventory

| Indicator/source | HFI family | Source/provider | Source owner/contact if known | Frequency | Expected lag | Available history | Access/license status | Unit/native format | Required transformation | Source vintage definition | Stale/missing rule proposal | RU/UZ label review need | Pilot status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Headline CPI index and inflation rates | prices/inflation proxies | Statistics Agency of Uzbekistan CPI release | Macro/price data owner to be assigned | Monthly | 1-15 days after reference month, to confirm | Public release history, exact start date to confirm | Public if official release is used; attribution required | Index level and percent change tables, likely HTML/PDF/XLS | Keep native index; derive mom and yoy percent change only from documented source periods | Reference month plus publication date; extraction timestamp if manually downloaded | Missing if latest expected monthly CPI release is absent; stale after one monthly release cycle plus 7-day grace | Yes, official RU/UZ terminology and CPI basket labels need review | candidate | Strong first-pilot candidate if source URL, download method, and owner are confirmed. |
| Food CPI or selected food price inflation | prices/inflation proxies | Statistics Agency CPI detail or official price bulletin | Macro/price data owner to be assigned | Monthly, possibly weekly if bulletin exists | 1-30 days depending on release | To confirm by source table | Public or internal depending on chosen detail level | Index, percent change, or bulletin table | Derive yoy/mom; preserve native level and category code where available | Reference period plus publication date; category taxonomy version if available | Missing if category row absent for latest release; stale after one expected release plus grace | Yes, category translations require review | candidate | Useful early signal, but detail taxonomy and stable labels must be confirmed. |
| Administered/tariff price change tracker | prices/inflation proxies | Official tariff decisions, Statistics Agency notes, sector ministry announcements | Price/fiscal owner to be assigned | Irregular | Event-driven | To confirm | Public or internal; legal/announcement attribution required | Decision date, tariff level, percent change, text reference | Convert event into monitoring flag and percent change only when source states comparable old/new tariff | Decision effective date plus publication date and legal/source reference | Missing not applicable; stale if no review of source feed within agreed monthly check cycle | Yes, high review need for legal and sector terminology | candidate | Do not infer CPI impact from tariff changes without model bridge. |
| CBU official UZS/USD exchange rate | FX/financial conditions | Central Bank of Uzbekistan | Monetary/financial owner to be assigned | Daily business day | 0-1 business day | Public CBU history, exact API/table start date to confirm | Public if CBU source is used; attribution required | UZS per USD level, likely web/API/table | Keep native level; derive daily/weekly/monthly percent change for monitoring only | Observation date plus CBU publication timestamp or extraction timestamp | Missing after one expected business day; stale after 3 business days unless holiday calendar explains gap | Yes, standard RU/UZ currency labels need review | candidate | Safest financial pilot candidate once source path is confirmed. |
| CBU policy rate | FX/financial conditions | Central Bank of Uzbekistan monetary policy releases | Monetary/financial owner to be assigned | Event-based, with current level | 0-1 day after decision | Public CBU decision history, exact start date to confirm | Public; attribution required | Percent annual rate and decision date | Keep native level; derive change in percentage points; no forecast interpretation | Decision date plus publication date | Missing/stale rule applies only to context refresh, not a monitored high-frequency series | Yes | deferred | Context only. Event-based policy-rate information must not be included in the first HFI pilot artifact shortlist as a monitored series. |
| Monetary aggregate or liquidity indicator | FX/financial conditions | Central Bank of Uzbekistan monetary statistics | Monetary/financial owner to be assigned | Monthly | 10-30 days, to confirm | Public CBU history, start date to confirm | Public or internal depending on table | Sum level, index, or percent change | Keep native level; derive yoy growth if period and unit are stable | Reference month plus publication date/table version | Missing if latest monthly table absent; stale after one release cycle plus 7-day grace | Yes | candidate | Use one simple, well-documented aggregate only in pilot. |
| Credit to economy or banking-system credit growth | FX/financial conditions | Central Bank of Uzbekistan banking/monetary statistics | Monetary/financial owner to be assigned | Monthly | 10-30 days, to confirm | Public CBU history, start date to confirm | Public or internal depending on detail | Sum level by currency/sector or growth rate | Keep native level; derive yoy growth; avoid sector details until taxonomy is stable | Reference month plus publication date/table version | Missing if latest monthly table absent; stale after one release cycle plus 7-day grace | Yes | candidate | Candidate if definitions are stable and not duplicated/confused with DFM ownership. |
| Goods exports value | trade/customs | Statistics Agency trade release or Customs Committee aggregate | External-sector owner to be assigned | Monthly; customs extracts may be daily/weekly | Public monthly lag likely 15-45 days; internal extracts to confirm | Public trade history, exact start date to confirm | Public for official aggregates; internal/restricted for customs extracts | USD value, UZS value, tons, or table format | Keep native value; derive yoy growth; use source-supplied USD conversion only | Reference month or customs extract period plus publication/extraction timestamp | Missing if latest expected release/extract is absent; stale after one release cycle plus grace | Yes, partner/product terminology review needed if detail used | candidate | Start with aggregate monthly exports, not product/partner detail. |
| Goods imports value | trade/customs | Statistics Agency trade release or Customs Committee aggregate | External-sector owner to be assigned | Monthly; customs extracts may be daily/weekly | Public monthly lag likely 15-45 days; internal extracts to confirm | Public trade history, exact start date to confirm | Public for official aggregates; internal/restricted for customs extracts | USD value, UZS value, tons, or table format | Keep native value; derive yoy growth; use source-supplied USD conversion only | Reference month or customs extract period plus publication/extraction timestamp | Missing if latest expected release/extract is absent; stale after one release cycle plus grace | Yes | candidate | Strong pilot candidate if using public aggregate release. |
| Customs revenue receipts | fiscal/revenue | Customs Committee, Ministry of Economy and Finance, Treasury/budget execution tables | Fiscal owner to be assigned | Monthly or higher-frequency internal extract | 1-45 days depending on access | To confirm | Public, internal, or restricted to confirm; redistribution may be limited | UZS receipts, cumulative receipts, or execution table | Keep native level; derive yoy or percent-of-plan only if plan/basis is documented | Fiscal period plus publication/extraction timestamp; cash/accrual basis if relevant | Missing if expected fiscal period is absent; stale after one release cycle plus grace; partial if only customs revenue split is available | Yes | candidate | Useful bridge between trade and fiscal monitoring, but source ownership is unresolved. |
| Total budget revenue | fiscal/revenue | Ministry of Economy and Finance, Treasury, budget execution release | Fiscal owner to be assigned | Monthly or quarterly | 15-45 days, to confirm | Public budget execution history, exact start date to confirm | Public or internal depending on table; attribution and display limits to confirm | UZS level, cumulative YTD, percent of plan | Keep native level; derive yoy/YTD growth only with comparable periods; document cash/accrual basis | Fiscal period plus publication date/table version | Missing if latest execution period absent; stale after one accepted release cycle plus 7-day grace | Yes | candidate | Strong pilot candidate if the public monthly table is stable. |
| Tax revenue receipts | fiscal/revenue | Tax Committee, Ministry of Economy and Finance, Treasury/budget execution tables | Fiscal owner to be assigned | Monthly or higher-frequency internal extract | 1-45 days depending on access | To confirm | Public, internal, or restricted to confirm | UZS receipts, cumulative receipts, table | Keep native level; derive yoy or percent-of-plan only if basis is documented | Fiscal period plus publication/extraction timestamp; cash/accrual basis if relevant | Missing if expected fiscal period is absent; stale after one release cycle plus grace | Yes | candidate | Do not expose sub-tax detail until confidentiality and aggregation rules are confirmed. |
| Electricity generation or load | electricity/energy activity proxy | Ministry of Energy, grid operator, official energy statistics | Energy/activity owner to be assigned | Daily, weekly, or monthly depending on access | 1-30 days depending on source | To confirm | Public, internal, or restricted to confirm; grid/security restrictions possible | MWh/GWh generation, load, dispatch, or energy table | Keep native level; derive yoy or week/month change; temperature adjustment only under separate method | Metering/reporting period plus publication/extraction timestamp | Missing if expected daily/monthly value absent; stale if latest observation exceeds cadence plus grace; partial if coverage changes | Yes, technical energy terms need review | candidate | Strong activity-proxy candidate only if aggregation and display restrictions are clear. |
| Electricity consumption by sector or region | electricity/energy activity proxy | Ministry of Energy, grid operator, utility/dispatch reports | Energy/activity owner to be assigned | Monthly or higher-frequency internal extract | 1-30 days depending on access | To confirm | Likely internal/restricted unless official aggregate release exists | MWh/GWh by sector/region | Aggregate to accepted display level; derive yoy; document coverage breaks | Reporting period plus extraction timestamp and coverage definition | Missing if expected extract absent; stale after cadence plus grace; partial if sector/region coverage changes | Yes | blocked | Blocked until confidentiality, aggregation, and coverage stability are accepted. |
| Fuel production or energy sales proxy | electricity/energy activity proxy | Ministry of Energy, Statistics Agency industrial/energy release | Energy/activity owner to be assigned | Monthly | 15-45 days, to confirm | Public industrial/energy history to confirm | Public or internal depending on table | Physical volume, value, or index | Keep native level; derive yoy if comparable; avoid deflation unless method accepted | Reference month plus publication date/table version | Missing if latest release absent; stale after one release cycle plus grace | Yes | candidate | Useful fallback if electricity load data is restricted. |

## Cross-Reference Sources, Not Pilot Inputs

The sources below can corroborate definitions, source lineage, and model-variable naming, but they are not source-of-record HFI feeds. FPP workbook values are model inputs or projections context. They must not be ingested into an HFI artifact, used to backfill HFI, or treated as monitored high-frequency series.

| Indicator/source | Related family | Source/provider | Source owner/contact if known | Frequency | Expected lag | Available history | Access/license status | Unit/native format | Allowed use | Source vintage definition | Stale/missing rule proposal | RU/UZ label review need | Pilot status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FPP workbook fiscal historical inputs | fiscal/revenue | Internal FPP workbook/data, CAEM/FPP model input files | FPP model owner to be assigned | Annual or workbook-refresh cadence | Depends on manual workbook update | Base 2024 and projection/input history referenced locally; exact workbook history to confirm | Internal; not source-of-record HFI feed | Workbook sheets, annual levels/ratios, model input variables | Corroborate definitions and original upstream source references only | Workbook version/date, sheet name, source notes inside workbook, and original upstream source if present | Not applicable for HFI artifact; stale only as a cross-reference if workbook vintage is older than accepted source release | Yes, especially FPP labels and fiscal terms | cross_reference | Must not be ingested into HFI artifact. Official fiscal source releases should be used instead. |
| FPP workbook monetary/external historical inputs | FX/financial conditions; trade/customs | Internal FPP workbook/data, CAEM/FPP model input files | FPP model owner to be assigned | Annual or workbook-refresh cadence | Depends on manual workbook update | Base 2024 and projection/input history referenced locally; exact workbook history to confirm | Internal; not source-of-record HFI feed | Workbook sheets, ratios, BOP/fiscal/monetary variables | Corroborate definitions and source lineage only; no FPP projection values in HFI | Workbook version/date, sheet name, source notes, and original upstream source if present | Not applicable for HFI artifact; stale only as a cross-reference if workbook vintage is older than accepted source release | Yes | cross_reference | Must not be ingested into HFI artifact or used as a direct HFI feed. |

## Deferred Extension Families

These families are not part of the first accepted HFI family set. They may be reconsidered only if ownership, cadence, license/access, transformation, vintage, and display rules are clear.

| Indicator/source | Deferred extension family | Possible source/provider | Source owner/contact if known | Frequency | Expected lag | Available history | Access/license status | Unit/native format | Required transformation | Source vintage definition | Stale/missing rule proposal | RU/UZ label review need | Pilot status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Housing market price or transaction indicator | housing market | CERR real estate/housing market data; official cadastral or market data if licensed | CERR housing/real estate owner to be assigned | Monthly or quarterly, to confirm | To confirm | CERR/internal history to confirm | Internal/licensed/restricted to confirm | Price, transaction count, listing index, or spreadsheet | Define geography, segment, cleaning, and index method before any HFI use | Observation period plus extraction/publication date and methodology version | Missing if expected period absent; stale after cadence plus grace; unavailable if license does not permit display | Yes, high need for market segment labels | deferred | Extension only. Can be accepted later if CERR owns the source and display rights are clear. |
| Housing construction or permits proxy | housing market | Statistics Agency construction data; local permit data if available | Construction/housing owner to be assigned | Monthly or quarterly | 15-60 days, to confirm | Public history to confirm | Public or internal to confirm | Area, units, permits, value, or index | Keep native level; derive yoy; document regional coverage | Reference period plus publication/extraction date | Missing if latest expected release absent; stale after one release cycle plus grace | Yes | deferred | Could fit activity monitoring later, but not in first five HFI families unless contract is expanded. |
| Car sales or registration count | car market | CERR car market data; vehicle registration/customs data if approved | CERR car-market owner to be assigned | Monthly, to confirm | To confirm | CERR/internal history to confirm | Internal/licensed/restricted to confirm | Count, value, segment table, or spreadsheet | Clean duplicates, define new/used split, derive yoy; preserve native count | Observation month plus extraction/publication date and source version | Missing if expected monthly record absent; stale after one monthly cycle plus grace | Yes, model/segment labels need review | deferred | Extension only. Do not use until source ownership and redistribution rights are explicit. |
| Car imports proxy | car market | Customs Committee aggregate, Statistics Agency trade product detail, CERR car market data | External-sector/car-market owner to be assigned | Monthly or higher-frequency internal extract | 1-60 days depending on access | To confirm | Public if aggregate trade detail is public; customs extracts likely restricted | Count, value, HS code/product table | Map accepted HS/product codes; derive yoy; avoid brand detail unless licensed | Customs period plus extraction/publication timestamp and product-code version | Missing if expected extract absent; stale after cadence plus grace; partial if code coverage changes | Yes | deferred | Could overlap trade/customs, but first pilot should avoid detailed product mappings. |
| Business climate index | business climate | CERR business climate index or survey | CERR business climate owner to be assigned | Monthly or quarterly, to confirm | To confirm | CERR/internal history to confirm | Internal or public to confirm; survey methodology/license required | Index level, diffusion index, survey table | Keep native index; derive change; do not mix with official activity index without method note | Survey/reference period plus publication date and methodology version | Missing if latest survey period absent; stale after one expected cycle plus grace; suppress if methodology break is unresolved | Yes, survey labels need review | deferred | Potentially valuable, but acceptance requires clear methodology, owner, and publication cadence. |
| Business activity index | business climate | CERR business activity index | CERR business/activity owner to be assigned | Monthly or higher-frequency, to confirm | To confirm | CERR/internal history to confirm | Internal or public to confirm | Index, score, component table | Keep native index and component definitions; no composite HFI aggregation | Reference period plus publication date/methodology version | Missing if latest period absent; stale after cadence plus grace; partial if components change | Yes | deferred | Listed locally as CERR source. Should not be accepted until methodology and display rights are clear. |
| Firm registrations or closures | labor/firm activity | State registry, tax authority, CERR/internal firm activity data | Firm activity owner to be assigned | Monthly or higher-frequency, to confirm | To confirm | To confirm | Likely internal/restricted; privacy/confidentiality review required | Counts by date, region, sector, status | Aggregate and suppress small cells; derive yoy only after taxonomy stability | Registration/event period plus extraction timestamp and registry version | Missing if expected extract absent; stale after cadence plus grace; unavailable if access is not approved | Yes, legal/status terms need review | blocked | Blocked for first HFI because source ownership, cadence, and privacy/display rules are unclear. |
| Payroll, vacancies, or employment proxy | labor/firm activity | Tax/payroll system, vacancy portals, labor ministry data, CERR/internal extracts | Labor/firm activity owner to be assigned | Weekly or monthly, to confirm | To confirm | To confirm | Likely internal/licensed/restricted; privacy review required | Counts, wages, postings, payroll totals | Aggregate, anonymize, deduplicate, define coverage; derive growth rates only after method acceptance | Reference period plus extraction timestamp and coverage/methodology version | Missing if expected extract absent; stale after cadence plus grace; suppress if coverage break or privacy rule unresolved | Yes | blocked | Explicitly deferred by HFI contract unless a later source-contract update accepts it. |

## DFM-Overlap Governance

No HFI series can be accepted if it overlaps with DFM indicators until canonical ownership is declared. HFI must not backfill DFM nowcast inputs or trigger DFM refit.

Likely overlap candidates include CPI/inflation, FX, trade, credit, monetary aggregates, and activity proxies. For any overlapping series, Data Registry metadata must identify whether canonical ownership belongs to HFI monitoring/source-vintage display, DFM nowcast input ownership, or both surfaces with separate accepted roles.

Provisional canonical ownership rule (sole-owner phase):

- For any series already consumed as a DFM nowcast input, DFM holds canonical input ownership. HFI may register the same series only for monitoring and source-vintage display. Such a row carries no path back to DFM input backfill, DFM refit, or model-output substitution.
- For an overlap-eligible series not currently consumed by DFM, HFI may hold provisional monitoring/display ownership. If DFM later adopts the series, the row must be re-registered and the canonical-input role transferred to DFM.
- Both-surface ownership is permitted only when each surface has a separately recorded accepted role and a separately accepted vintage and stale/missing rule.
- The DFM-overlap declaration for each overlapping HFI row must be written into the inventory row before that row can move to `accepted`.

## First Static Pilot Shortlist Recommendation

The first static pilot artifact should contain only the safest 5-7 indicators after source acceptance. The recommended shortlist below is ordered by acceptance readiness, not analytical importance, and should use public official aggregate sources where possible:

| Priority | Indicator | Family | Recommended pilot posture |
|---:|---|---|---|
| 1 | Headline CPI index and yoy/mom inflation | prices/inflation proxies | Accept only after Statistics Agency source path, owner, and vintage rule are confirmed. |
| 2 | CBU official UZS/USD exchange rate | FX/financial conditions | Accept after CBU source path, holiday/stale rule, and DFM-overlap ownership are confirmed. |
| 3 | Goods exports value | trade/customs | Accept as public aggregate monthly release; avoid product/partner detail. |
| 4 | Goods imports value | trade/customs | Accept as public aggregate monthly release; avoid product/partner detail. |
| 5 | Total budget revenue | fiscal/revenue | Accept after MEF/Treasury source table, basis, license/access, and display permission are confirmed. |

Do not add policy rate, food CPI, customs revenue, electricity generation/load, housing, car market, business climate, labor, firm activity, FPP workbook values, or any CERR internal index to the first pilot unless source ownership, cadence, history, license/access, display rights, DFM-overlap ownership, and RU/UZ labels are all confirmed. Policy rate can remain context-only outside the pilot artifact because it is event-based rather than a monitored high-frequency series.

## Internal Pre-Outreach Decisions (Provisional)

These decisions are sole-owner provisional assignments made by the project owner before external source-owner outreach begins. They are placeholder accountability roles, not external commitments, and they do not unblock HFI implementation, data files, or any backend or frontend work. Each role must be reassigned to a named institutional owner when one is identified, and external source-owner confirmation remains a hard gate for `accepted` status.

Internal role assignments:

- HFI source-inventory owner: project owner (provisional, sole).
- Transformation owner (default for every candidate family until reassigned): project owner. Transformations remain limited to the rules already recorded in each inventory row (mom/yoy from documented periods, native-level preservation, source-supplied USD conversion, percent-of-plan only with documented basis).
- RU/UZ label owner (default): project owner, with the explicit constraint that RU/UZ terminology review must be delegated to a qualified RU/UZ reviewer before any source appears in a user-facing artifact or Data Registry row.
- Acceptance role (moving a row from `candidate` to `accepted`): project owner, conditional on written external source-owner confirmation of license/access, attribution, vintage rule, stale/missing rule, DFM-overlap declaration, RU/UZ label review, and display rights for that row.
- Stale/missing rule sign-off owner: project owner. Sign-off is recorded only when the rule is consistent with the cadence, lag, and revision convention confirmed by the source owner.

DFM-overlap canonical ownership: see "DFM-Overlap Governance" above for the provisional rule.

In-scope candidate families (provisional, unchanged from the HFI contract):

- prices/inflation proxies
- FX/financial conditions
- trade/customs
- fiscal/revenue
- electricity/energy activity proxy

No additional families are admitted by these provisional decisions. The deferred extension families (housing, car market, business climate, business activity, labor/firm activity) remain out of scope.

Cross-reference-only sources (provisional, unchanged):

- FPP workbook fiscal historical inputs
- FPP workbook monetary/external historical inputs

Cross-reference rows must not be ingested into an HFI artifact, used to backfill HFI, or treated as monitored high-frequency series. CBU policy rate remains `deferred` and context-only; it is not promoted to cross-reference and is not eligible for the first pilot artifact.

These provisional decisions exist only to allow source-owner outreach to begin with a single accountable internal contact. They do not authorize any HFI artifact, data file, scheduler, backend, frontend, model refit, or Data Registry implementation.

## Governance Notes

- Do not create a composite HFI index, heat score, dashboard light, traffic-light aggregate, or cross-family risk score.
- Do not use all available data automatically. Each accepted indicator needs a source owner, vintage definition, transformation rule, and stale/missing rule.
- Do not serve mock HFI from `/data/` or add HFI frontend/backend code from this inventory.
- FPP workbook/data can help identify historical fiscal, monetary, and external variables, but FPP projections and model-derived values are not HFI monitoring signals.
- Internal CERR indicators can become extension candidates only after ownership, cadence, methodology, access/license status, and redistribution/display rights are explicit.
- RU/UZ labels are part of broader terminology review and should be reviewed before any source appears in a user-facing artifact or Data Registry row.
- Source license/access status is required for `accepted` status; unresolved access, license, attribution, or redistribution terms keep the source at `candidate`, `blocked`, `deferred`, or `cross_reference`.

## STOP Conditions

Stop before promoting any row, building a shortlist artifact, or starting implementation if any condition below is unresolved:

- no accepted promotion without resolved license/access, attribution, and redistribution/display rights;
- no accepted promotion without a named source owner and HFI source-inventory owner;
- no shortlist implementation without DFM-overlap declaration for CPI/inflation, FX, trade, credit, monetary aggregates, or activity proxies;
- no FPP workbook values in the HFI artifact;
- no composite index, heat score, traffic light, dashboard light, or cross-family risk score;
- no mock HFI artifact in `/data/` or user-facing copy;
- no HFI implementation until source vintage and stale/missing rules are accepted;
- no disaggregated fiscal, customs, or energy display without display-rights acceptance;
- no backend, frontend, scheduler, or Data Registry implementation from this inventory alone.

## Review Resolution

This revision resolves the bounded Claude Code review by removing policy rate from the pilot shortlist, moving FPP workbook rows into cross-reference-only status, cutting the pilot shortlist to five safer public aggregate candidates, adding DFM-overlap governance, making license/access a hard acceptance gate, renaming extension families as deferred, and adding explicit STOP conditions.

The 2026-04-27 follow-up adds provisional sole-owner internal decisions (HFI source-inventory owner, transformation owner, RU/UZ label owner, acceptance role, stale/missing rule sign-off, DFM-overlap canonical ownership rule, in-scope candidate families, and cross-reference-only sources). These provisional decisions allow external source-owner outreach to begin and do not unblock HFI implementation, data files, scheduler, backend, frontend, or model refit.
