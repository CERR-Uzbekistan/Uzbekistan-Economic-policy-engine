# Scenario ID Reconciliation — QPM ↔ Scenario Lab

**Document:** `docs/data-bridge/01_scenario_id_reconciliation.md`
**Date:** 2026-04-20
**Status:** Adopted
**Related:** TB-P2 (#67) adopted Option B for the model bridge; this
document resolves a naming collision that Option B surfaces.

---

## Context

Sprint 2 consumer wiring requires the QPM nightly export
(`scripts/export_qpm.R` → `apps/policy-ui/public/data/qpm.json`) and
the frontend Scenario Lab preset list (`src/data/mock/scenario-lab.ts`)
to agree on scenario identifiers. They currently do not.

| QPM export (`qpm.json`) | Scenario Lab mock |
|---|---|
| `baseline` | `balanced-baseline` |
| `rate-cut-100bp` | — |
| `rate-hike-100bp` | — |
| `exchange-rate-shock` | `exchange-rate-shock` ✓ |
| `remittance-downside` | (closest: `external-slowdown`) |
| — | `fiscal-consolidation` |
| — | `inflation-persistence` |

One of five IDs matches. Without a decision, Sprint 2 consumer wiring
will either fail silently (frontend loads `qpm.json`, finds no
matching preset ID, renders nothing) or require an ad-hoc translation
layer that future developers will have to re-learn.

## Decision

**The R solver is the source of truth for scenario naming. Frontend
presets align to it.**

The reasoning is single-sentence: scenario names should reflect the
shocks the solver actually applies, not an aspirational wishlist of
what the UI might one day surface.

## Reconciled mapping

| Frontend `preset_id` | QPM `scenario_id` | UI title |
|---|---|---|
| `baseline` | `baseline` | Baseline |
| `rate-cut-100bp` | `rate-cut-100bp` | Policy rate cut (−100 bp) |
| `rate-hike-100bp` | `rate-hike-100bp` | Policy rate hike (+100 bp) |
| `exchange-rate-shock` | `exchange-rate-shock` | UZS depreciation (+10%) |
| `remittance-downside` | `remittance-downside` | Remittance downside (proxy) |

## Retired from frontend mocks

- **`balanced-baseline`** — renamed to `baseline` to match the solver.
  No semantic change.
- **`external-slowdown`** — replaced by `remittance-downside`. The
  Scenario Lab presented this as "external slowdown" in the title but
  the underlying shock in the R solver is a −0.5 pp aggregate demand
  shock that proxies a remittance decline (because the QPM `b3`
  external-demand parameter is inactive — see
  `qpm-b3-inactive` caveat in the export). The new name is honest
  about what the solver actually does.
- **`fiscal-consolidation`** — removed from the preset list. The QPM
  solver has no fiscal block; a genuine fiscal-consolidation scenario
  requires the IO or CGE model, which is not part of TB-P2's QPM-first
  scope. Reintroduce when those exports land.
- **`inflation-persistence`** — removed from the preset list. The QPM
  solver does not emit a distinct persistence scenario; persistence is
  a property of the calibration (`a1 = 0.60`), not a shock. The old
  mock preset was illustrative of contract-level narrative handling
  during TA-5, and the TB-P3 `assisted` / `reviewed` disclaimer
  behaviour continues to be covered by unit tests independent of this
  preset.

## What this requires in code

These changes land together in the Sprint 2 bridge PR (next action
after this decision), not as a separate refactor:

1. `apps/policy-ui/src/data/mock/scenario-lab.ts` — rename the three
   retained presets (`baseline`, `exchange-rate-shock` already
   matches, `remittance-downside` replaces `external-slowdown`), add
   `rate-cut-100bp` and `rate-hike-100bp`, drop `fiscal-consolidation`
   and `inflation-persistence`. Matching titles.
2. `apps/policy-ui/src/pages/scenario-lab-preset.ts` — update
   `DEFAULT_PRESET_ID` from `'balanced-baseline'` to `'baseline'`.
3. `apps/policy-ui/tests/components/scenario-lab/preset-chips.test.tsx`
   and `apps/policy-ui/tests/pages/scenario-lab-page.test.ts` — update
   sample preset IDs in fixtures and assertions.
4. URL hydration: bookmarked links using the retired IDs
   (`?preset=balanced-baseline`, `?preset=external-slowdown`, etc.)
   will hit the existing unknown-id fallback path, which already logs
   a console warning and falls through to `baseline`. No additional
   redirect logic required.

## Non-goals

- No uncertainty-band handling. Covered by the QPM contract doc.
- No cross-model preset composition. Deferred until DFM + IO + CGE
  exports land.
- No migration of existing user-saved scenarios. The scenario store
  (PR #64) uses `created_at` / `updated_at` timestamps and does not
  pin preset IDs in persisted records, so saved scenarios are
  unaffected by preset renaming.

## Reversibility

Low-cost. Reversing would require renaming five IDs in the frontend
and nothing in the R solver. The real cost of this decision is not
the names themselves but that it commits the project to a discipline:
when a new model bridge lands (DFM, IO, CGE, FPP), the frontend
aligns to the solver's naming, not the other way around.
