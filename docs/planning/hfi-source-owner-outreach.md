# HFI Source-Owner Outreach Package

Date: 2026-04-27  
Status: planning outreach/checklist only  
Contract reference: `docs/data-bridge/06_hfi_contract.md`  
Source inventory reference: `docs/planning/hfi-source-inventory.md`

## 1. Purpose and Status

This package is an outreach and checklist tool for resolving HFI source-owner, license/access, freshness, source-vintage, overlap, and label-review questions. It is not an implementation plan and does not authorize any HFI data artifact, data file, backend storage, frontend wiring, model refit, or scheduler work.

HFI remains blocked until source-owner answers are written back into `docs/planning/hfi-source-inventory.md`.

This package alone authorizes none of the following:

- no composite HFI index, heat score, traffic-light aggregate, dashboard light, or cross-family risk score;
- no DFM refit, DFM input backfill, QPM substitution, or model-output bridge;
- no mock HFI artifact;
- no `/data/` HFI files;
- no frontend or backend wiring.

## 2. Owner and Timebox

HFI source-inventory owner: project owner (provisional, sole-owner phase). To be reassigned to a named institutional owner once one is identified.

Recommended timebox: 5 working days for initial source-owner responses after each external source owner is contacted.

Provisional sole-owner assignment lets outreach begin with a single accountable internal contact. It does not waive external source-owner confirmation, does not unblock HFI implementation, and does not authorize any HFI artifact, data file, scheduler, backend, frontend, or model refit. Accepted answers must still be written back into `docs/planning/hfi-source-inventory.md` before any row may move to `accepted`.

## 3. Internal Pre-Outreach Decisions

Resolved provisionally by the project owner (sole-owner phase) on 2026-04-27. Each item below is a placeholder accountability assignment that must be reassigned to a named institutional owner once one is identified, and none of these decisions unblock HFI implementation. Authoritative wording lives in `docs/planning/hfi-source-inventory.md` under "Internal Pre-Outreach Decisions (Provisional)" and "DFM-Overlap Governance".

- [x] DFM-overlap canonical ownership rule declared (provisional). DFM holds canonical input ownership for any series already used as a DFM nowcast input (CPI/inflation, FX, trade, credit, monetary aggregates, activity proxies). HFI may register the same series only for monitoring and source-vintage display, with no DFM input backfill or DFM refit. For overlap-eligible series not currently used by DFM, HFI may hold provisional monitoring/display ownership and must re-register if DFM later adopts the series. Both-surface ownership requires separate accepted roles, vintage rules, and stale/missing rules. Per-series DFM-overlap declarations must still be written into each affected inventory row before the row can move to `accepted`.
- [x] Transformation owner assigned (provisional). Default transformation owner for every candidate family is the project owner, limited to the transformations already recorded in each inventory row.
- [x] RU/UZ label owner assigned (provisional). Default label owner is the project owner, with the explicit constraint that RU/UZ terminology review must be delegated to a qualified RU/UZ reviewer before any source appears in a user-facing artifact or Data Registry row.
- [x] Stale/missing rule proposal sign-off role assigned (provisional). Sign-off role is the project owner; sign-off is recorded only when the rule is consistent with the cadence, lag, and revision convention confirmed by the source owner.
- [x] HFI source-inventory owner assigned (provisional). Project owner (sole-owner phase).
- [x] Acceptance role assigned (provisional). Project owner, conditional on written external source-owner confirmation of license/access, attribution, vintage rule, stale/missing rule, DFM-overlap declaration, RU/UZ label review, and display rights for the row.
- [x] Each candidate is confirmed to remain inside the accepted five-family HFI contract: prices/inflation proxies, FX/financial conditions, trade/customs, fiscal/revenue, electricity/energy activity proxy. Cross-reference-only rows remain limited to FPP workbook fiscal and FPP workbook monetary/external historical inputs. CBU policy rate stays `deferred` and context-only; deferred extension families (housing, car market, business climate, business activity, labor/firm activity) stay out of scope.

## 4. Source-Owner Questions

Use the relevant family question set below with each source owner. Answers should be specific enough to update the source inventory row directly.

### Prices / Inflation Proxies

- What is the source of record for this indicator, and is any current source only a republisher?
- What is the legal/access status: `public`, `internal`, `licensed`, or `restricted`?
- What exact attribution text is required?
- What is the update frequency?
- What is the expected publication or availability lag?
- Is there a publication calendar?
- What is the accepted source vintage definition?
- How much history is available?
- What is the revision or backfill convention?
- What is the policy for methodology breaks?
- What is the taxonomy/versioning policy for CPI baskets, item categories, or price groups?
- How are holidays and non-business days handled, if applicable?
- What confidentiality or small-cell suppression rules apply?
- Is display or redistribution permitted?
- What aggregation level is allowed for display and artifact use?
- What is the unit and native format?
- Who owns transformations such as mom, yoy, index preservation, or event flags?
- What is the format/transport: API, file, PDF, or manual export?
- Is there a schema stability commitment?
- Are there cost, quota, expiry, or renewal conditions?
- Who is the primary contact?
- Who is the backup contact?
- What response SLA can the owner support?

### FX / Financial Conditions

- What is the source of record for this indicator, and is any current source only a republisher?
- What is the legal/access status: `public`, `internal`, `licensed`, or `restricted`?
- What exact attribution text is required?
- What is the update frequency?
- What is the expected publication or availability lag?
- Is there a publication calendar?
- What is the accepted source vintage definition?
- How much history is available?
- What is the revision or backfill convention?
- What is the policy for methodology breaks?
- What is the taxonomy/versioning policy for rates, monetary aggregates, credit categories, reserves, or financial-sector tables?
- How are holidays and non-business days handled?
- What confidentiality or small-cell suppression rules apply?
- Is display or redistribution permitted?
- What aggregation level is allowed for display and artifact use?
- What is the unit and native format?
- Who owns transformations such as level changes, percent changes, spreads, or monitoring-only z-scores?
- What is the format/transport: API, file, PDF, or manual export?
- Is there a schema stability commitment?
- Are there cost, quota, expiry, or renewal conditions?
- Who is the primary contact?
- Who is the backup contact?
- What response SLA can the owner support?

### Trade / Customs

- What is the source of record for this indicator, and is any current source only a republisher?
- What is the legal/access status: `public`, `internal`, `licensed`, or `restricted`?
- What exact attribution text is required?
- What is the update frequency?
- What is the expected publication or availability lag?
- Is there a publication calendar?
- What is the accepted source vintage definition?
- How much history is available?
- What is the revision or backfill convention?
- What is the policy for methodology breaks?
- What is the taxonomy/versioning policy for partner, product, HS code, customs regime, or trade-flow definitions?
- How are holidays and non-business days handled?
- What confidentiality or small-cell suppression rules apply?
- Is display or redistribution permitted?
- What aggregation level is allowed for display and artifact use?
- What is the unit and native format?
- Who owns transformations such as USD conversion, yoy growth, product grouping, or partner grouping?
- What is the format/transport: API, file, PDF, or manual export?
- Is there a schema stability commitment?
- Are there cost, quota, expiry, or renewal conditions?
- Who is the primary contact?
- Who is the backup contact?
- What response SLA can the owner support?

### Fiscal / Revenue

- What is the source of record for this indicator, and is any current source only a republisher?
- What is the legal/access status: `public`, `internal`, `licensed`, or `restricted`?
- What exact attribution text is required?
- What is the update frequency?
- What is the expected publication or availability lag?
- Is there a publication calendar?
- What is the accepted source vintage definition?
- How much history is available?
- What is the revision or backfill convention?
- What is the policy for methodology breaks?
- What is the taxonomy/versioning policy for budget classification, revenue category, tax/customs split, central/local split, or cash/accrual basis?
- How are holidays and non-business days handled?
- What confidentiality or small-cell suppression rules apply?
- Is display or redistribution permitted?
- What aggregation level is allowed for display and artifact use?
- What is the unit and native format?
- Who owns transformations such as yoy growth, year-to-date growth, percent of plan, or basis conversion?
- What is the format/transport: API, file, PDF, or manual export?
- Is there a schema stability commitment?
- Are there cost, quota, expiry, or renewal conditions?
- Who is the primary contact?
- Who is the backup contact?
- What response SLA can the owner support?

### Electricity / Energy Activity Proxy

- What is the source of record for this indicator, and is any current source only a republisher?
- What is the legal/access status: `public`, `internal`, `licensed`, or `restricted`?
- What exact attribution text is required?
- What is the update frequency?
- What is the expected publication or availability lag?
- Is there a publication calendar?
- What is the accepted source vintage definition?
- How much history is available?
- What is the revision or backfill convention?
- What is the policy for methodology breaks?
- What is the taxonomy/versioning policy for generation, load, dispatch, fuel, sector, region, or reporting coverage?
- How are holidays and non-business days handled?
- What confidentiality, security, or small-cell suppression rules apply?
- Is display or redistribution permitted?
- What aggregation level is allowed for display and artifact use?
- What is the unit and native format?
- Who owns transformations such as growth rates, anomaly flags, coverage adjustments, or temperature adjustment?
- What is the format/transport: API, file, PDF, or manual export?
- Is there a schema stability commitment?
- Are there cost, quota, expiry, or renewal conditions?
- Who is the primary contact?
- Who is the backup contact?
- What response SLA can the owner support?

## 5. Decision Table Template

| family | indicator/source | status: accepted / candidate / blocked / deferred / cross_reference | owner named? | license/access resolved? | attribution resolved? | vintage rule accepted? | stale/missing rule accepted? | DFM-overlap declared? | RU/UZ labels reviewed? | display rights accepted? | accepted for static pilot artifact? | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| prices/inflation proxies | TBD | candidate | no | no | no | no | no | no | no | no | no | TBD |
| FX/financial conditions | TBD | candidate | no | no | no | no | no | no | no | no | no | TBD |
| trade/customs | TBD | candidate | no | no | no | no | no | no | no | no | no | TBD |
| fiscal/revenue | TBD | candidate | no | no | no | no | no | no | no | no | no | TBD |
| electricity/energy activity proxy | TBD | candidate | no | no | no | no | no | no | no | no | no | TBD |

## 6. Acceptance Criteria Before Implementation

Before any HFI implementation begins, every accepted source row needed for the implementation must have:

- [ ] named source owner;
- [ ] resolved license/access;
- [ ] accepted attribution text;
- [ ] accepted source vintage definition;
- [ ] accepted stale/missing rule;
- [ ] DFM overlap declared where applicable;
- [ ] RU/UZ labels reviewed;
- [ ] disaggregation display rights accepted where applicable;
- [ ] no FPP workbook values ingested;
- [ ] no mock values;
- [ ] no composite index.

## 7. Inventory Update Rule

Outreach answers must be written back into `docs/planning/hfi-source-inventory.md`.

This outreach document is not the source of truth.

A row is not accepted until the inventory is updated.

## 8. Contract Boundaries

- Do not add new families.
- Do not relax `docs/data-bridge/06_hfi_contract.md` gates.
- Do not implement an HFI artifact before acceptance criteria are satisfied.
- Do not use HFI to backfill DFM or trigger DFM refit.
