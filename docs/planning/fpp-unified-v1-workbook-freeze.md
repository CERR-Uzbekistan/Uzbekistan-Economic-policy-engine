# FPP Unified-v1 Workbook Freeze Candidate

Date: 2026-04-27
Status: candidate/proposed freeze only; not accepted until owner countersignature
Scope: Gate 1 planning evidence for `docs/data-bridge/07_fpp_contract.md`

## Negative Authority

This is a candidate/proposed freeze, not an accepted freeze.

This document does not authorize artifact creation.
It does not authorize `/data/fpp_baseline.json` generation.
It does not authorize frontend or backend code.
It does not authorize workbook edits or re-saves.

## Purpose

This document identifies the candidate canonical `unified-v1` workbook snapshot for FPP Gate 1, records the available freeze identity fields, and creates the initial sheet/range map needed for a future `FppBaselineProjectionArtifact`.

It supports later gates for owner/license confirmation, authority table acceptance, identity test cases, parity tolerances, and output catalogue acceptance. It is not a source of economic values and must not be treated as a substitute for the workbook.

## Evidence Read

Inputs reviewed:

- `docs/data-bridge/07_fpp_contract.md`
- `docs/planning/fpp-implementation-gate-clearing.md`
- `docs/planning/contract-index-and-readiness-map.md`
- `docs/planning/frontend-unified-framework-plan.md`
- `fpp_model/index.html`
- `mcp_server/models/fpp.py`
- `mcp_server/tests/test_fpp.py`

Repository listing evidence:

- `git ls-files` shows FPP references at `docs/data-bridge/07_fpp_contract.md`, `docs/planning/fpp-implementation-gate-clearing.md`, `docs/planning/frontend-unified-framework-plan.md`, `fpp_model/index.html`, `mcp_server/models/fpp.py`, and `mcp_server/tests/test_fpp.py`.
- `fpp_model/` contains `fpp_model/index.html` only.
- No workbook file matching `*.xlsx`, `*.xlsm`, `*.xls`, `*.xlsb`, or `*.ods` was found in the repo root listing used for this pass.
- The existing simulator names a reference file as `CAEM Uzbekistan (Sep 2025).xlsm` and lists sheets `A1 (At a Glance)`, `6a.SEI`, `1b (Inflation/ER)`, `2a (External USD)`, `3a (Fiscal)`, and `4 (Monetary-Financial)`. The simulator's reference to `CAEM Uzbekistan (Sep 2025).xlsm` predates this freeze and confers no canonical status.

## Candidate Freeze Identity

| Field | Value |
|---|---|
| Workbook variant | `unified-v1` |
| Absolute or repo-relative path | TO CONFIRM. No `unified-v1` workbook file was found in the repo listing for this pass. |
| Byte size | TO CONFIRM |
| SHA-256 | TO CONFIRM |
| Last-modified timestamp from filesystem | TO CONFIRM |
| Tool/command used to compute hash | TO CONFIRM. Intended read-only command after owner supplies the file: `Get-FileHash -Algorithm SHA256 -LiteralPath '<owner-confirmed-unified-v1-workbook>'` |
| Workbook locale | TO CONFIRM |
| Last edited by | TO CONFIRM |
| Last edited date | TO CONFIRM |
| Owner | TO CONFIRM |
| Provisional owner | FPP workbook owner, TO CONFIRM |
| Status | TO CONFIRM until owner countersigns |

Because the workbook file is not present in the available repo evidence, no hash is recorded here. Gate 1 remains open until the owner confirms the canonical file, location, snapshot identity, and sheet/range map.

## Owner Sign-off Block

| Field | Value |
|---|---|
| Owner name | TO CONFIRM |
| Role | FPP workbook owner / model owner, TO CONFIRM |
| Date | TO CONFIRM |
| Signature/approval mechanism | TO CONFIRM. Written approval must identify the accepted workbook path, hash, timestamp, and sheet/range map. |
| Acceptance status | Not accepted. Candidate only. |

Without owner countersignature, this freeze remains candidate only.

## Read-only Declaration

The workbook must not be edited, re-saved, or format-converted during gate clearing.

Re-saving can change SHA-256 even without content edits. If hash drift occurs, the gate-clearing team must revert to the last good copy or create a new candidate freeze with a new path, timestamp, hash, and owner sign-off.

## Non-canonical Variants

Only `unified-v1` can become canonical after owner countersignature. The variants below are reference-only and non-canonical.

They must not be read by a future FPP extractor. They must not be hashed into artifact provenance. They must not be cited as frontend authority. They must not be used in `pe_data.js`-style consumer code.

| Variant | Path if known | SHA-256 if known | Last modified if known | Status | Prohibited use |
|---|---|---|---|---|---|
| `desk-2024-09` | TO CONFIRM | TO CONFIRM | TO CONFIRM | reference-only / non-canonical | Must not drive extraction, artifact provenance, frontend authority, or consumer code. |
| `caem-2025-09` | `CAEM Uzbekistan (Sep 2025).xlsm` named by `fpp_model/index.html`; actual file path TO CONFIRM | TO CONFIRM | TO CONFIRM | reference-only / non-canonical | Must not drive extraction, artifact provenance, frontend authority, or consumer code. |

## Sheet/Range Map

This map is an initial owner-review scaffold. Exact workbook cells are not knowable from the available docs and repo files, so exact addresses remain `TO CONFIRM`. Rows are grouped by expected sheet or output area using the existing simulator and contract as source context.

KPIs inherit identity-closure Gate 5 through their feeder series.

| Workbook variant | Sheet name | Named range, if any | A1 cell/range address | Header row index | Orientation | Output group | Sector | Methodology tag E/C/I/A | Unit | Currency | Nominal vs real | Frequency | Time coverage: first period / last period | Identity participation | Expected null/sentinel convention | Source/provenance note | Required for baseline_projection | Downstream gate dependency | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `unified-v1` | TO CONFIRM, expected `A1 (At a Glance)` or equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | scalar / rows-as-time TO CONFIRM | KPI cards: average GDP growth, final-year reserve import cover, final-year fiscal balance, final-year inflation | cross_sector_closure | TO CONFIRM | mixed | mixed | mixed | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Simulator KPI surface; exact workbook source TO CONFIRM | yes | Gates 1, 4, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected `6a.SEI` or real-sector equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | Real sector outputs: real GDP growth, output gap, nominal GDP, GDP USD | real | TO CONFIRM | percent, percentage point, bln UZS, mln USD | UZS / USD | mixed, real and nominal | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Simulator real-sector output table and equations; exact unified-v1 cells TO CONFIRM | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected `1b (Inflation/ER)` or equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | Inflation and exchange-rate path: CPI inflation, imported inflation, inflation target, NER depreciation, NER level, real policy rate | real / monetary | TO CONFIRM | percent, percentage point, UZS per USD | UZS / USD | nominal for NER, real for real-rate transformation | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Phillips Curve and NER path from simulator; QPM authority boundary remains separate | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected `2a (External USD)` or equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | External sector outputs: current account percent of GDP, current account USD, FDI, other financial account, change in reserves, reserve assets, imports, import cover, external debt percent of GDP | external | TO CONFIRM | percent of GDP, mln USD, months | USD | nominal for USD levels, ratio for percent/months | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | BOP and reserve adequacy surfaces from simulator; import cover is derived adequacy ratio unless owner proves identity status | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected `3a (Fiscal)` or equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | Fiscal sector outputs: revenue, expenditure, overall fiscal balance, primary balance, interest payments, financing need, government debt | fiscal | TO CONFIRM | percent of GDP, mln USD TO CONFIRM | USD / UZS TO CONFIRM | nominal for levels, ratio for percent of GDP | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Fiscal accounting and debt dynamics surface from simulator | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected `4 (Monetary-Financial)` or equivalent | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | Monetary sector outputs: monetary aggregate level, monetary aggregate growth, velocity, NFA, change in NFA contribution, change in NDA contribution, NFA/GDP, NDA/GDP, real policy rate | monetary | TO CONFIRM | bln UZS, percent, percentage point, dimensionless | UZS | nominal for levels, real for real policy rate | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Monetary survey surface from simulator; exact aggregate definition TO CONFIRM | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected monetary aggregate source | TO CONFIRM | TO CONFIRM | TO CONFIRM | rows-as-time / columns-as-time TO CONFIRM | M2/M3 ambiguity: monetary aggregate label, level, growth, and source definition | monetary | TO CONFIRM | TO CONFIRM | TO CONFIRM | nominal vs real TO CONFIRM | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Contract requires M2/M3 label and definition confirmation; simulator currently displays M2 in multiple places | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected parameters/calibration area | TO CONFIRM | TO CONFIRM | TO CONFIRM | scalar / matrix TO CONFIRM | Calibration and assumptions: potential growth, Phillips Curve coefficients, import share, inflation target, velocity, policy rate assumptions | real / external / monetary | TO CONFIRM | percent, coefficient, dimensionless | none / mixed | mixed | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | RHS / none TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Simulator parameter table and default inputs; owner must distinguish E, C, and A | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected diagnostics/output area | TO CONFIRM | TO CONFIRM | TO CONFIRM | scalar / matrix TO CONFIRM | Consistency matrix: growth vs potential, inflation vs target, reserve adequacy, fiscal position, debt dynamics | diagnostic | TO CONFIRM | status, percent, months, percentage point | mixed | mixed | Annual unless workbook proves otherwise | 2025 / 2027 TO CONFIRM | none / derived TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Existing simulator diagnostic surface; thresholds and status rules must be accepted | yes | Gates 1, 4, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, expected identity/formula area | TO CONFIRM | TO CONFIRM | TO CONFIRM | matrix / scalar TO CONFIRM | Identity formulas and closure tests: real GDP, nominal GDP, BOP, savings-investment, fiscal, monetary | cross_sector_closure | I TO CONFIRM | mixed | mixed | mixed | Annual unless workbook proves otherwise | 2024 / 2027 TO CONFIRM | LHS / RHS TO CONFIRM | blank / 0 / #N/A TO CONFIRM | Contract requires six identity closure test cases; exact workbook formulas TO CONFIRM | yes | Gates 1, 4, 5, 6, 10, 11 | TO CONFIRM |
| `unified-v1` | TO CONFIRM, hidden/protected sheets if any | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | Hidden/protected workbook content and named ranges | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | Must be disclosed by owner before extraction or parity work | TO CONFIRM | Gates 1, 2, 5, 6, 11 | TO CONFIRM |
| `desk-2024-09` | N/A | N/A | N/A | N/A | N/A | Non-canonical reference variant | N/A | N/A | N/A | N/A | N/A | N/A | N/A | none | N/A | Reference-only variant. Must not be read by extractor or cited as authority. | no | none; may support owner discussion only | non-canonical |
| `caem-2025-09` | `A1`, `6a.SEI`, `1b`, `2a`, `3a`, `4` named by simulator context, exact workbook path TO CONFIRM | N/A | N/A | N/A | N/A | Non-canonical reference variant and documentary parity/drift context | N/A | N/A | N/A | N/A | N/A | N/A | N/A | none | N/A | Reference-only variant. Must not be read by extractor, hashed into artifact provenance, or cited as frontend authority. | no | Gate 6 documentary variant-drift discussion only | non-canonical |

## Open Questions

| Question | Owner/role | Due by gate | Blocks which gate | Status |
|---|---|---|---|---|
| What exact sector labels should be accepted across workbook, simulator, CAEM terminology, and future frontend labels? | FPP model owner / Data Registry owner | Gate 1 and Gate 11 | Gates 1, 4, 10, 11 | TO CONFIRM |
| What are the exact formulas for the six identity closure tests, including LHS/RHS definitions and source ranges? | FPP model owner / QA owner | Gate 5 | Gates 5, 6, 11 | TO CONFIRM |
| What parity tolerances apply by Real, External, Fiscal, Monetary, cross-sector closure, and diagnostics, including rounding and percent handling? | FPP model owner / QA owner | Gate 6 | Gate 6 | TO CONFIRM |
| Who owns the caveat framework, including EN/RU/UZ text and series-level overrides? | Language/caveat reviewer / model governance owner | Gate 3 | Gates 3, 4, 11 | TO CONFIRM |
| Are there hidden or protected sheets, hidden named ranges, external links, macros, or workbook protection settings that affect extraction? | FPP workbook owner | Gate 1 | Gates 1, 2, 5, 6, 11 | TO CONFIRM |
| What workbook locale, decimal separator, thousands separator, date system, and number formats apply? | FPP workbook owner / QA owner | Gate 1 | Gates 1, 6, 11 | TO CONFIRM |
| Is the monetary aggregate M2, M3, or another workbook-specific aggregate, and what is its exact unit and identity role? | FPP model owner | Gate 1 and Gate 5 | Gates 1, 5, 10, 11 | TO CONFIRM |
| What is the exact `unified-v1` file path, byte size, SHA-256, and last-modified timestamp accepted by the owner? | FPP workbook owner | Gate 1 | Gate 1 | TO CONFIRM |
| What owner/license/access class and redistribution rule applies to the workbook and any derived baseline artifact? | FPP workbook owner / source owner | Gate 2 | Gate 2 and all implementation gates | TO CONFIRM |
| Which exact workbook rows or ranges feed the future output catalogue for every simulator-visible output? | FPP model owner / Data Registry owner | Gate 11 | Gates 1, 10, 11 | TO CONFIRM |

## Risks

- Hash drift from re-save: opening and saving the workbook can change the file hash even without visible content edits.
- Named-range silent rebinding: workbook names may point to different cells after edits, copy/paste, or sheet changes.
- Multiple `unified-v1` copies: two files with similar names can split provenance and make parity impossible.
- Owner ambiguity: no freeze is accepted until a named owner countersigns the exact file and map.
- Hidden/protected sheets: protected formulas, hidden sheets, or external links may be part of the model surface.
- Locale-dependent number formats: decimal separators, date systems, and thousands separators can change parsing.
- External workbook links / volatile functions: if workbook formulas reference external files or volatile functions such as INDIRECT/OFFSET, hash equality may not guarantee identical evaluated values across machines.
- Treating this doc as source instead of workbook: this document is a planning map only and must never replace the owner-confirmed workbook.

## Downstream Gate Implications

Clearing this gate enables Gate 2 and Gate 4 work to begin.

It does not enable Gate 3 or Gates 5 through 11.
It does not authorize FPP implementation.

Gate 1 evidence remains insufficient until the owner confirms the canonical `unified-v1` workbook snapshot and sheet/range map in writing.

## Re-review Triggers

Re-review this document if:

- the workbook file changes;
- the hash changes;
- the sheet/range map changes;
- the owner changes;
- hidden sheets are discovered;
- a non-canonical variant is proposed as source.

## Bottom Negative Authority

This document authorizes no artifact creation.
It authorizes no code.
It authorizes no backend.
It authorizes no workbook edit or re-save.
It authorizes no `/data/fpp_baseline.json` generation.
