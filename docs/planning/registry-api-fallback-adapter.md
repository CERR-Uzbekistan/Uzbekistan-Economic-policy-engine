# Registry API Fallback Adapter Contract

Date: 2026-04-27  
Status: planning contract; no frontend API wiring authorized  
Scope: Data Registry static composer behavior and future API-prefer/static-fallback adapter rules

## 1. Contract Status

This document defines the frontend/backend boundary for a future Data Registry API adapter. It does not authorize implementation.

No behavior changes until API mode is explicitly enabled by an accepted implementation slice. The current frontend remains static-artifact based.

## 2. Current Static Composer Behavior

The current Data Registry is composed entirely in the frontend from public static artifacts:

- `/data/qpm.json`.
- `/data/dfm.json`.
- `/data/io.json`.

The composer in `apps/policy-ui/src/data/data-registry/source.ts`:

- Loads QPM, DFM, and I-O through existing bridge clients.
- Applies frontend guard checks for artifact shape.
- Builds `RegistryArtifact` records for implemented bridge outputs.
- Builds `RegistryRow` records for source series, model inputs, bridge outputs, planned artifacts, vintages, and update statuses.
- Keeps planned HFI, PE, CGE, and FPP rows as `planned`, not `missing` or `failed`.
- Computes registry generation time in the browser.
- Computes DFM JSON freshness in the browser.
- Labels guard checks as frontend artifact-shape validation, not economic/model validation.
- Treats current QPM, DFM, and I-O static artifacts as the payload source used by the UI.

Current static record concepts include:

- `id`.
- `registryType`.
- `artifactPath`.
- `modelArea`.
- `status`.
- `statusDetail`.
- `owner`.
- `sourceSystem`.
- `dataVintage`.
- `exportTimestamp`.
- `sourceArtifact`.
- `sourceVintage`.
- `solverVersion`.
- `caveatCount`.
- `highestCaveatSeverity`.
- `validationScope`.
- `freshnessRule`.
- `caveatsSummary`.
- `sourceExportExplanation`.
- `facts`.
- `consumers`.
- `issues`.

## 3. Future Adapter Mode

Future adapter mode should be API-prefer with static fallback.

The adapter may ask the backend for registry metadata, but it must preserve static artifact compatibility:

- Static JSON artifacts remain available at the existing paths.
- Frontend bridge guards remain active.
- API metadata can enrich registry rows.
- API metadata does not automatically replace artifact payloads.
- If the API is unavailable, the current static composer behavior remains the user-visible fallback.

Recommended future API reads:

- `GET /api/v1/registry/summary`.
- `GET /api/v1/registry/sources`.
- `GET /api/v1/registry/source-series`.
- `GET /api/v1/registry/model-inputs`.
- `GET /api/v1/registry/artifacts`.
- `GET /api/v1/registry/artifacts/{artifact_key}`.
- `GET /api/v1/artifact-exports`.
- `GET /api/v1/artifact-exports/{id}/validation-checks`.

API mode must be opt-in through an explicit configuration flag or accepted deployment switch. It must not be silently inferred from the presence of an API URL.

## 4. Source-State Labels

The frontend should use exactly these source-state labels for the API/static transition:

| Label | Meaning |
|---|---|
| Static artifact | The row is derived from frontend static JSON composition only. |
| API metadata | API metadata is available and selected for registry metadata display. Static artifact payloads may still supply model data. |
| API unavailable / static fallback | API mode was enabled, but the API failed, timed out, or returned unusable metadata; the frontend is showing static-composed records. |
| API/static divergence | API metadata and static artifact metadata both loaded but disagree on a contract-significant field. |

These labels describe metadata source state. They must not imply economic validation, model validation, live refresh, or scheduler status.

## 5. Exact Precedence Rules

### Rule 1: Static wins unless API mode is explicitly enabled

When API mode is disabled:

- Static JSON wins.
- The frontend uses the existing static composer.
- No API call is required.
- Source-state label: `Static artifact`.

### Rule 2: API wins for metadata only when API mode is enabled and the API response is valid

When API mode is enabled and the API response passes adapter validation:

- API metadata wins for registry metadata fields that the backend owns.
- Static artifact payloads continue to supply model payload data unless a separate payload migration is accepted.
- Frontend bridge guard results still run against static payloads.
- Source-state label: `API metadata`.

Backend-owned metadata fields may include:

- Source owner.
- Source system.
- Source series/provider metadata.
- Artifact export id.
- Artifact checksum.
- Published/review status.
- Validation check history.
- Retention/review metadata.
- Backend recorded `artifact_exports.exported_at`.
- Backend recorded `source_vintage`.

### Rule 3: Static wins when the API is unavailable or invalid

When API mode is enabled but the API is unreachable, times out, returns non-2xx, or fails adapter validation:

- Static JSON wins.
- The frontend displays the static-composed registry.
- The UI should expose the metadata source-state label, not a hard app failure.
- Source-state label: `API unavailable / static fallback`.

The failure may be listed as a registry warning, but it must not mark implemented static artifacts as failed if those artifacts loaded and passed frontend guards.

### Rule 4: Divergence is visible and non-silent

When API metadata and static artifact metadata both load but disagree on contract-significant fields:

- The adapter must not silently merge the disagreement away.
- The UI state label is `API/static divergence`.
- The registry row should surface the differing fields as warnings or details.
- The static artifact remains the payload source unless an accepted backend payload contract says otherwise.
- API metadata remains visible as backend metadata, but the row must not present a single false source of truth.

Contract-significant divergence fields:

- `artifact_key` or model id mismatch.
- Artifact path mismatch.
- Schema version mismatch after schema versions exist.
- Artifact export timestamp mismatch.
- Source vintage/data vintage mismatch.
- Solver version mismatch.
- Checksum mismatch after checksums exist.
- Validation status mismatch where the API claims valid but frontend guard fails.
- Published/latest pointer selecting a different artifact than the static path.

### Rule 5: Frontend guard failure cannot be overridden by API metadata

If static payload loading succeeds but frontend bridge guards fail:

- The artifact remains `failed` for frontend consumption.
- API metadata cannot relabel it as frontend-valid.
- Source-state label may be `API/static divergence` if API metadata says the artifact is valid.
- The UI copy must continue to say frontend artifact-shape validation failed.

### Rule 6: Planned lanes remain planned

HFI, PE, CGE, FPP, and Synthesis remain planned unless their contracts are accepted and implemented.

API metadata must not convert planned rows into missing/failed rows merely because backend records do not exist.

## 6. API And Static Disagreement Behavior

Disagreement is not a fatal application state. It is a governance state.

When disagreement is detected:

- Keep the page usable.
- Show `API/static divergence`.
- Preserve the static payload for any model workflow that depends on `/data/*.json`.
- Display both relevant values where practical.
- Add a registry warning naming the divergent fields.
- Do not claim live governance authority until the owner accepts the backend as authoritative for that field.

Recommended display wording:

- Source state: `API/static divergence`.
- Detail: `API metadata and the public static artifact disagree on registry metadata. Static payload remains active for this preview until the backend cutover is accepted.`

## 7. Mapping From Current Static Records To Future API Records

### Registry artifact mapping

| Current static field | Future API/backend field | Notes |
|---|---|---|
| `id` | `artifact_key` or `model_id` | Current values: `qpm`, `dfm`, `io`. |
| `registryType` | `record_type` | Static `bridge_output` maps to API artifact/export metadata. |
| `artifactPath` | `artifact_path` | Existing `/data/*.json` path remains compatibility path. |
| `modelArea` | `model_family.label` or API display label | Display field, not an authority by itself. |
| `status` | Adapter-computed status from API status plus frontend guard status | Do not flatten backend status and frontend guard status. |
| `statusDetail` | `status_detail` plus adapter detail | Must keep guard-validation wording separate. |
| `owner` | `owner_team` | Backend-owned after accepted source governance. |
| `sourceSystem` | `source_system` or `source.provider` | Backend-owned after accepted source governance. |
| `dataVintage` | `data_version` or `source_vintage` | Must remain distinct from artifact export timestamp. |
| `exportTimestamp` | `artifact_exports.exported_at` | Static value comes from JSON metadata. |
| `sourceArtifact` | `source_artifact` | For DFM and I-O currently carried in metadata. |
| `sourceVintage` | `source_vintage` or `source_artifact_exported_at` | DFM has upstream source artifact timestamp; I-O has base-year vintage. |
| `solverVersion` | `solver_version` | Backend mirrors artifact metadata. |
| `caveatCount` | Derived from artifact caveats or backend caveat summary | Payload caveats remain static unless backend caveat contract is accepted. |
| `highestCaveatSeverity` | Derived severity | Adapter may compute from static caveats and backend validation findings separately. |
| `validationScope` | `validation_scope` | Must say whether it is frontend guard, contract validation, or economic/model review. |
| `freshnessRule` | `freshness_rule` | DFM remains frontend-owned until explicit switch. |
| `caveatsSummary` | `caveats_summary` | Static caveats remain visible. |
| `sourceExportExplanation` | `source_export_explanation` | Useful bridge copy; can be API-supplied later. |
| `facts` | `facts_json` or computed display facts | Non-authoritative display facts unless fields are normalized. |
| `consumers` | frontend route mapping | Frontend-owned. |
| `issues` | frontend guard issues plus backend validation issues | Keep issue source/type visible. |

### Registry row mapping

| Current static row field | Future API/backend field | Notes |
|---|---|---|
| `id` | `model_id`, `source_series_id`, or `artifact_key` | Depends on `registryType`. |
| `registryType` | `record_type` | Values map to source series, model input, artifact/export, or planned artifact. |
| `label` | `label` | Display field. |
| `domain` | `domain` or `model_family` | Display/grouping field. |
| `status` | Adapter-computed row status | Must distinguish planned, static load failure, backend validation, and freshness. |
| `dataVintage` | `source_vintage` or `data_version` | Backend-owned after acceptance. |
| `exportTimestamp` | `artifact_exports.exported_at` | Static artifact value remains fallback. |
| `source` | `source_url`, `source_artifact`, or artifact path | Meaning depends on row kind. |
| `owner` | `owner_team` | Backend-owned after acceptance. |
| `sourceSystem` | `source.provider` or `source_system` | Backend-owned after acceptance. |
| `notes` | `notes` | API may provide governance notes; frontend may add adapter notes. |
| `validationScope` | `validation_scope` | Must identify check type. |
| `freshnessRule` | `freshness_rule` | DFM switch requires explicit owner acceptance. |
| `caveats` | `caveats_summary` | Static caveats remain fallback. |
| `sourceExportExplanation` | `source_export_explanation` | Can be API-supplied later. |
| `modelExplorerHref` | frontend route mapping | Frontend-owned. |

## 8. DFM Freshness Rule Ownership

Current owner: frontend static composer.

Current rule:

- DFM JSON export older than 48 hours is a warning.
- DFM JSON export older than 7 days is escalated.
- The rule uses `metadata.exported_at`.
- Upstream DFM refit/source artifact timestamp is separate.

Backend later may own DFM freshness only after an explicit switch is accepted.

Before that switch:

- API metadata may display backend-recorded export history.
- API metadata may display validation checks.
- The frontend still computes the visible DFM freshness state for the current static artifact.
- Backend freshness should not override frontend freshness labels.

The switch must define:

- Which timestamp is authoritative.
- Whether freshness is based on JSON export, upstream DFM refit, source observation date, scheduler success, or a combination.
- Who owns stale-state thresholds.
- How divergent frontend/API freshness is displayed during cutover.

## 9. Frontend Bridge Guards Remain Active

Frontend bridge guards remain active even after API metadata arrives.

Reasons:

- The UI still consumes static artifact payloads.
- API metadata can be stale, incomplete, or pointed at a different export.
- Guard checks catch payload-shape regressions before UI consumption.
- Guard checks are the current protection against malformed QPM, DFM, and I-O JSON.

Guard results must remain distinct from:

- Backend schema validation.
- Backend ingestion validation.
- Economic/model validation.
- Human review.
- Scheduler status.

## 10. No Behavior Change Until API Mode Is Enabled

Until API mode is explicitly enabled:

- No API calls are required.
- No new error state appears because an API is absent.
- Static artifact composition remains the exact behavior.
- Source-state label is `Static artifact`.
- QPM, DFM, and I-O workflows continue to depend on current static artifacts.
- Planned HFI, PE, CGE, and FPP rows remain planned.

API mode must be introduced in a bounded slice with tests and owner review.

## 11. STOP Conditions Before Frontend API Wiring

Stop before frontend API wiring if any item remains unresolved:

- This fallback adapter contract is not accepted.
- Backend operations contract is not accepted.
- API mode flag or deployment switch is not defined.
- API response schemas for registry metadata are not documented.
- Adapter validation rules are not documented.
- Divergence fields and UI label behavior are not accepted.
- It is unclear which fields the API owns and which fields remain frontend/static-owned.
- DFM freshness ownership switch is not explicitly accepted.
- Frontend bridge guards would be removed or bypassed.
- Static `/data/qpm.json`, `/data/dfm.json`, or `/data/io.json` consumption would break.
- API failure would make the internal-preview Data Registry unusable.
- Planned HFI, PE, CGE, FPP, or Synthesis rows would be treated as missing implemented artifacts.
- The wiring requires backend saved-run persistence, Knowledge Hub CRUD, HFI storage, PE, CGE, FPP, or synthesis work.

## 12. Acceptance Checklist

Owner acceptance should record:

- Current static composer behavior accepted as the fallback baseline.
- API-prefer/static-fallback approach accepted.
- Exact precedence rules accepted.
- Divergence state and label accepted.
- Static-to-API field mapping accepted.
- Source-state labels accepted exactly as written.
- DFM freshness remains frontend-owned until explicit switch.
- Frontend bridge guards remain active after API metadata arrives.
- No behavior change until API mode is explicitly enabled.
- STOP conditions accepted before frontend API wiring.

