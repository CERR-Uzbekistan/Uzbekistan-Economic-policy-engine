# Backend Operations Contract

Date: 2026-04-27  
Status: planning contract; backend implementation remains blocked until accepted  
Scope: operational, hosting, security, deployment, retention, and fallback assumptions required before backend code

## 1. Contract Status

Backend implementation is **blocked** until this operations contract and `docs/planning/registry-api-fallback-adapter.md` are reviewed and accepted by the owner.

This document does not authorize:

- Backend application code.
- Database migrations.
- Frontend API wiring.
- Deployment workflow changes.
- New model calculations.
- New data artifacts.

`epic/replatform-execution` remains the internal-preview branch. This contract does not merge or approve a merge to `main`.

## 2. Recommended Backend Target

The recommended first backend remains a small FastAPI service with typed request/response schemas and a Postgres database.

Recommended FastAPI deploy target:

- Primary recommendation: containerized FastAPI deployed as a managed web service on Render for internal-preview/pilot backend evaluation.
- Why: simple GitHub-connected deploys, environment variables/secrets, HTTPS, health checks, logs, and a clear separation from GitHub Pages.
- Production caveat: Render is a recommendation for the first managed backend target, not an institutional mandate. If CERR requires institution-owned hosting, the same containerized FastAPI app should deploy to that approved platform instead.
- Non-recommendation for the first slice: do not deploy FastAPI inside GitHub Pages, do not depend on a developer workstation, and do not use a serverless function rewrite unless the API/runtime limits are accepted.

Recommended service posture:

- Runtime: Python FastAPI.
- API namespace: `/api/v1`.
- First API capability: read-only registry metadata and artifact export metadata.
- First write capability, later only after auth is accepted: internal artifact-export and validation-check ingestion.
- Public artifact payloads: continue to be served from `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json` during the first backend phase.
- Backend role: metadata, persistence, validation history, ownership, and audit records.
- Non-role: replacing static artifacts, running model calculations, adding public writes, or implementing unaccepted model lanes.

The backend should start as an additive sidecar to the static GitHub Pages app. It should not become a prerequisite for the current internal-preview UI to load.

## 3. Recommended Postgres Host Option

Preferred initial production-like database target: managed Postgres.

Recommended Postgres host option:

- Primary recommendation: Supabase Postgres if the owner accepts the external managed platform, backup posture, service-key controls, and possible future Auth/RLS path.
- Simpler co-located fallback: Render Postgres if the owner chooses Render for FastAPI and prefers one vendor for early internal-preview/pilot operations.
- Institution-hosted alternative: CERR or approved institution-managed Postgres if data residency, procurement, or governance constraints rule out external managed services.

Acceptable managed options:

- Supabase Postgres, if the owner accepts external platform dependency, service-key controls, backup features, and any future auth/RLS design.
- Neon, Crunchy Bridge, Render Postgres, Railway Postgres, or another managed Postgres provider, if institutional security and operations constraints allow it.
- Institution-managed Postgres, if CERR or the hosting owner can provide backups, credentials, monitoring, and restore support.

Local development may use local Postgres. SQLite may be used only for throwaway developer convenience if the implementation and tests remain Postgres-compatible. SQLite must not become the pilot or production target.

The host choice is not accepted until the operations owner confirms:

- Who pays for and administers the database.
- Where backups are configured.
- Who can rotate credentials.
- How restore is tested.
- Whether data may leave the institution's preferred hosting boundary.

## 4. Environments

### Local

Purpose:

- Developer-only backend work after contract acceptance.
- Local API contract tests and seed/fixture ingestion.
- No institutional data beyond existing public/static artifacts unless explicitly approved.

Rules:

- Use `.env` or local secret manager files excluded from Git.
- Do not commit local database dumps.
- Do not depend on local API availability for the current static app unless API mode is explicitly enabled.

### Internal Preview

Purpose:

- Current `epic/replatform-execution` review surface.
- Static GitHub Pages sidecar at `/policy-ui/`.
- Review of UI workflows, state labels, artifact provenance, and fallback behavior.

Rules:

- Static artifacts remain authoritative for the current UI.
- Backend, if later deployed, is optional and additive.
- No public write endpoints.
- No claim that the Data Registry is a live governance database.

### Pilot

Purpose:

- Structured evaluator sessions after hosted smoke, named roster, language review gates, and owner acceptance.
- Possible server-side saved runs only if auth/session ownership and retention are accepted.

Rules:

- Any server write must have an accepted owner model: authenticated user or explicit evaluator/session owner.
- Pilot data retention must be accepted before collection.
- Pilot feedback must not be treated as production validation.

### Production

Purpose:

- Institution-ready or public-facing deployment after governance, auth, backups, monitoring, retention, release, and rollback procedures are routine.

Rules:

- Managed or institution-owned Postgres must have backup/restore support.
- Write endpoints must be authenticated and audited.
- Secrets must be centrally managed.
- Static artifact compatibility routes should remain until a formal deprecation is accepted.

## 5. Secrets Handling

Secrets must never be shipped to the frontend or committed to Git.

Required secret categories:

- Database connection URL and role-specific credentials.
- Internal ingestion token or service credential.
- Object storage credentials, if artifact payloads later move out of GitHub Pages.
- Auth provider secrets, only after full identity is accepted.
- Any source credentials, if future data pulls require them.

Handling rules:

- Local: `.env` files ignored by Git.
- CI/deploy: GitHub Actions secrets or the selected host's secret manager.
- Runtime: environment variables or managed secret injection.
- Rotation: owner must be identified before pilot writes.
- Scope: use separate credentials for local, preview, pilot, and production.
- Principle: frontend receives only public base URLs or non-secret feature flags.

Service-role or database superuser credentials must not be used by browser clients, Pages builds, or public JavaScript bundles.

## 6. CI And Deploy Story Alongside GitHub Pages

Current GitHub Pages deployment remains the static UI path:

- Build `apps/policy-ui`.
- Preserve the legacy repository root.
- Overlay the React sidecar under `/policy-ui/`.
- Serve current public artifacts under `/policy-ui/data/*.json`.

The backend should be deployed separately from GitHub Pages.

Recommended CI/deploy split:

- Static UI: existing GitHub Pages workflow.
- Backend API: separate workflow or host-native deploy pipeline.
- Database migrations: explicit backend workflow after implementation is authorized; no migrations in this planning pass.
- API health checks: later backend pipeline should check `/api/v1/health` or equivalent.
- Contract checks: later backend pipeline should validate response shape against accepted API/static fallback contract.

The static app must continue to function when the backend deploy is down, absent, or intentionally disabled.

## 7. Backup And Restore Assumptions

Backup assumptions must be accepted before production-like backend writes:

- Postgres has automated backups with point-in-time restore if the selected host supports it.
- At minimum, daily backups exist for pilot and production.
- Restore is tested before production claims.
- Backup access is limited to the operations owner and authorized maintainers.
- Retention of backups matches the data retention policy and does not silently preserve data that should be deleted.

Artifact payloads currently in Git are versioned by repository history. If payloads later move to object storage, the storage layer must support:

- Versioned objects or immutable keys.
- Checksums.
- Previous-artifact rollback pointers.
- A restore path for the currently published artifact.

## 8. Retention Assumptions

Final retention windows require owner acceptance. Until then, use these planning defaults:

| Record | Planning default | Reason |
|---|---:|---|
| `artifact_exports` | Indefinite for accepted public/internal artifacts | Required for provenance, rollback, and review history. |
| `validation_checks` | Indefinite for checks linked to accepted artifacts | Required to explain artifact state over time. |
| Failed ingestion attempts | 180 days unless needed for incident review | Useful for operations, but not a permanent archive by default. |
| Saved runs | Undecided | Depends on pilot/institutional persistence decision and consent posture. |
| Evaluator sessions | Undecided | Must align with pilot consent and owner policy. |
| Knowledge Hub review events | Indefinite after Knowledge Hub workflow acceptance | Required for content governance. |

`artifact_exports` and `validation_checks` should be append-oriented. Corrections should normally create a new export/check or review event rather than mutating history.

## 9. Ingestion Auth Posture

Recommended first ingestion posture: internal token, not full user identity.

Rationale:

- The first backend slice should ingest artifact metadata and validation results from trusted internal export jobs.
- It does not need broad user login to record artifact exports.
- A tightly scoped token is simpler than implementing full identity before the write surface is understood.

Rules for internal token ingestion:

- Token is stored only in CI/host secrets.
- Token has access only to internal ingestion endpoints such as `/api/v1/internal/artifact-exports` and `/api/v1/internal/validation-checks`.
- Token cannot read or write user-owned saved runs.
- Token cannot edit source records through public/admin CRUD.
- Ingestion endpoints are rate-limited and logged.
- Public clients never receive the token.

Full identity is required before:

- Server-side saved runs.
- User or evaluator ownership.
- Knowledge Hub CRUD or review actions.
- Admin source management.
- Any user-visible write, archive, approval, or sharing workflow.

## 10. Ops Owner Decision

Backend work remains blocked until one operations owner is explicitly named.

The ops owner is accountable for:

- Backend host selection.
- Postgres host selection.
- Secret creation and rotation.
- Backup and restore.
- Deploy permissions.
- Monitoring and incident response.
- Environment separation.
- Retention policy acceptance.
- Cutover decisions from static-only to API-prefer mode.

The ops owner may delegate tasks, but ownership cannot be implicit.

## 11. What Remains Static

The following remain static in the first backend phase:

- `/data/qpm.json`.
- `/data/dfm.json`.
- `/data/io.json`.
- Static artifact payload consumption by the current frontend.
- Data Registry frontend composition unless API mode is explicitly enabled.
- Knowledge Hub preview content.
- Planned HFI, PE, CGE, FPP, and Synthesis rows.
- Browser-local saved-run behavior and local-only disclosure.
- GitHub Pages static UI deployment.

The backend may mirror metadata for current artifacts, but it does not supersede the payload artifacts until an explicit adapter switch is accepted.

## 12. Explicit No-Go Scope

No work is authorized yet for:

- High-frequency indicator storage or live HFI API.
- Saved-run server persistence.
- Knowledge Hub CRUD.
- PE Trade Shock backend work.
- CGE Reform Shock backend work.
- FPP Fiscal Path backend work.
- Cross-model synthesis backend work.
- Scheduler controls.
- Public upload flows.
- Source-management admin CRUD.
- Authenticated user roles beyond planning.

These areas require separate accepted contracts before implementation.

## 13. STOP Conditions Before Backend Code

Stop before backend code if any item remains unresolved:

- This operations contract is not accepted.
- `docs/planning/registry-api-fallback-adapter.md` is not accepted.
- Backend deploy target is not selected.
- Postgres host option is not selected.
- Ops owner is not named.
- Secrets handling path is not accepted.
- CI/deploy split alongside GitHub Pages is not accepted.
- Backup/restore assumptions are not accepted for the target environment.
- Retention assumptions for `artifact_exports` and `validation_checks` are not accepted.
- Ingestion auth posture is not accepted.
- Any first backend slice attempts HFI, saved-run persistence, Knowledge Hub CRUD, PE, CGE, FPP, or synthesis work.
- Any implementation would require changing current frontend app code before the frontend API/static fallback contract is accepted.
- Any implementation would make the current static app fail when the API is unavailable.

## 14. Acceptance Checklist

Owner acceptance should record:

- FastAPI accepted as the first backend service target.
- Managed or institution-owned Postgres option selected.
- Local, internal-preview, pilot, and production environment responsibilities accepted.
- Secrets owner and storage method accepted.
- Backend deploy path accepted as separate from GitHub Pages.
- Backup/restore baseline accepted.
- Retention baseline accepted for `artifact_exports` and `validation_checks`.
- Internal-token ingestion accepted for the first write slice, or full identity required instead.
- Ops owner named.
- Static artifacts confirmed as the fallback and current source of UI payload truth.
- No-go scope confirmed.
