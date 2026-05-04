# Supervisor Adjudication — Flavor B (Codebase Architectural Review)

**Reviewer:** Codex (output at `docs/reviews/sprint-2-close-flavor-B.md`)
**Adjudicator:** Claude (advisor/supervisor) + @nozim (project owner)
**Date:** 2026-04-24

---

## Overall verdict on Codex's review

**Codex got the architectural review substantially right.** Disciplined scope (stayed in architecture territory), file:line evidenced citations, accurate severity gradings on eleven of twelve debt items. Codex surfaced two material technical issues supervisor would have missed: the Model Explorer source pipeline bypass and the env typing gap. Both are silently accumulating debt that Sprint 3 must address.

Of Codex's twelve debt items, supervisor agrees with severity on eleven (two refinements detailed below). Of Codex's four cross-page inconsistencies, supervisor agrees with all four. Of Codex's nine Sprint 3 recommendations, supervisor adopts all nine with three refinements plus three additions.

---

## Refinements and disagreements

### Refinement 1 — Model Explorer source pipeline bypass: lift severity to critical

Codex marked "serious." Supervisor refinement: **critical.**

Reasoning:
- Page tests don't catch the bypass — they test the bypassed pipeline, not the page's actual rendering path
- Model Explorer cannot switch to live mode without page rewrite
- Debt compounds with each new bridge: PE/IO/CGE/FPP bridges will need to populate a shape the page doesn't read
- DFM PR 4 + likely IO bridge in Sprint 3 make the deadline concrete

Must be addressed in Sprint 3's first week, before any other Model Explorer work. Promoted from "do-this-first" to **"must-do-first"** — no parallel Model Explorer slices.

### Refinement 2 — Scenario Lab dual fields: split grading

Codex marked both metadata and suggested_next as moderate. Split:

- **Metadata compatibility (moderate)** — keep Codex's grade. Both adapter and component paths carry dual handling.
- **Dual suggested_next fields (minor)** — downgrade. Cleanly contained; legacy doesn't leak; retires on single slice when `suggested_next` becomes mandatory.

### Refinement 3 — Bridge fetch helper lands inside IO/CGE first PR, not as separate slice

Codex recommends helper before the third bridge as separate work. Supervisor refinement: **land the helper as part of the first new bridge slice**, exercised against actual needs rather than abstracted from QPM/DFM precedent.

### Refinement 4 — Sentinel inventory test promoted from "important" to "do-first"

Codex marked "important, 2-4 hours." Supervisor refinement: **do-first** because Shot 2 editorial content work is about to begin. Without the inventory, @nozim and CERR fill sentinels opportunistically with no complete view of remaining gaps. Highest-leverage action per hour in the Sprint 3 list.

---

## Things missing from Codex's review

### Missing 1 — Bridge adapter → page adapter boundary is architecturally ambiguous

Codex described the split but didn't examine consistency today. Specific asymmetry:

- **QPM:** page-shape mapping lives in bridge adapter (`toComparisonWorkspaceFromQpm()`)
- **DFM:** page-shape mapping lives in page layer (`overview/dfm-composition.ts`)

Two different patterns for two bridges. Both defensible; the question is whether we commit for PE/IO/CGE/FPP.

**Supervisor decision for Sprint 3:** bridge adapters produce bridge-native shapes only; page adapters/composers do the page-native transformation. All page-shape knowledge lives in page layer. Keeps bridges reusable across pages. DFM already fits; QPM should migrate opportunistically when Comparison work touches it; PE/IO/CGE/FPP follow the rule from their first PR.

### Missing 2 — Accessibility audit wasn't run

Codex didn't comment on accessibility. Not Codex's fault — not in the prompt. But worth flagging: accessibility patterns (skip-link, aria-live, role=tablist, proper focus rings) emerged early in the project and haven't been validated recently. Shot 1 added four pages of new UI.

**Supervisor action:** accessibility sweep is a Sprint 3 action. 3-4 hours keyboard + screen-reader walkthrough across five pages. Catches regressions before pilot users surface them.

### Missing 3 — Testing philosophy hasn't been named

The project optimizes for contract-level correctness (adapter/guard/state tests) over component coverage. This is conscious but not documented.

**Supervisor action:** document in `docs/testing-philosophy.md` so new contributors don't pattern-match to typical React testing conventions. Short doc, one-time cost.

### Missing 4 — Knowledge Hub source-mode is a product question, not architectural

Codex framed the Knowledge Hub live-mode decision as a Sprint 3 architectural question. Supervisor reframe: **this is a product question.** Does Knowledge Hub content have a freshness requirement? If yes, build live mode. If no, mock-mode is correct forever and it's not debt.

Gets adjudicated in Flavor C (roadmap) or Sprint 3 planning, not in technical work.

---

## Sprint 3 technical actions adopted

| Priority | Action | Effort | Tier |
|---|---|---|---|
| **Must-do-first** | Wire Model Explorer through source pipeline | 4-8 hrs | Full |
| **Do-first** | Update env typing; normalize data-mode defaults | 2-4 hrs | Lightweight |
| **Do-first** | Sentinel inventory test (promoted) | 2-4 hrs | Lightweight |
| **Important** | Complete DFM PR 4 (nightly regen) | ~1 slice | Full |
| **Important** | Bridge-backed row-fill tests for Comparison | 3-6 hrs | Lightweight |
| **Important** | Retire Scenario Lab legacy metadata after migration tests | 3-6 hrs | Full |
| **Important** | Duplicate-key guard for locale JSON | 1-2 hrs | Lightweight |
| **Nice-to-have** | Bridge fetch helper (within first new bridge slice, not separate) | 4-6 hrs incl. | Full (combined) |
| **Nice-to-have** | Scenario Lab saved-run restore integration test | 4-6 hrs | Lightweight |
| **Nice-to-have (supervisor add)** | Accessibility sweep across five pages | 3-4 hrs | Lightweight |
| **Nice-to-have (supervisor add)** | Testing philosophy doc | 1-2 hrs | Lightweight |

**Total capacity consumption:** roughly 28-45 hours of dev time, weighted toward Week 1 of Sprint 3.

---

## Deferred to Sprint 4 or beyond

- Model Explorer parallel types consolidation (after source pipeline wired + at least one additional bridge lands)
- ComparisonContent boundary documentation (after IO/CGE bridge clarifies usage)
- Knowledge Hub source-mode decision (pending product question adjudication in Flavor C or Sprint 3 planning)
- Scenario Lab state machine extraction (only if page density increases further in Sprint 3)

---

## What this changes for Flavor C

1. **Sprint 3 capacity pre-allocated.** Flavor C's timeline orderings must account for ~28-45 hours of dev time already committed to Flavor B's technical actions.

2. **Tier classifications from Flavor A applied.** Each action tagged lightweight vs full per the Flavor A recommendation.

3. **Flavor C prompt gains additional input category.** Flavor C should read `docs/reviews/sprint-2-close-flavor-B.md` AND `docs/reviews/sprint-2-close-flavor-B-adjudication.md` to understand what Sprint 3 technical work is already committed.

---

## Closing note

Codex's architectural review produced the clearest picture of the codebase we've had. The framing "consolidation around boundaries already proven, not full rewrite" is the right disposition for Sprint 3 and worth preserving as a posture rather than letting it drift into rewrite temptation when new bridges or surfaces introduce friction.

Two quotes from Codex worth preserving verbatim for the record:

> "The cleanest architecture is not a full rewrite; it is consolidation around the boundaries already proven."

> "Do not make bridges emit ComparisonContent. Let PE/IO/CGE/FPP, when they arrive, populate ComparisonWorkspace or model-native bridge outputs that are adapted into the workspace."

Both framings should inform Sprint 3 architecture choices and the first decisions when PE/IO/CGE/FPP bridges land.
