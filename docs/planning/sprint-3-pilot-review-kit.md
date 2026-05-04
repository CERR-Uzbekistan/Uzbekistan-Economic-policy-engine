# Sprint 3 Pilot Review Kit

Date: 2026-04-26  
Branch: `epic/replatform-execution`  
Status: deferred / ready to use later

Named evaluator sessions are skipped for now. Use this kit when the pilot resumes; until then, the Sprint 3 branch remains an internal preview release candidate, not pilot-ready.

Pilot readiness requires named evaluators. The release candidate can be internally previewed before evaluator names are confirmed, but it must not be described as pilot-ready until the minimum evaluator roster is named, the hosted smoke checklist is complete, and human RU/UZ terminology review is complete.

## Evaluator Invitation Note

Deferred until named evaluator sessions resume.

Subject: Invitation to review the Uzbekistan policy UI pilot

Hello `[name]`,

We are preparing a controlled 30-minute pilot review of the Sprint 3 policy UI release candidate. The goal is to observe whether the current interface is understandable, credible, and usable for policy discussion without team narration.

This is not a public launch and not a request to validate every model result. We are looking for practical feedback on the current pilot surface: Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub.

During the session, we will ask you to complete a few short tasks while we observe where the interface is clear, where it creates friction, and which caveats or evidence affect your trust. We will record observations for Sprint 4 triage.

Please confirm whether you can join a 30-minute session and whether your preferred review lens is policy narrative, model credibility, or operational usability.

## Required Evaluator Roster

Deferred until pilot sessions resume.

| Slot | Lens | Requirement | Status |
|---|---|---|---|
| Evaluator 1 | Policy narrative and interpretability | Named evaluator who can judge whether the macro story, caveats, and policy implications are understandable without narration. | `[TBD]` |
| Evaluator 2 | Model credibility and assumptions | Named evaluator who can judge whether model provenance, assumptions, and limitations are credible enough for policy discussion. | `[TBD]` |
| Evaluator 3, optional | Operational usability and workflow | Named evaluator who can test realistic movement across the pilot surfaces. | `[TBD]` |

Minimum path: two named evaluators covering all three lenses. Preferred path: three named evaluators with one primary lens each.

## 30-Minute Session Script

| Time | Activity | Facilitator notes |
|---|---|---|
| 0-3 min | Welcome and scope | State that this is a release-candidate pilot review, not a guided demo or public launch. |
| 3-5 min | Role and lens confirmation | Confirm evaluator role, institution, and primary lens. |
| 5-7 min | Access check | Open hosted `/policy-ui/#/overview`; confirm no access issue. Record setup issues separately from product findings. |
| 7-22 min | Task prompts | Give one prompt at a time. Let the evaluator navigate without explaining the intended answer. |
| 22-27 min | Follow-up questions | Ask what created trust, what created hesitation, and what they would need before using this in a policy discussion. |
| 27-30 min | Closeout | Confirm permission to use short attributed quotes internally and explain Sprint 4 triage. |

## Observer Checklist

- Evaluator name, role, institution, and assigned lens recorded.
- Hosted URL and commit SHA recorded.
- Access/setup issues separated from product observations.
- First action recorded without interpretation.
- Navigation path recorded.
- Points of hesitation or confusion recorded.
- Evidence/caveats that increased trust recorded.
- Evidence/caveats that reduced trust recorded.
- Any misleading interpretation recorded as possible P0/P1.
- Short quotes captured with attribution.
- Follow-up questions captured.
- Severity assigned after the session, not during the task.
- Sprint 4 intake fields completed for any actionable observation.

## Observer Prompts

Use these prompts when the evaluator pauses, completes a task, or gives an ambiguous reaction. Ask neutrally; do not explain the intended interpretation first.

- "What do you think this chart or table is saying?"
- "Are the model lanes clear enough to tell what is active, planned, or saved?"
- "Does the current analytical context help you understand where you are and what result you are viewing?"
- "Do the trust, provenance, and caveat labels make the result clearer, or do they feel noisy?"
- "Which label, chart element, or table cue most helped you trust or question the result?"

## Task Prompts

Use prompts that fit the evaluator lens. Do not explain the answer before the evaluator tries the task.

| Prompt | Primary lens | Success signal |
|---|---|---|
| "Start from Overview and explain what you think the current macro policy story is." | Policy narrative and interpretability | Evaluator can identify the policy signal, caveats, and next action without narration. |
| "Find where the app explains model evidence and limitations for I-O." | Model credibility and assumptions | Evaluator reaches Model Explorer I-O evidence and reacts to source, vintage, framework, and caveats. |
| "Use Scenario Lab to create and save an I-O sector shock run." | Operational usability and workflow | Evaluator can run, interpret, and save the I-O flow with limited prompting. |
| "Add a saved I-O run into Comparison and tell us what changed." | Operational usability and workflow | Evaluator can add the saved run and distinguish I-O analytics from macro comparison rows. |
| "Open Data Registry and decide which model/data assets look implemented versus planned." | Model credibility and assumptions | Evaluator understands implemented/planned status and warning states. |
| "Switch EN/RU/UZ and tell us whether the interface still feels usable." | Policy narrative and interpretability | Evaluator can switch languages and flag comprehension/layout issues without route breakage. |

## Severity Rubric

| Severity | Rule | Default Sprint 4 handling |
|---|---|---|
| P0 | Blocks a core task or creates materially misleading policy interpretation. | Stop pilot-readiness or main-merge claim until resolved. |
| P1 | Creates serious credibility, interpretability, or workflow risk with a contained fix. | Must-address Sprint 4 candidate. |
| P2 | Creates friction, confusion, or missing context but does not block evaluation. | Consider for Sprint 4 if repeated, cheap, or tied to evaluator lens. |
| P3 | Preference, polish, or nice-to-have improvement. | Record for later; do not displace roadmap priorities by default. |

## Sprint 4 Feedback Intake Template

Copy one row per accepted observation into Sprint 4 triage.

| Field | Value |
|---|---|
| Observation ID | `S3-PILOT-[session]-[short-id]` |
| Evaluator | `[name / role / institution]` |
| Primary lens | `[policy narrative / model credibility / operational usability]` |
| Surface | `[Overview / Scenario Lab / Comparison / Model Explorer / Data Registry / Knowledge Hub / cross-page / access]` |
| Task prompt | `[prompt used]` |
| Evidence | `[concise observation or short quote]` |
| Severity | `[P0 / P1 / P2 / P3]` |
| Proposed Sprint 4 disposition | `[must address / consider / defer / reject / owner decision]` |
| Rationale | `[why this follows from the evidence]` |
| Owner | `[name]` |
| Dependency | `[none / deployment / bridge / data artifact / i18n / owner decision / other]` |
| Status | `[new / accepted / deferred / rejected / needs owner decision]` |

## Pilot Readiness Rule

Pilot readiness is deferred while named evaluator sessions are skipped. When pilot work resumes, readiness requires all of the following:

1. Hosted smoke checklist completed with a `go` verdict.
2. Minimum named evaluator roster confirmed.
3. Session capture path prepared in `docs/frontend-replatform/13_pilot_observations.md`.
4. Facilitator and observer roles assigned.
5. Sprint 4 intake owner identified.

Until those conditions are met, the correct status is internal preview release candidate, not pilot-ready.
