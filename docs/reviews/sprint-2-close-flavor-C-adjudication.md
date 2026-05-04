# Supervisor Adjudication — Flavor C (Roadmap and Priority Review)

**Reviewer:** Codex (output at `docs/reviews/sprint-2-close-flavor-C.md`)
**Adjudicator:** Claude (advisor/supervisor) + @nozim (project owner)
**Date:** 2026-04-24

---

## Overall verdict on Codex's review

**Codex got Flavor C substantially right.** Disciplined scope (stayed in roadmap territory, respected Flavor A and B as authoritative inputs), concrete (three timelines with specific orderings rather than abstract priorities), honest about what happens when decisions get deferred.

Of Codex's key framings, supervisor agrees with all of them. Of the three timeline orderings: 4-week accepted as-is; 8-week accepted with one sequencing refinement; 12-week accepted with one risk reframing. Of the four strategic decisions identified, supervisor locks three of them before Sprint 3 opens rather than during it; one (TB-P4 pilot users) genuinely requires Sprint 3 internal decision.

This is the least revision-heavy adjudication of the three flavors. Most of the work is converting Codex's analysis into a concrete Sprint 3 plan.

---

## Refinements and disagreements

### Refinement 1 — Lock three of four strategic decisions before Sprint 3 opens

Codex recommends deferring TB-P1, DFM cron, and Knowledge Hub source-mode to Weeks 1/2/4 of Sprint 3. Supervisor refinement: **three of these should be locked before Sprint 3 opens.**

**TB-P1 deployment — LOCKED: React rebuild becomes pilot deployment in Sprint 3.**
Reasoning: without this, DFM PR 4 nightly cron cannot activate meaningfully, and TB-P4 pilots have no stable deployment to use. Every Sprint 3 week we defer this costs us Week N+2 progress.

**DFM nightly cron activation — LOCKED: manual-dispatch-until-default-branch-merge.**
DFM PR 4 completes with workflow on epic; activation happens when TB-P1 deployment migration lands on main. This is a sequence, not two independent decisions.

**Knowledge Hub source-mode — LOCKED: curated/static, documented as product choice.**
No evidence freshness matters for Knowledge Hub content (reforms update on Presidential Decree cadence, not daily). Curated model keeps capacity for higher-leverage work. Revisit if pilot feedback surfaces a freshness need.

**TB-P4 pilot users — remains Sprint 3 internal decision.** Depends on real-world headcount + evaluator identification. Codex's Week 4 timing is right.

Rationale for locking three now: deferred decisions masquerade as engineering backlog. Locking removes that masquerade. If the locked choices turn out wrong, reverse them in Sprint 4 — the cost of reversal is lower than the cost of continued ambiguity.

### Refinement 2 — 8-week ordering: explicit bridge-decision gate between IO and PE

Codex's 8-week plan lists IO completion, then potentially PE kickoff or completion. Supervisor refinement: **insert explicit decision gate between IO completion and any PE work.**

- If IO takes 1.5x precedent time → PE does not start in 8-week window. Sprint 3 ends with IO complete + Shot 2 content depth + pilot-ready deployment.
- If IO takes 0.7x precedent time (unlikely but possible given helper extraction) → PE becomes realistic.

Making this a named gate prevents "we're ahead of schedule so start PE" pattern that over-commits Sprint 3.

### Refinement 3 — 12-week risk reframing

Codex called 12-week plan "bridge-heavy" with repetition risk. Supervisor refinement: deeper risk is **pilot feedback contradicts what 12-week plan builds.**

By Week 12, pilots (TB-P4) have been active ~8 weeks. What they actually ask for may differ from what Sprint 2 close projected. 12-week plan that ignores pilot signal is a 12-week plan ending with deliveries pilots didn't want.

**Mitigation:** explicit mid-cycle review at Week 8 where pilot signal can redirect Sprint 4 priorities before they lock. Treat 12-week ordering as default plan that bends on pilot input.

---

## Things missing from Codex's review

### Missing 1 — Translation pipeline isn't addressed

Codex mentioned RU/UZ translations as backlog items but didn't examine who translates, how, and when. Shot 2 editorial volume materially expands translation load: estimated 150-300 new translation strings.

**Supervisor action for Sprint 3 planning session:** translation ownership and pipeline decision. Not a code action — resource/workflow decision about whether CERR has in-house translators, whether @nozim personally translates, or whether it's deferred further.

### Missing 2 — Stakeholder-communication cadence

Codex implicitly assumes the project runs with @nozim + supervisor + agents as only stakeholders. Shot 2 implicates CERR staff; TB-P4 expands stakeholder count. Unanswered: cadence of visibility.

**Supervisor action:** biweekly 30-minute stakeholder check-in during Sprint 3. Agenda = what shipped, what's next two weeks, what needs input. Low cost, keeps feedback loops fast.

### Missing 3 — External risk: agent-churn at Sprint boundary

Codex's risks are project-internal. External risk of agent capability changes or tooling changes (Codex's Windows dev-server issue worsening, for example) during Sprint 3 execution.

Not directly controllable; worth acknowledging as external risk factor on the roadmap.

### Missing 4 — Off-ramp planning

Codex plans forward motion. Missing: **what gets removed from project if Sprint 3 reveals the roadmap was wrong?** If IO bridge fails (modeling-side issue), what does Sprint 3 become? If TB-P4 pilots reject the React surface, does Sprint 3 pivot?

**Supervisor action for Sprint 3 planning session:** off-ramp consideration. What triggers a re-plan, how fast can we pivot.

---

## Sprint 3 shape (synthesized from Flavors A + B + C adjudicated)

### Pre-decided before Sprint 3 opens

From Flavor A:
- Branch policy: all changes route through epic; hotfixes cherry-pick to main
- Tiered process: lightweight for small/mechanical, full for demo-track/contract/data-integrity
- Audit-to-PR commitment ledger required for audited slices
- Supervisor-brake on reviewer-fixes-in-place

From Flavor B:
- Bridge adapter boundary: bridges produce bridge-native shapes; page adapters/composers transform to page-native
- Testing philosophy: contract-level focus preserved
- Parallel Model Explorer types consolidate after at least one post-DFM bridge validates new pipeline

From Flavor C (this adjudication):
- TB-P1: React rebuild becomes pilot deployment in Sprint 3
- DFM cron: manual-dispatch until TB-P1 lands on main
- Knowledge Hub: curated/static source-mode, documented as product choice

### Week 1 — foundation

**Must-do-first (full-path):**
- Model Explorer source pipeline wiring (4-8 hrs)
- DFM PR 4 workflow completion (~1 slice)

**Do-first (lightweight):**
- Env typing + data-mode defaults (2-4 hrs)
- Sentinel inventory test (2-4 hrs)
- Duplicate-key locale guard (1-2 hrs)

### Weeks 2-4 — content + trust

- Shot 2 editorial content begins (English first, RU/UZ after stability)
- TA-9 AI surface treatment (full-path slice)
- Accessibility sweep (lightweight, 3-4 hrs)
- Testing philosophy doc (lightweight, 1-2 hrs)
- TB-P4 pilot identification decision
- First stakeholder check-in

### Weeks 4-8 — pilot-readiness

- IO bridge completion with helper extraction (full)
- **Bridge-decision gate: start PE only if IO came in at/under precedent time**
- Comparison + Add saved scenario modal (full)
- Scenario Lab legacy metadata retirement (full)
- TB-P1 deployment migration implementation
- Named pilot onboarding
- Second stakeholder check-in

### Weeks 8-12 — conditional

- PE bridge if gate allows and capacity
- **Mid-cycle pilot-signal review at Week 8** — may redirect Sprint 4 priorities
- Sprint 4 planning based on pilot feedback

### Explicitly deferred past Sprint 3

- CGE and FPP bridges (unless pilot signal makes them critical)
- Model Explorer parallel-type consolidation
- Full AI Advisor review workflow
- Backend/API/SDK migration
- Multi-user collaboration
- Broad component-test expansion

---

## Sprint 3 planning session agenda (committed)

The Sprint 3 planning session (its own conversation, likely its own history file) should cover:

1. Review the three Flavor adjudications → confirm Sprint 3 shape above
2. Translation pipeline decision (Missing 1)
3. Stakeholder-communication cadence (Missing 2)
4. Off-ramp planning (Missing 4)
5. TB-P4 pilot user identification criteria (even if names come later)
6. Week 1 kickoff prompt drafting (Model Explorer source pipeline as first slice)

Estimated planning session length: 2-3 hours. Should happen within 3-5 days of this adjudication to preserve momentum.

---

## Closing note

The three Codex reviews — process, architecture, roadmap — together produced the strongest strategic picture we've had on this project. Reading them in sequence shows a consistent lens across agents: disciplined scope, file-level evidence, willingness to disagree or refine rather than default to agreement, explicit acknowledgment of constraint and uncertainty.

Two Codex framings from Flavor C worth preserving for Sprint 3 reference:

> "Sprint 3 must be planned as consolidation plus one or two high-leverage product expansions, not as a broad feature sprint."

> "Decision latency. TB-P1, TB-P4, DFM cron activation, and Knowledge Hub freshness are all owner decisions. None should be allowed to masquerade as engineering backlog."

Both should stay visible during Sprint 3 execution as guards against scope drift and decision deferral.

Sprint 2 closes. Three reviews complete. Three adjudications committed. Sprint 3 shape defined. Ready for the Sprint 3 planning session whenever the project owner is ready to convene.
