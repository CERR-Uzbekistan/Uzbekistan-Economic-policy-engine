# Process and Conventions Retrospective — Sprint 2 Close

**Scope.** This review covers process only. Inputs were the five `docs/sessions/conversation-history-*.md` files, Shot 1 prompt/audit/reference artifacts, local git history for `epic/replatform-execution` and `feat/prototype-alignment-shot-1`, and GitHub PR metadata for #74, #75, #87, and #89. The prompt said "four" history files; the repo has five, so all five were read. GitHub review objects were mostly empty; useful PR metadata was limited to amend/status comments on #87 and #89.

## Section 1 — Conventions Earning Their Cost

1. **Read-before-write audit per slice — STRONG.** Demonstrated value is unusually clear. TA-6a's audit stopped a prompt that assumed TA-5 had no save/load consumer, when the code already had save/load/delete and Comparison already consumed the store; without the audit, the slice would likely have become a broad rewrite in forbidden files. TA-6b's audit caught references to prototype files that did not exist at the stated paths. DFM PR 1's audit caught that tracked DFM fitting code did not exist and that "3-month forecast" framing was stale. Shot 1's audit made additive-type strategy explicit before a five-page build. Cost: 20-90 minutes depending on slice size. Failure rate: early sessions used it inconsistently; by Shot 1 it was institutionalized. Keep and formalize trigger levels.

2. **Three-tier review pattern — STRONG.** Builder self-verification, supervisor pre-PR review, and reviewer post-PR review caught different classes of bugs. TA-6a: supervisor caught stale-edit gating before PR; Codex caught load-handler corruption and guard looseness after PR. TA-4b: builder preview verified many anchors, but Codex still found dead saved-scenarios data, missing required activity feed enforcement, undefined CSS tokens, and test gaps. Shot 1: builder preview caught duplicate locale-key behavior; Codex caught Comparison source-pipeline disconnection and Overview guard widening. Cost: high, roughly 20-40% overhead on medium slices. Failure rate: largely followed after TA-4b. It is earning its cost for demo-track and data-integrity work.

3. **Alternating builder/reviewer — STRONG, with one caveat.** Alternation reduced tunnel vision: Codex built TA-6b while Claude Code reviewed; Claude Code built DFM PR 1 and Shot 1 while Codex reviewed. The strongest evidence is TA-6b's runtime spacing bug caught by the reviewer, and Shot 1's audit-vs-PR-description mismatch caught by Codex. Cost: modest coordination overhead, but no evidence of role fatigue. Caveat: Shot 1 cycle 2 allowed Codex to fix in place; that worked only because the fix was narrow and Claude Code independently verified. Keep alternation as default, and treat reviewer-in-place fixes as an exception.

4. **Amend-in-place via force-push-with-lease — STRONG.** TA-4b, TA-6a, TA-6b, DFM PR 3, and Shot 1 all used amend cycles without follow-up PR sprawl. The benefit is not just clean history; it keeps the PR's behavioral claim aligned with the final diff. Shot 1 is the key example: the Comparison rebuild commit ultimately included the source-pipeline wiring it claimed to deliver. Cost: low, mostly discipline around force-push and retesting. Failure rate: low after adoption. Keep.

5. **Runtime verification mandatory for demo-track slices — STRONG.** Runtime checks caught bugs tests missed: TA-6b's `shiftsGDP` spacing defect, Shot 1's duplicate locale-key overwrite, and the 7-vs-4 Comparison metric-row collapse after live wiring. These were visible output failures, not theoretical. Cost: 15-45 minutes per slice, sometimes higher on Windows because Codex has trouble keeping dev servers alive. Failure rate: builder often does it; reviewer runtime is environment-dependent. Keep, but assign live-render responsibility explicitly when Codex is reviewer on Windows.

6. **Honest-over-convenient attribution — STRONG.** DFM PR 1 handled this well: `data_version` meant data vintage, timestamp meant export time, RMSE fan chart wording did not overclaim Kalman covariance, and frozen-parameter caveats named the offline refit reality. Shot 1 preserved visible provenance and sentinel chips instead of smoothing content gaps. Cost: small in code, moderate in wording discipline. Failure rate: low; project culture strongly supports it. Keep.

7. **Trust surfaces stay visible to all audiences — STRONG.** The project owner explicitly rejected presentation-mode hiding during Presidential-demo scoping. TA-4b rendered Overview caveats and references; Shot 1 kept sentinel chips, AI attribution, provenance, and caveats visible. Demonstrated value: it prevented demo-polish pressure from becoming trust-surface removal. Cost: some visual density and stakeholder discomfort. Failure rate: low. Keep as a product principle, not only a process convention.

8. **ASCII in technical metadata, pretty-printing in display — MARGINAL but useful.** Evidence is narrower than for other conventions. DFM methodology labels used ASCII in JSON while leaving consumer-side pretty-printing for display. This is sensible and cheap, but has run only once or twice. Cost: negligible. Failure rate: not enough evidence. Keep as a lightweight data-contract convention; do not over-document it.

9. **Prompt-review before build for multi-surface slices — STRONG.** Shot 1 is decisive evidence. Codex found 10 blocking, 6 non-blocking, and 3 nit prompt issues before build: wrong prototype path, wrong component paths, wrong route, wrong locale path, serializability risk, missing chip class, and field-name errors. That likely saved 1-2 days of rework. Cost: several hours in Shot 1 because v1 was 61 KB and v2 was 66 KB. Failure rate: newly adopted, not yet broadly tested. Keep, but use tight trigger criteria to avoid making every slice bureaucratic.

10. **Spec/reference files committed by supervisor as branch preconditions — STRONG.** Shot 1 benefited directly: `spec_prototype.html` and `01_shot1_prompt.md` were committed before the builder started, and the audit could verify line counts, byte counts, paths, and anchors. This removed ambiguity about which prototype and prompt governed the work. Cost: low, maybe 5-15 minutes. Failure rate: newly adopted. Keep for any slice whose reference artifact is not already versioned.

11. **Targeted re-verification after amend, not full re-review — STRONG, with refinement needed.** TA-4b and TA-6a benefited from narrow re-checks that kept amend cycles affordable. Shot 1 cycle 2 showed the refinement: targeted re-verification must re-run original success anchors whose behavior was hidden by the fixed bug. The 7-vs-4 metric-row issue was exposed only after the source-pipeline fix removed the hardcoded mock. Cost: 5-15 minutes when truly targeted. Failure rate: good, but needs a rule for dependent anchors. Keep with that refinement.

12. **Preview verification catches what tests don't — STRONG.** This is now more than anecdote. TA-6b spacing, Shot 1 duplicate locale keys, and Shot 1 live-mode 7-row collapse all escaped tests. TA-4b's CSS token issue was found statically by review, but also illustrates that visual plausibility can hide broken CSS. Cost overlaps with runtime verification. Failure rate: preview sometimes cannot run in Codex's shell environment. Keep, and make it an assigned responsibility rather than a vague expectation.

## Section 2 — Conventions Missing

1. **Branch-target drift checkpoint.** Trigger: any PR targeting `main` during an epic-branch sprint, or any tactical default-branch change. What it would have prevented: the April 22 branch-strategy drift where four main-targeted PRs accumulated before the owner realized the branch model had changed in practice. Convention: after every main-targeted tactical PR, immediately decide whether to merge main back into epic, document why, and notify the supervisor in the session log.

2. **Audit-to-PR commitment ledger.** Trigger: any pre-build audit that blesses implementation commitments. What it would have prevented: Shot 1 cycle 1, where the audit committed to Comparison composition-layer wiring but the PR description reframed it as a carve-out. Convention: PR description includes a compact table of audit commitments with Delivered / Deferred / Changed. Deferred audit-committed work is a STOP condition unless explicitly adjudicated.

3. **Transfer-file verification.** Trigger: any time a prompt, artifact, or revised file is handed from one agent/session to another. What it would have prevented: Shot 1 v1-vs-v2 attachment confusion, where Codex initially reviewed the wrong prompt version and returned false failures. Convention: before asking for review, open the attached/transferred file and verify one known-changed line plus filename/version.

4. **Process-debt backlog.** Trigger: any process lesson marked "worth naming" or any non-code workflow failure. What it would have prevented: branch-target drift and Codex dev-server limitations reappearing as rediscovered lessons. Convention: keep a short `docs/process/backlog.md` or section in session histories with owner, trigger, and next-use rule. This should stay small; if it grows past one page, prune it.

## Section 3 — Process Drift

1. **Branch strategy drift from epic-first to tactical main-first. Severity: critical.** Session: 2026-04-22 full day; commits/PRs #77, #78, #82 landed on `main` before later reconciliation. Each decision was locally defensible, but cumulatively the project drifted from feature -> epic -> main into mixed targeting without explicit owner-level authorization. Action: formalize the branch-target drift checkpoint above. Do not let this lapse.

2. **Audit commitments silently revised by PR description. Severity: moderate to critical.** Session: Shot 1 / PR #89. The pre-build audit committed to a Comparison composition layer; the PR description listed live wiring as a carve-out. The reviewer caught it. Action: formalize the audit-to-PR ledger and treat disagreement as a STOP condition.

3. **Prompt assumptions drifting from codebase reality. Severity: moderate.** Sessions: TA-6a, TA-6b, Shot 1 prompt v1. The project increasingly depends on conversation histories, but summaries omitted TA-5's save/load reality and did not substitute for path/field verification. Action: keep read-before-write audits and prompt-review triggers; do not rely on histories as primary source for extend-existing-surface work.

4. **Review persistence drift: high-quality reviews are not stored as GitHub review objects. Severity: minor to moderate.** GitHub API returned empty `reviews` arrays for #74/#75/#87/#89, while the meaningful review substance lives in session histories and PR comments. That is workable for this retrospective but weak for future archaeology. Action: either paste final review verdicts into PR comments consistently or commit review notes under `docs/reviews/pr-XX-*.md` when they materially shape a merge.

5. **Targeted re-verification evolving beyond its original definition. Severity: minor.** Initially it meant "check only the flagged findings." Shot 1 proved that when a bug masks original anchors, dependent success criteria must also be rechecked. Action: formalize the new practice; do not revert to a narrower interpretation.

6. **Reviewer-fixes-in-place emerged without a convention. Severity: minor.** Shot 1 cycle 2 had Codex fix a bounded issue directly, then Claude Code verified independently. This was efficient, but it blurs builder/reviewer separation. Action: formalize as exception only: narrow bug, small diff, one independent verifier, no broad architecture changes.

## Section 4 — Recommendations for Sprint 3

1. **Adopt a branch-target checkpoint.** Why now: Sprint 2 already had main-vs-epic drift. Cost: 10 minutes per tactical main PR. Benefit: prevents branch strategy from changing by accident.

2. **Add an audit-to-PR commitment table for audited slices.** Why now: Shot 1 proved honest PR carve-outs can still contradict audit commitments. Cost: 10-20 minutes in PR description. Benefit: catches silent scope revision before reviewer has to reconstruct it.

3. **Keep prompt-review, but only for large or multi-surface prompts.** Why now: Shot 1 earned the practice, but making it universal would over-engineer process. Cost: 30-90 minutes when triggered. Benefit: high on complex slices, wasteful on small ones.

4. **Assign runtime verification ownership explicitly.** Why now: Codex on Windows has known dev-server friction; Claude Code can run preview more reliably. Cost: one line in prompt/review plan. Benefit: preview-only bugs keep getting caught without stalled reviews.

5. **Persist meaningful review verdicts in repo or PR comments.** Why now: GitHub review objects are mostly empty, and session histories are doing too much archival work. Cost: 5-10 minutes per consequential review. Benefit: future retrospectives and architectural reviews can cite stable artifacts.

6. **Drop process expansion unless it maps to a repeated failure.** Sprint 2's process is already heavy: audit, prompt review, builder, supervisor, reviewer, preview, amend, re-verification. The overhead is justified for demo-track, multi-page, or data-integrity work, but not for small docs, copy, or mechanical fixes. Sprint 3 should use tiers: lightweight path for low-risk changes, full path for high-risk slices.

