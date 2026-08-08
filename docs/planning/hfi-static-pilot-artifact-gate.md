# HFI Static Pilot Artifact Gate

Date: 2026-04-27  
Status: planning gate only; no HFI data artifact, export script, backend storage, frontend wiring, Data Registry status change, or Overview integration is authorized by this document  
Contract reference: `docs/data-bridge/06_hfi_contract.md`  
Source inventory reference: `docs/planning/hfi-source-inventory.md`  
Source-owner outreach reference: `docs/planning/hfi-source-owner-outreach.md`

## 1. Purpose and Authority

This gate is a mechanical checklist form of:

- HFI contract Section 10 STOP conditions;
- `docs/planning/hfi-source-inventory.md` STOP conditions.

It adds no new policy. It only restates existing contract and inventory gates in a form that can be checked before any future static pilot artifact slice is proposed.

If the HFI contract or HFI source inventory changes, this gate must be re-reviewed before it is used.

A completed checklist does not, by itself, authorize:

- artifact creation;
- frontend wiring;
- backend ingestion;
- Data Registry status flip;
- Overview integration.

Each of those implementation steps still requires its own accepted contract or implementation slice.

## 2. Pre-Outreach Lock-Out

Provisional sole-owner internal decisions cannot satisfy source-owner confirmation items.

External written confirmation per indicator remains required before any indicator can pass this gate. Source-owner confirmation must be recorded in the HFI source inventory and must be specific to the indicator, not only to the family.

No indicator can pass this gate with any field still marked or understood as `to confirm`, `TBD`, unresolved, provisional-only, or equivalent.

## 3. Per-Indicator Checklist

The first static pilot artifact is limited to the up-to-five recommended indicators listed in the HFI source inventory. Each indicator must pass independently. Family-level approval is not a substitute for per-indicator approval.

### 3.1 Headline CPI Index and Yoy/Mom Inflation

Family: prices/inflation proxies  
Recommended source posture: Statistics Agency source path, owner, and vintage rule must be confirmed.

- [ ] Source owner named.
- [ ] License/access class resolved.
- [ ] Attribution text accepted.
- [ ] Redistribution/display rights accepted.
- [ ] Aggregation/display level accepted.
- [ ] Source vintage definition accepted.
- [ ] Stale/missing rule accepted.
- [ ] DFM-overlap declaration recorded.
- [ ] RU/UZ qualified reviewer named.
- [ ] Transformation rule accepted.
- [ ] Native unit and display unit accepted.
- [ ] Missing-value treatment accepted.
- [ ] Source extraction/provenance path recorded.
- [ ] Pilot acceptability accepted.

### 3.2 CBU Official UZS/USD Exchange Rate

Family: FX/financial conditions  
Recommended source posture: CBU source path, holiday/stale rule, and DFM-overlap ownership must be confirmed.

- [ ] Source owner named.
- [ ] License/access class resolved.
- [ ] Attribution text accepted.
- [ ] Redistribution/display rights accepted.
- [ ] Aggregation/display level accepted.
- [ ] Source vintage definition accepted.
- [ ] Stale/missing rule accepted.
- [ ] DFM-overlap declaration recorded.
- [ ] RU/UZ qualified reviewer named.
- [ ] Transformation rule accepted.
- [ ] Native unit and display unit accepted.
- [ ] Missing-value treatment accepted.
- [ ] Source extraction/provenance path recorded.
- [ ] Pilot acceptability accepted.

### 3.3 Goods Exports Value

Family: trade/customs  
Recommended source posture: public aggregate monthly release; product/partner detail excluded from the first pilot.

- [ ] Source owner named.
- [ ] License/access class resolved.
- [ ] Attribution text accepted.
- [ ] Redistribution/display rights accepted.
- [ ] Aggregation/display level accepted.
- [ ] Source vintage definition accepted.
- [ ] Stale/missing rule accepted.
- [ ] DFM-overlap declaration recorded.
- [ ] RU/UZ qualified reviewer named.
- [ ] Transformation rule accepted.
- [ ] Native unit and display unit accepted.
- [ ] Missing-value treatment accepted.
- [ ] Source extraction/provenance path recorded.
- [ ] Pilot acceptability accepted.

### 3.4 Goods Imports Value

Family: trade/customs  
Recommended source posture: public aggregate monthly release; product/partner detail excluded from the first pilot.

- [ ] Source owner named.
- [ ] License/access class resolved.
- [ ] Attribution text accepted.
- [ ] Redistribution/display rights accepted.
- [ ] Aggregation/display level accepted.
- [ ] Source vintage definition accepted.
- [ ] Stale/missing rule accepted.
- [ ] DFM-overlap declaration recorded.
- [ ] RU/UZ qualified reviewer named.
- [ ] Transformation rule accepted.
- [ ] Native unit and display unit accepted.
- [ ] Missing-value treatment accepted.
- [ ] Source extraction/provenance path recorded.
- [ ] Pilot acceptability accepted.

### 3.5 Total Budget Revenue

Family: fiscal/revenue  
Recommended source posture: MEF/Treasury source table, basis, license/access, and display permission must be confirmed.

- [ ] Source owner named.
- [ ] License/access class resolved.
- [ ] Attribution text accepted.
- [ ] Redistribution/display rights accepted.
- [ ] Aggregation/display level accepted.
- [ ] Source vintage definition accepted.
- [ ] Stale/missing rule accepted.
- [ ] DFM-overlap declaration recorded.
- [ ] RU/UZ qualified reviewer named.
- [ ] Transformation rule accepted.
- [ ] Native unit and display unit accepted.
- [ ] Missing-value treatment accepted.
- [ ] Source extraction/provenance path recorded.
- [ ] Pilot acceptability accepted.

## 4. Export-Script Plan Checklist

Before any export script is written, the implementation slice must define and accept an export-script plan with all items below. This gate does not add the script and does not pre-lock the runtime.

- [ ] Proposed script path under the repository is named.
- [ ] Runtime/language is decided per source family, not pre-locked by this gate.
- [ ] Output is idempotent for the same accepted inputs.
- [ ] Dry-run mode is specified.
- [ ] No live network calls occur during build.
- [ ] Every value traces to a recorded source file, URL, or extract.
- [ ] `generated_by` is specified.
- [ ] `exported_at` is specified.
- [ ] Source extraction timestamp is specified.
- [ ] Source publication timestamp is specified.
- [ ] Source vintage is specified.
- [ ] No composite index is generated.
- [ ] No heat score is generated.
- [ ] No traffic-light aggregate is generated.
- [ ] No precomputed cross-family aggregate columns are generated.

## 5. Guard-Check Integration Checklist

Expected future artifact path: `/data/hfi_snapshot.json`.

Before Data Registry or Overview surfaces HFI, a future guard/test plan must be accepted. That plan must satisfy the following checklist:

- [ ] Guard fixture path is defined before implementation.
- [ ] Validation checks cover artifact metadata.
- [ ] Validation checks cover indicators.
- [ ] Validation checks cover observations.
- [ ] Validation checks cover freshness.
- [ ] Validation checks cover transformations.
- [ ] Validation checks cover license/access fields.
- [ ] Validation checks cover source links.
- [ ] Validation checks cover caveats.
- [ ] Validation checks reject composite fields.
- [ ] Data Registry HFI row remains `planned` or `unavailable` until the artifact exists and passes guard checks.
- [ ] Overview HFI panel remains hidden until the artifact exists and passes guard checks.

## 6. Negative Authority Clause

This document does not authorize creating `/data/hfi_snapshot.json`.

It does not authorize frontend wiring.

It does not authorize backend ingestion.

It does not authorize Data Registry `accepted` status.

It does not authorize Overview HFI display.

Each implementation step still needs its own accepted contract or implementation slice.

## 7. Re-Review Triggers

This gate must be re-reviewed if any of the following changes:

- HFI contract changes.
- Indicator family list changes.
- Source inventory changes accepted indicators.
- Export-script approach changes.
- Source license/access changes.
- DFM overlap ownership changes.
- RU/UZ reviewer changes.

## 8. Review Resolution

Claude Code required the proposed gate to include:

- pointer framing;
- per-indicator approval;
- export-script plan;
- pre-outreach lock-out;
- negative authority clause;
- no-composite enforcement at artifact, script, and output level.

This document records those edits as a planning gate only. It does not implement HFI data files, frontend/backend code, or export scripts.
