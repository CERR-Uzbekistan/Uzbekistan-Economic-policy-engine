# Backend/Database Architecture Plan

Date: 2026-04-27  
Status: planning only; no backend implementation or database migrations authorized by this document  
Scope: backend/database architecture for the full platform after Data Registry v2 foundation

Prerequisite contracts before implementation:

- `docs/planning/backend-operations-contract.md` must be accepted for hosting, operations, secrets, deployment, backup/restore, retention, and ingestion-auth posture.
- `docs/planning/registry-api-fallback-adapter.md` must be accepted for API-prefer/static-fallback precedence, divergence handling, source-state labels, and frontend guard behavior.
- Backend implementation remains blocked until both contracts are accepted.

## 1. Current Static Artifact Architecture

The current platform is a frontend-only React app backed by static public JSON artifacts. The active bridge artifacts are:

- `/data/qpm.json` for QPM macro scenarios.
- `/data/dfm.json` for DFM nowcast output and indicator metadata.
- `/data/io.json` for I-O sector analytics evidence and Scenario Lab I-O use.

Data Registry v2 loads these artifacts through frontend bridge clients and guards, then composes registry rows for source series, model inputs, bridge outputs, and planned artifacts. It keeps source vintage, artifact export timestamp, registry generation time, and frontend guard-check status separate.

What works:

- The internal-preview app can be served statically with low operational complexity.
- QPM, DFM, and I-O artifacts are easy to inspect, cache, diff, and review in Git.
- Frontend guards catch artifact-shape failures before UI consumption.
- Planned HFI, PE, CGE, FPP, and synthesis rows can be shown without pretending missing planned work is a failed artifact.
- The preview can disclose local-only saved runs and artifact-based provenance honestly.
- Data Registry v2 already gives a backend-ready vocabulary for status, source vintage, export timestamp, caveats, and validation scope.

Limits:

- There is no server-side saved-run persistence, sharing, evaluator ownership, or audit trail.
- The Data Registry is not an authority for source ownership, review state, validation history, or scheduler status.
- Validation checks happen in the frontend session and are not persisted as observable logs.
- Knowledge Hub content is static preview content, not a governed source workflow.
- HFI storage is blocked until source and artifact contracts are accepted.
- GitHub Actions or local export timestamps are visible only if carried in the artifact; there is no queryable run history.
- Browser local storage cannot support institutional retention, review, or shared comparisons.

Why it remains valid for internal preview:

- Current claims are limited to internal preview and static artifact inspection.
- QPM, DFM, and I-O bridge contracts are explicit enough for frontend consumption.
- Static artifacts prevent premature backend, auth, and data operations scope.
- The current architecture is still the safest way to review UI workflows, trust labels, and model-native saved-output boundaries before institutional persistence is accepted.

## 2. Target Backend/Database Role

The backend should become the system of record for governance, persistence, and audit metadata. It should not replace static bridge artifacts immediately.

Target responsibilities:

- Source registry: source systems, source series, owners, cadence, licensing notes, language status, expected vintages, and source caveats.
- Artifact registry: exported artifacts, artifact paths or object-store keys, checksums, model family, source vintage, export timestamp, schema version, validation state, and rollback pointers.
- Scenario persistence: server-side scenario inputs, run outputs, caveats, model version, source vintage, and comparison membership.
- User/session ownership: internal user identities, evaluator sessions, anonymous preview sessions if needed, and ownership of saved runs.
- Validation logs: guard results, contract validation results, artifact export validation, path-level issues, severity, and reviewer disposition.
- Model run metadata: run id, model family, solver version, data version, parameters, artifact inputs, code/script SHA when available, execution status, and caveats.
- High-frequency indicator storage: source inventory, series definitions, observations, vintages, source cadence, missing-data flags, and static/exported HFI snapshots after the HFI contract is accepted.
- Knowledge Hub source records: citations, content type, source date/vintage, related model, language status, caveats, reviewer, approval status, and content version.
- Audit/review logs: review events for artifacts, source records, Knowledge Hub items, saved runs, pilot observations, and release gates.

Non-role for the first backend:

- Do not run PE, CGE, FPP, or synthesis before their contracts are accepted.
- Do not claim live HFI refresh before source/artifact contract acceptance.
- Do not replace the static artifact path before the frontend has a compatible API adapter and fallback.
- Do not expose public write access.

## 3. Architecture Options

| Option | Fit | Strengths | Limits | Use now? |
|---|---|---|---|---|
| Keep static artifacts only | Internal preview | Lowest complexity, reviewable artifacts, no auth/database risk, current frontend unchanged | No server persistence, no audit trail, no source governance authority, no validation history | Keep as fallback, but insufficient for institution-ready work |
| Lightweight SQLite/Postgres backend | First backend foundation | Small API, simple local development, can start with Postgres-compatible schema, limited frontend changes | SQLite is weak for multi-user deployment; still needs auth, backup, and deployment decisions | Good as local dev mode only; production target should be Postgres |
| Supabase/Postgres | Rapid internal app backend | Managed Postgres, auth, row-level security, storage, quick dashboarding | External platform dependency, security review needed, migration discipline still required, service-key handling risk | Plausible if managed hosting is accepted, but decide after deployment/security constraints |
| Django/FastAPI backend | Custom application backend | Clear API boundary, strong validation, controlled auth integration, can keep model/artifact logic explicit | More operational ownership; Django may be heavy if admin UI is not needed | Recommended with FastAPI for the next backend phase |
| GitHub Actions + artifact registry hybrid | Data artifact operations | Preserves existing static export workflow, makes artifacts observable, supports checksums and validation logs | Not enough for user-owned saved runs or Knowledge Hub workflow by itself | Use as a companion pattern, not the whole backend |

## 4. Recommendation

Choose a lightweight FastAPI service backed by Postgres, while keeping static JSON artifacts as the public preview contract and fallback.

Recommended posture:

- Postgres is the durable system of record for registry metadata, saved runs, validation logs, source records, Knowledge Hub records, and review events.
- FastAPI exposes a small typed API for read-only registry access first, then authenticated saved-run and review workflows.
- Static JSON artifacts remain generated, versioned, and served at the existing `/data/*.json` paths during migration.
- GitHub Actions or local export jobs continue producing artifacts, but each export later records metadata, checksums, validation results, and review state in the backend.
- Local development may use SQLite only if the schema and query behavior remain Postgres-compatible; production/institution-ready deployment should use Postgres.

Why this is pragmatic:

- It avoids a frontend rewrite and preserves the working static-artifact preview.
- It creates the missing authority for auditability, ownership, validation history, and source governance.
- It can be staged from read-only registry metadata to authenticated writes.
- It avoids binding the project to a managed platform before deployment and security assumptions are accepted.
- It leaves Supabase open as a managed Postgres/auth deployment option later, without designing the app around it now.

## 5. Data Model Sketch

The first schema should be normalized enough to support governance, but not so elaborate that it becomes a data warehouse.

### `sources`

- `id`
- `name`
- `provider`
- `source_url`
- `country_or_scope`
- `owner_team`
- `license_notes`
- `language_status`
- `cadence`
- `active`
- `created_at`
- `updated_at`

Purpose: canonical source/provider records, including Statistics Agency, CERR model teams, DFM upstream artifacts, and future HFI providers.

### `source_series`

- `id`
- `source_id`
- `series_key`
- `label`
- `category`
- `frequency`
- `unit`
- `start_period`
- `latest_observation_date`
- `source_vintage`
- `expected_lag_days`
- `freshness_rule`
- `status`
- `notes`

Purpose: model inputs and HFI source inventory. For DFM, this maps naturally to indicator ids, categories, frequency, latest values, and observation dates after contract acceptance.

### `artifact_exports`

- `id`
- `artifact_key`
- `model_id`
- `artifact_path`
- `storage_key`
- `schema_version`
- `data_version`
- `source_vintage`
- `exported_at`
- `source_artifact`
- `source_artifact_exported_at`
- `source_script_sha`
- `solver_version`
- `checksum`
- `status`
- `published`
- `previous_artifact_export_id`

Purpose: durable registry for `/data/qpm.json`, `/data/dfm.json`, `/data/io.json`, and future HFI/PE/CGE/FPP artifacts.

### `model_inputs`

- `id`
- `model_id`
- `input_key`
- `source_series_id`
- `artifact_export_id`
- `required`
- `role`
- `unit`
- `vintage`
- `status`
- `notes`

Purpose: connect model families to source series and artifact exports without flattening QPM, DFM, I-O, PE, CGE, and FPP semantics.

### `model_runs`

- `id`
- `model_id`
- `run_id`
- `run_type`
- `solver_version`
- `data_version`
- `artifact_export_id`
- `started_at`
- `completed_at`
- `status`
- `code_sha`
- `parameters_json`
- `inputs_json`
- `outputs_summary_json`
- `caveats_json`

Purpose: run metadata for artifact-generating model jobs and future server-side analytical runs.

### `scenario_runs`

- `id`
- `model_id`
- `scenario_type`
- `request_json`
- `result_json`
- `artifact_export_id`
- `model_run_id`
- `data_vintage`
- `created_at`
- `created_by_user_id`
- `session_id`
- `status`
- `caveats_json`

Purpose: canonical server-side run records for `qpm_macro`, `io_sector_shock`, future `dfm_nowcast`, `pe_trade_shock`, `cge_reform_shock`, and `fpp_fiscal_path`.

### `saved_runs`

- `id`
- `scenario_run_id`
- `owner_user_id`
- `session_id`
- `title`
- `description`
- `visibility`
- `pinned`
- `comparison_group_id`
- `created_at`
- `updated_at`
- `archived_at`

Purpose: saved user/evaluator state. It should preserve model-native run boundaries so I-O sector outputs do not merge into QPM macro rows.

### `validation_checks`

- `id`
- `artifact_export_id`
- `model_run_id`
- `check_type`
- `validator_version`
- `status`
- `severity`
- `checked_at`
- `issues_json`
- `summary`

Purpose: persist guard checks, schema checks, contract checks, and later economic/model validation review outcomes without confusing them.

### `knowledge_items`

- `id`
- `item_type`
- `title`
- `summary`
- `body`
- `citation`
- `source_url`
- `source_date`
- `source_vintage`
- `related_model_id`
- `language`
- `language_status`
- `caveats_json`
- `status`
- `reviewer_user_id`
- `created_at`
- `updated_at`
- `published_at`

Purpose: governed Knowledge Hub content and source notes.

### `review_events`

- `id`
- `subject_type`
- `subject_id`
- `event_type`
- `status_from`
- `status_to`
- `reviewer_user_id`
- `comment`
- `created_at`

Purpose: audit trail for artifacts, sources, Knowledge Hub items, saved runs, pilot observations, and release decisions.

### `users` and `evaluators`

Start with a minimal `users` table only when authenticated writes are accepted:

- `id`
- `email`
- `display_name`
- `role`
- `organization`
- `active`
- `created_at`
- `last_seen_at`

Optional `evaluators` can extend `users` with pilot-specific metadata:

- `user_id`
- `pilot_round`
- `evaluator_type`
- `consent_status`
- `notes`

For internal preview before auth, `session_id` can be used for local-to-server transition testing, but it must not be treated as durable institutional identity.

## 6. API Surface Sketch

Use `/api/v1` to keep room for contract evolution.

### Read-only registry endpoints

- `GET /api/v1/registry/summary`
- `GET /api/v1/registry/sources`
- `GET /api/v1/registry/source-series`
- `GET /api/v1/registry/model-inputs`
- `GET /api/v1/registry/artifacts`
- `GET /api/v1/registry/artifacts/{artifact_key}`

Purpose: backend equivalent of Data Registry v2 records, initially read-only.

### Scenario save/load endpoints

- `POST /api/v1/scenario-runs`
- `GET /api/v1/scenario-runs/{id}`
- `GET /api/v1/saved-runs`
- `POST /api/v1/saved-runs`
- `PATCH /api/v1/saved-runs/{id}`
- `POST /api/v1/saved-runs/{id}/archive`
- `GET /api/v1/comparison-groups/{id}`

Purpose: server-side saved scenarios and comparisons after auth/session ownership is accepted.

### Artifact metadata endpoints

- `GET /api/v1/artifact-exports`
- `GET /api/v1/artifact-exports/{id}`
- `GET /api/v1/artifact-exports/{id}/validation-checks`
- `GET /api/v1/models/{model_id}/latest-artifact`

Later internal-only ingestion:

- `POST /api/v1/internal/artifact-exports`
- `POST /api/v1/internal/validation-checks`

Purpose: metadata and validation history. The artifact payload itself can remain served from `/data/*.json` or object storage.

### HFI endpoints

Do not implement until the HFI source/artifact contract is accepted.

Planned shape:

- `GET /api/v1/hfi/groups`
- `GET /api/v1/hfi/series`
- `GET /api/v1/hfi/series/{series_key}`
- `GET /api/v1/hfi/snapshots/latest`

Purpose: source inventory, observations, freshness state, and static/exported HFI snapshots.

### Knowledge Hub endpoints

- `GET /api/v1/knowledge-items`
- `GET /api/v1/knowledge-items/{id}`

Later authenticated review workflow:

- `POST /api/v1/knowledge-items`
- `PATCH /api/v1/knowledge-items/{id}`
- `POST /api/v1/knowledge-items/{id}/review-events`

Purpose: governed source-backed content, not broad unsourced policy prose.

## 7. Migration Path From Static JSON

The migration should be additive and reversible.

Stage 0: current state

- Frontend reads `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json`.
- Data Registry v2 composes records in the browser.
- Saved runs remain local-only.

Stage 1: backend registry mirror

- Add backend records that mirror current artifact metadata.
- Keep the public JSON artifact URLs unchanged.
- Add read-only API endpoints for registry metadata.
- Frontend continues using static artifacts as the source of payloads.
- Data Registry can optionally prefer API metadata and fall back to local composition.

Stage 2: validation and export history

- Export jobs or manual publish steps write `artifact_exports` and `validation_checks`.
- Registry shows backend validation history where available.
- Frontend still fetches artifact payloads from existing static URLs.

Stage 3: server-side saved runs

- Add authenticated or session-owned saved runs.
- Keep local saved runs visible with a local-only label.
- Add an explicit import/copy flow only if needed; do not silently migrate browser local storage.
- Comparison reads both server-backed and local-only runs through a shared adapter while preserving model-native blocks.

Stage 4: governed Knowledge Hub and HFI

- Move Knowledge Hub content to governed records after source/review metadata is accepted.
- Add HFI storage and endpoints only after the source/artifact contract is accepted.

Stage 5: optional artifact payload move

- Artifact payloads can move from checked-in public JSON to object storage or backend-served files only after cache, rollback, checksum, and deployment behavior are accepted.
- Existing `/data/*.json` routes should remain as compatibility aliases during transition.

## 8. Security and Access Assumptions

Initial assumptions:

- Internal-only first.
- No public write access.
- Read-only registry endpoints may be unauthenticated only if they expose no sensitive data.
- Any write endpoint must require authentication or a tightly scoped internal token.
- Internal ingestion endpoints should not be reachable from public clients.
- Secrets, service keys, source credentials, and upload credentials must never be shipped to the frontend.
- Saved runs belong to a user or explicit evaluator/session owner.
- Review events should be append-only from the application perspective.

Future auth/roles:

- `viewer`: read registry, artifacts, Knowledge Hub, and own/shared runs.
- `evaluator`: save runs, submit pilot observations, view assigned materials.
- `model_owner`: register artifacts and model-run metadata for owned model families.
- `content_reviewer`: approve Knowledge Hub records and language/source status.
- `admin`: manage users, roles, archival, and exceptional corrections.

Future requirements:

- Backup and restore plan for Postgres.
- Retention policy for saved runs, evaluator sessions, and review events.
- Audit logging for writes.
- Rate limits for write endpoints.
- Clear environment separation between local, internal preview, pilot, and production.

## 9. STOP Conditions Before Implementation

Stop before backend implementation if any of these remain undecided:

- Backend operations contract is not accepted.
- Registry API/static fallback adapter contract is not accepted.
- Deployment target and operational owner for the backend are not accepted.
- Postgres hosting choice is unresolved.
- Auth approach is unresolved for any write endpoint.
- The owner has not accepted whether server-side saved runs are required before pilot.
- Artifact registry semantics do not clearly separate source vintage, artifact export timestamp, validation check timestamp, model readiness, and economic/model validation.
- HFI source inventory and artifact contract are not accepted, but the implementation attempts HFI data storage or API work.
- Knowledge Hub source/citation/review schema is not accepted, but the implementation attempts content CRUD.
- Retention and audit expectations for saved runs and evaluator records are not accepted.
- Frontend migration would break current static `/data/*.json` consumption.
- Planned PE, CGE, FPP, or synthesis records would be treated as missing/failed rather than planned.

## 10. First Implementation Slice Recommendation

The first backend slice should be the artifact registry API.

Do first:

- Create the backend skeleton only after this architecture is accepted.
- Add Postgres-backed `artifact_exports`, `sources`, `source_series`, `model_inputs`, and `validation_checks` schema in the first implementation slice.
- Seed or ingest metadata for QPM, DFM, and I-O from the existing public artifacts.
- Expose read-only registry and artifact metadata endpoints.
- Keep frontend artifact payload reads on `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json`.
- Add frontend fallback behavior so the Data Registry still works if the API is unavailable.

Do not do first:

- Do not start HFI API/storage before the source/artifact contract is accepted.
- Do not start server-side saved runs before auth/session ownership is accepted.
- Do not move Knowledge Hub to CRUD before source/review schema acceptance.
- Do not add public artifact upload or source editing.

Why artifact registry first:

- It is the lowest-risk backend proof point because it is mostly read-only.
- It directly extends Data Registry v2, the accepted governance foundation.
- It creates durable metadata and validation history before user-owned writes.
- It does not require HFI data, new model contracts, or full auth.
- It gives later saved runs a stable way to reference artifact exports and source vintages.

Recommended staged order after acceptance:

1. Artifact registry API and validation log records.
2. Server-side saved runs with explicit auth/session ownership.
3. Knowledge Hub source records and review events.
4. HFI source/series API after HFI source/artifact contract acceptance.
5. Model-run metadata ingestion for future PE, CGE, FPP, and synthesis only after each model contract is accepted.
