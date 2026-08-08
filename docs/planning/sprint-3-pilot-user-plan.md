# Sprint 3 TB-P4 Pilot User Plan

**Owner:** Nozimjon Ortiqov  
**Named evaluator deadline:** 2026-05-08  
**Scope:** Planning and feedback capture only. TB-P1 deployment migration is implemented separately and supplies the hosted access path.
**Roadmap priority constraint:** This plan records the pilot path and Sprint 4 intake process; it does not change roadmap priorities.

## Purpose

TB-P4 creates a narrow evaluator path for Sprint 3 so the React pilot surface can be tested by outside eyes before Sprint 4 planning. The goal is not to run a guided demo or reopen the replatform roadmap. The goal is to observe whether the current surface is understandable, credible, and operationally usable enough to inform Sprint 4 backlog triage.

Pilot readiness must not be claimed until evaluators are named and the feedback loop is ready.

## Evaluator Path

Nozimjon Ortiqov owns naming 2-3 evaluators by 2026-05-08. Until names are confirmed, use the following path:

| Evaluator slot | Lens | Naming requirement |
|---|---|---|
| Evaluator 1 | Policy narrative and interpretability | Name one evaluator who can judge whether the app's macro story, caveats, and policy implications are understandable without team narration. |
| Evaluator 2 | Model credibility and assumptions | Name one evaluator who can assess whether model provenance, assumptions, and limitations are credible enough for policy discussion. |
| Evaluator 3, optional | Operational usability and workflow | Name one evaluator who can test whether the app supports realistic workflow across Overview, Scenario Lab, Comparison, Model Explorer, and Knowledge Hub. |

If only two evaluators are available, assign the operational usability lens to the evaluator most likely to exercise multiple pages. The minimum path is two evaluators covering all three lenses; the preferred path is three evaluators with one primary lens each.

## Session Shape

Each session should be observational, not a walkthrough.

- Duration: 30 minutes.
- Format: evaluator uses the pilot surface while the team observes.
- Prompting: use short task prompts only when the evaluator stalls; do not explain the intended answer.
- Capture: record observations in `docs/frontend-replatform/13_pilot_observations.md`.
- Deployment: use the Sprint 3 React pilot at `/policy-ui/#/overview` on the repository GitHub Pages site once the TB-P1 deployment branch is merged and deployed. If the hosted URL is unavailable, record that access constraint separately from evaluator feedback.

## Feedback Capture Process

During each session, capture:

- Evaluator name, role, institution, and assigned lens.
- Date, surface tested, and task prompt used.
- What the evaluator tried first.
- Where the evaluator hesitated, misunderstood, or asked for explanation.
- Evidence that strengthened confidence in the current roadmap.
- Evidence that challenges the current roadmap.
- Direct quotes, kept short and attributed.
- Follow-up questions from the evaluator.
- Severity and proposed Sprint 4 triage disposition.

After all sessions, Nozimjon Ortiqov performs a single synthesis pass:

- Consolidate duplicate observations.
- Assign severity using the rules below.
- Identify whether any item changes Sprint 4 sequencing.
- Keep roadmap priority changes out of this document unless a separate Sprint 4 planning decision explicitly adopts them.

## Severity Rules

Use the following severity levels for pilot observations:

| Severity | Rule | Default disposition |
|---|---|---|
| P0 | Blocks evaluator from completing a core task or creates materially misleading policy interpretation. | Stop pilot-readiness claim and fix before broader pilot use. |
| P1 | Creates serious credibility, interpretability, or workflow risk but has a contained fix. | Candidate for Sprint 4 must-address backlog. |
| P2 | Causes friction, confusion, or missing context that does not block evaluation. | Sprint 4 backlog candidate if repeated or cheap to fix. |
| P3 | Preference, polish, or nice-to-have improvement with no direct credibility or workflow risk. | Record for later; do not displace roadmap priorities by default. |

## Decision Criteria

An observation becomes Sprint 4 priority input only when at least one condition is met:

- It appears in more than one evaluator session.
- It affects the assigned lens for that evaluator.
- It creates a policy-interpretation or model-credibility risk.
- It blocks a workflow needed for realistic policy review.
- It exposes a contradiction between the current roadmap and actual evaluator behavior.

An observation should not alter Sprint 4 sequencing when it is:

- Purely cosmetic.
- A request for a new roadmap item unrelated to the current pilot surface.
- Dependent on changing TB-P1 deployment architecture rather than using the GitHub Pages `/policy-ui/` pilot path.
- Dependent on changing roadmap priorities without a separate Sprint 4 planning decision.

## Sprint 4 Backlog Triage Fields

Use these fields when converting observations into backlog candidates:

| Field | Description |
|---|---|
| Observation ID | Stable ID from `docs/frontend-replatform/13_pilot_observations.md`. |
| Evaluator lens | One of the three evaluator lenses. |
| Affected surface | Overview, Scenario Lab, Comparison, Model Explorer, Knowledge Hub, cross-page, or access/setup. |
| Evidence | Concise observation or short quote. |
| Severity | P0, P1, P2, or P3. |
| Decision | Must address in Sprint 4, consider in Sprint 4, defer, or reject. |
| Rationale | Why the decision follows from the evidence. |
| Owner | Person responsible for the backlog item or follow-up decision. |
| Dependency | Any required prerequisite, including whether it depends on TB-P1 or future bridge work. |
| Status | New, accepted, deferred, rejected, or needs owner decision. |

## Out of Scope

- Changing TB-P1 deployment architecture or replacing the legacy root.
- Changing roadmap priorities directly in this document.
- Guided stakeholder demos presented as user research.
- New bridge work, app code changes, or UI polish.
- RU/UZ translation changes.

## Verification

Documentation review only:

- Confirm `docs/planning/sprint-3-pilot-user-plan.md` exists.
- Confirm `docs/frontend-replatform/13_pilot_observations.md` exists.
- Confirm the observation template no longer uses the outdated April 28-30, TA-3, or TA-4 session framing.
