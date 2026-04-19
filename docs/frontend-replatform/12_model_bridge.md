# 12 — Model Bridge Decision

**Status:** DRAFT
**Owner:** Nozimjon Ortiqov + engineering lead TBD
**Deadline:** Before TA-3 begins (end of Week 1)

*Note: Numbered 12 rather than 11 to avoid collision with `11_phase0_readiness.md`.*

## The decision

How will `apps/policy-ui` consume real model output from the R scripts?

## Options

### Option A — Thin backend (FastAPI / plumber / Express)

A small server that wraps R and exposes HTTP endpoints matching the `live-client.ts` assumptions (`/api/overview`, `/api/scenario-lab`, etc.).

**Pros:** on-demand scenario runs, matches existing code assumption, supports future auth.
**Cons:** adds a persistent backend to run and deploy.

### Option B — Nightly R-to-JSON static regeneration (RECOMMENDED)

Extend the existing `shared/` registry approach. R scripts run nightly via GitHub Actions, emit JSON to static files, consumed by the existing data-contract adapter layer.

**Pros:** no backend, keeps deployment static, extends current pattern naturally.
**Cons:** no on-demand parameter changes — scenario runs pre-computed or client-side approximated.

### Option C — Client-side TypeScript model ports

Port core model math (IRF for QPM, Kalman for DFM) to TypeScript. R stays for calibration and batch work.

**Pros:** instant scenario runs, zero backend.
**Cons:** large TS port for QPM and CGE, code duplication risk, numerical precision questions.

## Recommendation

**Option B** for the internal-demo phase. Lowest risk, fastest to ship, keeps existing deployment model.

Option A or C can come later when on-demand runs become a real requirement.

## Decision

**Chosen option:** [TBD — decision meeting 2026-04-23]

**Rationale:** [TBD]

**Implementation owner:** [TBD]

**Estimated timeline to bridge-live:** [TBD]

## Relationship to `shared/synth-engines.js`

The existing `shared/synth-engines.js` is already experimenting with client-side synthesis. Decision on whether this work continues under Option B or C, or is retired under Option A, is part of the above decision.

---
*Draft committed 2026-04-19. To be finalized with engineering and modeling leads by end of Week 1.*
