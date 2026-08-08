# Supervisor Adjudication — Flavor A (Process and Conventions Retrospective)

**Reviewer:** Codex (output at `docs/reviews/sprint-2-close-flavor-A.md`)
**Adjudicator:** Claude (advisor/supervisor) + @nozim (project owner)
**Date:** 2026-04-24

---

## Overall verdict on Codex's review

**Codex got this substantially right.** Well-evidenced, properly scoped, actionable. The review is also disciplined where it matters — Codex marked one convention "MARGINAL" with explicit "not enough evidence" rather than over-grading; closed with "drop process expansion unless mapped to repeated failure" rather than recommending more process. That self-restraint should be preserved as a reviewer convention point.

Of Codex's 12 graded conventions, supervisor agrees with the grade on all 12. Of Codex's 4 missing-convention proposals, supervisor agrees with all 4. Of Codex's 6 process drifts named, supervisor agrees with 5 at Codex's severity and would lift one (#2, audit-commitment revision) to higher severity.

Of Codex's 6 Sprint 3 recommendations, supervisor agrees with all 6 and adds 2 supervisor-side actions Codex did not surface.

---

## Refinements and disagreements

### Refinement 1 — Branch strategy drift needs an underlying policy decision

Codex marked this critical and proposed a checkpoint after every tactical main PR. The checkpoint addresses the symptom but not the cause.

**Underlying policy must be made explicit:** during epic-active sprints, choose one of:

- **(a) All changes route through epic.** Hotfixes get cherry-picked from epic to main when needed.
- **(b) Tactical fixes can land directly on main.** Mandatory merge-forward into epic documented within 24 hours.

We've used both patterns interchangeably in Sprint 2 without choosing. The checkpoint Codex recommends will keep firing unless we pick.

**Supervisor recommendation:** lock policy (a) for Sprint 3. Cleaner, fewer merge-forward situations, and aligns with the squash-merge convention. Hotfix path remains open via cherry-pick.

### Refinement 2 — Audit-commitment-revision severity raised to critical

Codex marked this "moderate to critical." Locking critical.

The pattern — builder honestly flagging a deferral in PR description while the audit committed to the work — is more dangerous than ordinary scope creep because it weaponizes "honest documentation" as cover for not following the spec. Three-tier review caught it once on Shot 1; nothing guarantees it would be caught on a quieter slice.

**In addition to Codex's commitment-ledger recommendation:** the supervisor must read the audit's commitments alongside the PR description before greenlighting reviewer dispatch. Five-minute supervisor task per slice, would have caught Shot 1's gap pre-reviewer.

### Refinement 3 — Reviewer-fixes-in-place needs a brake, not just an exception clause

Codex called this "minor drift, formalize as exception when bug is bounded and verifier exists."

Supervisor refinement: **exception requires supervisor adjudication in chat before reviewer commits code.** Otherwise reviewer-fixes-in-place normalizes toward "reviewer just fixes things" which dissolves role separation. Codex's framing is right; the brake makes it durable.

### Refinement 4 — Process-debt backlog has a hard cap

Codex correctly said "keep small, prune past one page." Supervisor sizes more concretely: **maximum 5 active items at any time.** If it grows past 5, pruning isn't optional — close the bottom 2 with explicit "won't formalize, accept as recurring friction" before adding new ones. Otherwise it becomes a graveyard.

---

## Things missing from Codex's review

These weren't omissions Codex should be faulted for — they're patterns visible from the supervisor seat that don't surface from external review.

### Missing 1 — Supervisor-lacks-primary-repo-access is structural, not incidental

Every Shot 1 prompt error traced to supervisor writing against summaries rather than codebase. Mitigation has been: prompt-review pass + builder audit phase + reviewer post-PR. All compensation layers. The root constraint isn't named: **supervisor should have read access to the actual repo for prompt drafting**, not just summaries.

This is partially a tooling question (Anthropic-side) and partially a workflow one (supervisor-side). Worth flagging for Sprint 3 as known constraint even if no immediate action exists.

### Missing 2 — Conversation-history files are overloaded

Histories now serve as: primary input for prompt drafting, retrospective analysis input, and project state of record. That's a lot of load on documents written at session ends under time pressure. Risk: a history file written tired or rushed becomes input to the next session's planning.

**Mitigation:** histories should explicitly mark sections as "narrative" vs "decision-of-record" and the latter should be citable from elsewhere when possible (PR descriptions, committed decision docs, this kind of adjudication artifact).

### Missing 3 — What makes Codex reviews effective when they are

Codex correctly avoided self-promotion in the review. But there's a real process question for Sprint 3 work assignment: **Codex catches architectural-soundness issues, contract-vs-PR gaps, and anchor regressions reliably. Codex catches editorial-register issues and supervisor-blessed scope decisions less reliably.**

Useful to know when assigning reviewer work. Doesn't change the convention; clarifies expectations.

### Missing 4 — Slice size cap question

Shot 1's build was the longest single Claude Code execution on the project. The conversation history captures this but Codex didn't promote it to a process pattern. **Open question for Sprint 3: do we cap slice size, or accept that some slices genuinely require multi-day builds?** Both are valid; not making the choice means we'll keep being surprised.

---

## Sprint 3 process improvements adopted

From Codex's recommendations + supervisor refinements above, the following process improvements are committed for Sprint 3:

### A — Branch strategy explicit policy
- **Decision:** policy (a) — all changes route through epic during epic-active sprints; hotfixes cherry-pick from epic to main.
- **Owner:** supervisor enforces; builder/reviewer follow.
- **Trigger:** every PR creation. Verify base dropdown reads `epic/replatform-execution` before clicking Create.

### B — Audit-to-PR commitment ledger
- **Decision:** any slice that uses the read-before-write audit must include a commitment table in PR description with three columns: audit commitment / PR delivery / Delivered/Deferred/Changed status.
- **Trigger:** any PR for a slice that produced a `docs/alignment/*_audit.md` document.
- **Supervisor enforcement:** supervisor reads audit alongside PR description before greenlighting reviewer dispatch.
- **STOP condition:** Deferred audit-committed work without explicit supervisor adjudication.

### C — Transfer-file verification
- **Decision:** before any prompt or artifact transfer between agent sessions, the transferring party verifies one known-changed line and filename matches expected version.
- **Trigger:** any handoff (supervisor → builder, builder → reviewer, supervisor → reviewer with revised file).
- **Cost:** ~30 seconds per transfer. Catches v1-vs-v2 confusion class of error.

### D — Tiered process by slice risk
- **Decision:** Sprint 3 uses two tiers explicitly:
  - **Lightweight path** (small docs, copy fixes, mechanical changes): builder + supervisor pre-PR check, no separate audit, no three-tier review unless something surprises.
  - **Full path** (demo-track, multi-page, data-integrity, contract changes): full convention stack as currently practiced.
- **Trigger:** slice classification at scoping. Supervisor calls the tier explicitly in the kickoff message; builder confirms or pushes back.
- **Cost:** classification overhead is negligible; saves 20-40% overhead on lightweight slices.

### E — Runtime verification ownership assigned explicitly
- **Decision:** runtime verification responsibility named in slice prompt. On Windows, Claude Code reliably runs preview; Codex on Windows cannot reliably spawn dev servers.
- **Default assignment:** Claude Code runs preview, regardless of which agent is builder or reviewer. Codex's runtime verification is static-analysis-only on Windows.

### F — Reviewer-fixes-in-place exception with supervisor brake
- **Decision:** reviewer may commit code only when (a) bug is narrow ≤50 LOC, (b) supervisor is adjudicated in chat before commit, (c) independent verifier exists post-fix.
- **Default:** REQUEST CHANGES → builder amends. In-place is exception.

### G — Process-debt backlog with hard cap
- **Decision:** maintain `docs/process/backlog.md` with maximum 5 active items. Prune bottom 2 before adding new items.
- **Owner:** supervisor maintains.
- **Format:** trigger / convention / status / next-use rule.

---

## Sprint 3 Recommendations NOT adopted

For the record:

- **None of Codex's recommendations are rejected.** All six adopted. The two supervisor-added actions (Missing 1 and Missing 4 above) become Sprint 3 open questions, not adopted conventions.

---

## What this changes for Flavor B and Flavor C

### Flavor B (architectural review) — no scope change

Codex's process retrospective surfaced no architectural concerns that change B's scope. B's prompt as drafted runs as-is.

### Flavor C (roadmap and priority) — sub-question added

Flavor C's prompt should gain one sub-question: "given Flavor A's tiering recommendation, which Sprint 3 backlog items qualify for lightweight path vs full path? Use the tiering to recalibrate the three timeline orderings."

This will be added to the C prompt before deployment.

---

## Sequence from here

1. Codex's Flavor A output is committed at `docs/reviews/sprint-2-close-flavor-A.md`.
2. This adjudication is committed at `docs/reviews/sprint-2-close-flavor-A-adjudication.md`.
3. Both visible to Flavor B's session as input.
4. Flavor B runs as scheduled.
5. After B returns, supervisor adjudicates B.
6. Then Flavor C runs with both A and B (and adjudications) as input.
7. After C returns, supervisor adjudicates.
8. Sprint 3 planning session uses all three reviews + three adjudications as inputs. Likely produces its own `docs/sessions/conversation-history-...` file.

---

## Closing note on process

Codex's final paragraph said: "Sprint 3 should use tiers: lightweight path for low-risk changes, full path for high-risk slices."

This is the most important single recommendation in the review. Sprint 2's process discipline was load-bearing for Shot 1's success but heavy enough that mechanical or low-risk work would have been over-engineered. The tiered approach lets us preserve discipline where it earns its cost without making every commit feel like a slice.

Sprint 3's success will partly be measured by whether tiered process actually gets used or whether we drift back to one-size-fits-all. Worth tracking.
