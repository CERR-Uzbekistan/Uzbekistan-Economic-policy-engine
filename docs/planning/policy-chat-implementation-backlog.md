# Policy Chat MVP ? Implementation Backlog

**Status:** Ready for Phase 0 decisions
**Date:** 2026-07-17
**Governing specification:** `docs/planning/policy-chat-mvp-spec.md`
**Release claim:** Internal authenticated pilot only
**Enabled scope:** QPM, read-only DFM, and I-O

## 1. Purpose and delivery rules

This backlog converts the confirmed specification into sequenced, issue-ready work. Preserve the PC IDs when copying items into GitHub issues.

1. Phase 0 is a hard gate: no application code, migration, provider call, or frontend wiring starts before owner decisions are accepted.
2. Every slice follows the repository full-path process: read-before-write audit, audit-to-PR ledger, targeted verification, and reviewer evidence.
3. Static GitHub Pages remains functional when Policy Chat is disabled or unavailable.
4. The browser receives no provider, database, ingestion, or service credentials.
5. The LLM proposes and explains; server-side allowlisted adapters validate and execute.
6. Every run requires explicit confirmation of the currently displayed proposal hash.
7. PE, CGE, FPP, HFI, DFM updates, uploads, browsing, and unreviewed cross-model aggregation remain out of scope.
8. English strings stabilize before RU/UZ review. Prefer small PRs; do not combine backend, orchestration, and UI in one change.

Sizes: **S** isolated, **M** bounded service/component, **L** multi-file workflow. Priorities: **P0** blocker, **P1** MVP, **P2** pilot hardening.

Required roles are product owner, operations owner, security/identity owner, data-governance owner, QPM/DFM/I-O model owners, backend lead, frontend lead, QA/evaluation owner, and translation reviewer.

## 2. Milestones

```text
M0 decisions (PC-001..007)
  -> M1 deterministic service (PC-101..112)
  -> M2 grounded orchestration (PC-201..206)
  -> M3 React vertical (PC-301..309)
  -> M4 integration/operations (PC-401..406)
  -> M5 pilot decision (PC-407..408)
```

- **M0:** all Phase 0 decisions accepted.
- **M1:** QPM/DFM/I-O adapter tests pass; stale or unconfirmed execution is rejected.
- **M2:** routing target, grounding checks, and deterministic fallback pass.
- **M3:** authenticated model flows and WCAG-critical paths pass in EN.
- **M4:** save, observability, kill switch, deployment, RU/UZ, and security gates pass.
- **M5:** pilot accepted with no unresolved P0/P1 findings.

## 3. Phase 0 ? owner decisions

| ID | Issue | Pri/size | Depends | Acceptance evidence |
|---|---|---|---|---|
| PC-001 | Accept backend operations contract; name operations owner | P0/S | ? | FastAPI/Postgres hosts, owner/backup, secrets, backup/restore, monitoring, environments, fallback, and Policy Chat write authority accepted. |
| PC-002 | Select identity provider and authorization model | P0/M | 001 | Issuer/audience/claims, user/reviewer/admin roles, sessions, disabled-user/local-dev behavior, and conversation-access policy approved. |
| PC-003 | Approve LLM provider and data profile | P0/M | 001 | Deployment/region, retention/training, redaction, allowed fields, token/cost/rate limits, outage policy, and kill switch approved. |
| PC-004 | Approve retention, deletion, and reviewer access | P0/S | 002,003 | Retention for conversations/runs/saves/audit/provider traces/backups, deletion rules, privileged access, and notice owner recorded. |
| PC-005 | Approve deployment/network topology | P0/M | 001?003 | Frontend/API/DB/model/provider paths, TLS/CORS/session rules, feature flags, health, migration, rollback, and backend-down behavior approved. |
| PC-006 | Freeze capability manifest v1 | P0/L | ? | Model owners sign operations, parameters, ranges, units, defaults, editable fields, stable metrics, caveats, DFM read-only rule, and exclusions. |
| PC-007 | Select server-backed saved-scenario contract | P0/M | 004,006 | Ownership/versioning/attribution/model boundaries mapped to consumers; no silent local migration; opaque deep links. |

## 4. Epic A ? deterministic backend

| ID | Issue | Pri/size | Depends | Acceptance evidence |
|---|---|---|---|---|
| PC-101 | Scaffold isolated API and typed settings | P1/M | 001,005 | Separate `/api/v1/policy-chat`; DB/auth/provider/flags/limits settings; disabled default; safe health/readiness; config tests. |
| PC-102 | Add Postgres schema and migrations | P1/L | 004,007,101 | Identity, conversations, turns, proposals, runs, saves, audit; indexed ownership; immutable confirmations; retention fields; Postgres migration tests. |
| PC-103 | Implement auth and role enforcement | P0/L | 002,005,101 | Issuer/audience/expiry/claims; owner scope; audited privilege; distinct 401/403; horizontal/vertical escalation tests. |
| PC-104 | Implement capability loader/validator | P1/L | 006,101 | Startup validation; disabled/unknown fail closed; type/range/unit/default/edit checks; server kill switch; drift snapshots. |
| PC-105 | Implement append-only audit service | P0/M | 004,102,103 | Access/proposal/edit/confirm/run/fail/save/delete/review events correlated; general logs exclude prompt/result bodies. |
| PC-106 | Implement QPM adapter | P1/L | 104 | Approved impulse/baseline inputs; sign/horizon/boundary tests; stable result metrics/units/baseline semantics; attribution/caveats; direct reconciliation. |
| PC-107 | Implement read-only DFM adapter | P1/M | 104 | Latest nowcast only; bands/contributions/freshness/vintage; updates rejected; missing/stale/invalid paths tested. |
| PC-108 | Implement I-O adapter | P1/L | 104 | Demand/unit/distribution/sector validation; aliases and ambiguity; output/VA/employment semantics; 2022/static caveat; direct reconciliation. |
| PC-109 | Implement conversation/turn endpoints | P1/L | 102,103,105 | Owner-scoped pagination; idempotent turns; locale/content/length/limit checks; deterministic concurrency; no prompt in URLs/logs. |
| PC-110 | Implement proposal edit/hash/confirmation | P0/L | 104,105,109 | Hash covers operation/capability/normalized values/origins; edit invalidates; editable-only changes; stale/tampered/replayed confirmation rejected. |
| PC-111 | Implement allowlisted run lifecycle | P1/L | 106?108,110 | Idempotent request; persisted states; no synthetic output on failure; confirmed input/raw and normalized output/attribution linked. |
| PC-112 | Add safe run delivery/result schemas | P1/M | 111 | Polling; optional proven SSE; quantitative output only after validation; reconnect no duplicate; operation-discriminated schemas; no secrets/reasoning. |

## 5. Epic B ? interpretation and grounding

| ID | Issue | Pri/size | Depends | Acceptance evidence |
|---|---|---|---|---|
| PC-201 | Implement provider-neutral secure client | P1/M | 003,101 | Proposal/explanation interfaces; server-only secrets; limits/retries/cost; approved traces; fake provider for tests. |
| PC-202 | Implement structured routing/proposals | P1/L | 104,109,201 | Proposal/clarification/unsupported/information schemas; parameter origins; server operation recheck; focused ambiguity; no substitution. |
| PC-203 | Implement conversation-context policy | P1/M | 004,202 | Explanation can reuse result; changed run creates proposal; minimum context; structured record authority; ?same but?/stale tests. |
| PC-204 | Implement result-explanation service | P1/L | 106?108,201 | Confirmed inputs/normalized result/approved caveats only; summary/interpretation/limitations; normative/official claims blocked; unit semantics preserved. |
| PC-205 | Implement numeric/claim grounding | P0/L | 204 | Values match result/input/approved calculation; rounding documented; unsupported causality/aggregation fails; one retry then deterministic fallback. |
| PC-206 | Build golden prompt/injection suite | P0/L | 006,202,205 | Spec fixture counts; EN/RU/UZ/mixed/ambiguous/unsupported/follow-ups; ?90% safe routing; zero unauthorized executions. |

## 6. Epic C ? React experience

| ID | Issue | Pri/size | Depends | Acceptance evidence |
|---|---|---|---|---|
| PC-301 | Add typed client, guards, and source state | P1/L | 109,110,112 | Discriminated payloads; malformed blocked; auth/timeout/network/disabled states distinct; typed env; tests follow repo patterns. |
| PC-302 | Add gated route/navigation/access state | P1/S | 005,301 | Lazy `/policy-chat`; nav after Scenario Lab for authorized users; protected content hidden; static build unaffected when off. |
| PC-303 | Build empty state, timeline, composer | P1/L | 301,302 | Scope/review rule, starters, submit/cancel/validation/notice, semantic timeline, approved unsent-text behavior. |
| PC-304 | Build assumption ledger/confirmation | P0/L | 110,301,303 | Model/operation/value/unit/range/origin/vintage/caveat visible; edits invalidate; Run sends explicit confirmation; warning/focus handling. |
| PC-305 | Build run state/model-native results | P1/L | 112,304 | QPM/DFM/I-O views; accessible charts/tables; result vs interpretation/limitations; explanation failure preserves model result. |
| PC-306 | Build run ledger/history | P1/M | 109,305 | Current state/history/vintage/save visible; responsive in-flow; long history usable; pending proposal marks prior context. |
| PC-307 | Add recovery/session-expiry behavior | P0/M | 301,303?305 | Specific auth/network/model/provider/validation recovery; retry idempotent; protected cache cleared; no replacement numbers. |
| PC-308 | Complete EN/RU/UZ review | P1/L | 303?307 | EN frozen first; critical flows translated; stable IDs; economic terminology owner-reviewed; scripts/aliases/truncation verified. |
| PC-309 | Accessibility/responsive/design gate | P0/L | 303?308 | Keyboard flows; concise live regions/focus; WCAG 2.2 AA; 375px?wide desktop; chart alternatives; institutional design review. |

## 7. Epic D ? integration, operations, and pilot

| ID | Issue | Pri/size | Depends | Acceptance evidence |
|---|---|---|---|---|
| PC-401 | Add server-backed save/Scenario Lab handoff | P1/L | 007,102,305 | Model-native save with attribution/owner/version; idempotent/audited; opaque link; localStorage stays separate. |
| PC-402 | Add compatible Comparison handoff | P2/M | 401 | Compatible only; units/boundaries preserved; incompatibility explained; no cross-model synthesis. |
| PC-403 | Add correlation/telemetry/cost monitoring | P1/M | 105,111,201 | End-to-end correlation; outcome/latency/grounding/save/token/cost metrics; no bodies; alerts and owners. |
| PC-404 | Add rate limits/quotas/kill switches | P0/M | 003,103,104,111 | User/operation/provider/environment limits; disable feature/model/operation server-side; fail closed; controls audited. |
| PC-405 | Add CI/migration/deploy/rollback/smoke | P0/L | 005,102,309,403,404 | Quality/security/contract gates; controlled migrations; separated envs; rollback; static outage survival; hosted auth/run/decline/save/logout/disabled smoke. |
| PC-406 | Complete security/privacy review | P0/L | 103,105,205,307,403?405 | Threat model for injection/auth/IDOR/replay/tamper/leak/cost; scans/auth tests; retention/provider controls; zero open P0. |
| PC-407 | Run controlled analyst pilot | P1/L | 206,308,309,401,403,405,406 | Named evaluators; model/clarification/unsupported/provenance tasks; scenario-not-forecast check; metrics captured; findings triaged. |
| PC-408 | Record pilot release decision | P0/M | 407 | Spec evidence linked; no P0/P1; model/security/ops acceptance; release/extend/stop recorded; extra models separately gated. |

## 8. Recommended PR sequence

1. PR 0A: PC-001..005 decision records.
2. PR 0B: PC-006..007 capability and save contracts.
3. PR 1: PC-101..105 secure foundation.
4. PR 2: PC-106 plus QPM portion of PC-110..112.
5. PR 3: PC-107..108 adapters and reconciliation.
6. PR 4: remaining PC-109..112 lifecycle.
7. PR 5: PC-201..203 proposal path and first golden fixtures.
8. PR 6: PC-204..206 explanation, grounding, evaluation.
9. PR 7: PC-301..304 frontend QPM vertical.
10. PR 8: PC-305..307 all-model results, ledger, recovery.
11. PR 9: PC-308..309 localization/accessibility/design.
12. PR 10: PC-401 and optionally PC-402.
13. PR 11: PC-403..406 operations/security.
14. Pilot and release record: PC-407..408.

## 9. Ready, done, and STOP rules

An issue is **ready** when Phase 0 dependencies are accepted; owner/reviewer named; audit identifies consumers; contracts are testable; security/data/model questions resolved; verification and branch/PR base recorded.

An issue is **done** when acceptance is evidenced; proportional unit/contract/integration/E2E/accessibility/hosted checks pass; failure and unauthorized states are tested; docs/i18n/config/ops notes are updated; audit commitments reconcile; reviewer findings resolve; release language matches evidence.

STOP if identity, provider, hosting, retention, operations ownership, or capability approval is unresolved; a secret would reach the browser; execution can bypass validation/current confirmation; excluded scope enters; narrative cannot ground/fallback safely; static Pages would break; model semantics are disputed; pilot data lacks authority; or release language exceeds internal authenticated pilot.

## 10. Immediate next action

Assign PC-001 through PC-007. After M0, implement PC-101 through PC-105 first, then prove one deterministic QPM vertical before broadening models, orchestration, or UI.

Do not create all GitHub issues until the project owner selects the target milestone and branch. When created, use the feature-request template and copy the ID, dependencies, acceptance evidence, priority, and size.
