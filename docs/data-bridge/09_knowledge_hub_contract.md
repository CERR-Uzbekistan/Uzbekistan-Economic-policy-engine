# Knowledge Hub Source / Citation Contract

Date: 2026-04-27  
Status: planning contract only; docs-only; no edits to `apps/policy-ui/**`; no edits to `apps/policy-ui/src/contracts/data-contract.ts`; no edits to `apps/policy-ui/src/data/mock/knowledge-hub.ts`; no backend code; no data files; no mock data changes; no source CRUD or schema edits authorized  
Scope: governance contract for the current static Knowledge Hub and future source/citation lineage

Review resolution: Claude Code required reconciliation with current schema, binding to AI governance, item-level lineage, reform-status authority, `model_refs` whitelist, `domain_tag` control, per-item citation scope, takedown/correction protocol, copyright/translation/reviewer governance, and read-only-first API.

Patch review resolution: Claude Code required AI-mode canonicalization, `reviewed_by` wording reconciliation, `literature_items` reconciliation, an explicit no-edit clause, transitional `model_refs` rules, operational cross-citation checking, and default states for existing pilot items.

## 1. Purpose

Knowledge Hub is the curated policy/research context layer for the Uzbekistan Economic Policy Engine. It helps users understand reforms, research briefs, model-adjacent policy context, and the source/review status behind that context.

Knowledge Hub is not:

- a legal registry;
- a live news feed;
- an AI answer engine;
- a model-output authority;
- a substitute for source institutions, model owners, or reviewed analytical outputs.

The current seeded content remains static pilot content and is the fallback/current surface. It may support internal-preview workflow and trust review, but it must not be described as legally current, live-updated, externally citeable by default, or reviewed model authority.

## 2. Existing Schema Reconciliation

This contract reconciles with the existing app schema in `apps/policy-ui/src/contracts/data-contract.ts`. It does not create a parallel production schema and does not authorize editing `data-contract.ts`.

The authoritative current surface is the mock-only loader at `apps/policy-ui/src/data/knowledge-hub/source.ts`, which always resolves `KnowledgeHubDataMode` to `mock` and returns `knowledgeHubContentMock` from `apps/policy-ui/src/data/mock/knowledge-hub.ts`.

Governance state vocabulary:

- `accepted`: field may remain in the current pilot contract with the caveats below.
- `under review`: field exists and can render, but needs stronger governance before external/API/backend use.
- `to deprecate`: field should be replaced or demoted before backend/API implementation.
- `TO CONFIRM`: field cannot be treated as governed until owner acceptance.

### ReformTrackerItem

| Field | Current type | Governance state | Contract treatment |
|---|---|---|---|
| `id` | `string` | accepted | Stable UI/content identifier for static pilot records; future backend ids must preserve or map it. |
| `date_label` | `string` | under review | Display label only; not a legal effective date. Must not replace structured publication/effective/as-of dates. |
| `date_iso` | `string?` | under review | Optional structured date; future reform-status claims require explicit `as_of_date` separate from display labels. |
| `status` | `completed` / `in_progress` / `planned` | under review | Existing enum can render current pilot status, but authority/evidence/as-of semantics are not accepted yet. |
| `title` | `string` | accepted | Display title for static pilot content, subject to source citation and correction rules. |
| `mechanism` | `string` | under review | Analytical summary/prose; requires source lineage, reviewer scope, and static/legal-currentness caveat before external use. |
| `domain_tag` | `string` | TO CONFIRM | Free string is not accepted for backend/API implementation; controlled vocabulary must be frozen. |
| `model_refs` | `string[]` | under review | Current string aliases are under-governed; must map to a whitelist with version pins and accepted artifact/contract state. |

### ResearchBriefByline

| Field | Current type | Governance state | Contract treatment |
|---|---|---|---|
| `author` | `string?` | under review | Display byline only until named attribution approval and AI-draft status are recorded. |
| `date_label` | `string` | under review | Display date only; future source records require publication date, retrieval date, and review date where applicable. |
| `read_time_minutes` | `number?` | accepted | UI convenience field; no source authority implied. |
| `ai_drafted` | `boolean?` | accepted | Useful provenance signal, but it must bind to `docs/ai-governance.md` mode rules before external use. |
| `reviewed_by` | `string?` | under review | Insufficient alone; no reviewed claim without reviewer metadata, sign-off date, and explicit review scope. |

### ResearchBrief

| Field | Current type | Governance state | Contract treatment |
|---|---|---|---|
| `id` | `string` | accepted | Stable UI/content identifier for static pilot records. |
| `byline` | `ResearchBriefByline` | under review | Existing display byline must be expanded by governance metadata before citation/export. |
| `title` | `string` | accepted | Display title for static pilot content, subject to attribution/correction rules. |
| `summary` | `string` | under review | Analytical prose; requires source/citation lineage and reviewer scope before external use. |
| `domain_tag` | `string?` | TO CONFIRM | Free string is not accepted for backend/API implementation. |
| `model_refs` | `string[]` | under review | Must map to whitelisted accepted model/artifact ids with version pins. |

### KnowledgeHubMeta

| Field | Current type | Governance state | Contract treatment |
|---|---|---|---|
| `reforms_tracked` | `number` | under review | Static pilot display count; future value must be derived from accepted source records or clearly labelled curated count. |
| `research_briefs` | `number` | under review | Static pilot display count; must not imply complete corpus coverage. |
| `literature_items` | `number` | under review | Static pilot display count only. The schema has no literature item record type, so no standalone literature records exist today. |

### KnowledgeHubContent

| Field | Current type | Governance state | Contract treatment |
|---|---|---|---|
| `reforms` | `ReformTrackerItem[]` | accepted | Current static pilot reform list, not legal registry or live tracker. |
| `briefs` | `ResearchBrief[]` | accepted | Current static pilot brief list, not publication catalogue or reviewed research repository. |
| `meta` | `KnowledgeHubMeta` | under review | Current static pilot display metadata; backend/API use requires derivation rules. |

### Literature Items Reconciliation

`KnowledgeHubMeta.literature_items` is a count only. Literature item records are out of scope until a literature record type is added to `apps/policy-ui/src/contracts/data-contract.ts` under a separate accepted slice.

Citations embedded in `ResearchBrief.summary` may carry lineage in future source records, but no standalone literature record exists today.

### Default State For Existing Pilot Items

At contract acceptance, existing static pilot items default to:

- `citation_permission = internal_only`;
- `license_class = unknown`;
- `ru_uz_review_state = not_translated`, or observed shell-only where applicable;
- absent `as_of_date` means a reform-status caveat is mandatory;
- `reviewed_by` present without scope is not enough for external citation.

### Field Additions Out Of Scope

`as_of_date`, `citation_permission`, `license_class`, `ru_uz_review_state`, and `reviewer_metadata` are future schema work pending a separate accepted slice. This contract defines governance semantics only; it does not authorize adding fields to app contracts, mock data, backend tables, or data files.

## 3. Binding To AI Governance

This contract is bound to `docs/ai-governance.md`, adopted 2026-04-24. Canonical AI governance modes are governed by `NarrativeBlock.generation_mode` in `apps/policy-ui/src/contracts/data-contract.ts`; the accepted values are `template`, `assisted`, and `reviewed`.

This contract does not redefine the `template`, `assisted`, or `reviewed` modes governed there.

Any field, label, byline, disclaimer, citation workflow, export behavior, or review wording that conflicts with `docs/ai-governance.md` must be resolved before new Knowledge Hub fields land.

Rules:

- No reviewed claim without reviewer metadata.
- Reviewer scope must be explicit.
- `reviewed_by` alone is not sufficient for a `reviewed` claim.
- AI-drafted content cannot be cited/exported/shared externally unless the applicable reviewed/accepted state and disclaimer are present.
- Knowledge Hub `ai_drafted: true` without an accepted reviewed state inherits the assisted disclaimer from `docs/ai-governance.md`: "Do not cite, export, or share externally."
- Reviewed-state disclaimer text must match `docs/ai-governance.md` Section 6 verbatim, modulo localization: "AI-assisted narrative, reviewed by {reviewer_name} on {review_date}. Cleared for internal use and citation."
- `reviewed_by` rendering inherits named-reviewer accountability and must resolve to "reviewed by {reviewer_name} on {review_date}" before it can support a reviewed-state claim.
- A named reviewer must have actually signed off; team labels require an accepted owner-of-record rule.
- The review scope must say whether review covered prose, factual claims, numbers, citations, model references, and translations.

## 4. Source/Citation Lineage Table

Every item class must carry item-level lineage before external citation or backend/API source records are accepted.

| Item class | Source title | Source URL/ref/file | Issuing institution | Publication date | Retrieval date | Snapshot/version pin | License/redistribution class | Citation permission state | Source owner | RU/UZ translation review state | `as_of_date` for reform-status claims |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Reform tracker item | Required | Required | Required | Required where applicable | Required | Required | Required | Required | Required | Required per item | Required |
| Research brief | Required | Required for every cited source; internal file ref allowed if not public | Required | Required | Required | Required | Required | Required | Required | Required per item | Required if reform/status claim appears |
| Embedded literature citation in a research brief | Required for the cited source | Required | Required | Required | Required | Required | Required | Required | Required | Required for any translated citation/prose | Not applicable unless it makes a reform-status claim |
| Model assumption note | Required | Required artifact/model/source ref | Required owner/model institution | Required | Required | Required model/artifact version | Required | Required | Required model owner | Required per item | Required if linked to reform status |
| Methodology explainer | Required | Required | Required | Required | Required | Required | Required | Required | Required | Required per item | Required if it states current status |
| Source note / provenance note | Required | Required | Required | Required where applicable | Required | Required | Required | Required | Required | Required per item | Required if it states current status |

Minimum license/redistribution classes:

- `public_open`: public source with redistribution allowed under stated terms.
- `public_attribution_required`: public source where attribution text is required.
- `public_link_only`: public source may be linked/cited but not redistributed beyond short excerpts.
- `internal`: internal source; external display prohibited unless separately approved.
- `licensed`: licensed source; display/citation governed by license terms.
- `restricted`: sensitive or restricted source; no external citation without explicit approval.
- `unknown`: temporary planning state only; blocks external citation.

Citation permission states:

- `internal_only`;
- `external_allowed`;
- `prohibited`;
- `pending`.

Default when absent: `internal_only`.

## 5. Reform-Status Authority

The current `completed`, `in_progress`, and `planned` statuses are UI states, not legal conclusions. Each status requires explicit authority, evidence, and `as_of_date` before external use.

| Status | Who declares status | Evidence required | Currentness caveat | Repeal/supersession/correction handling |
|---|---|---|---|---|
| `completed` | Source owner or accepted reform-status owner; not the UI by itself | Official decree, implementation notice, institutional publication, or accepted internal owner record showing completion | Must show item-level `as_of_date`; static pilot caveat required | Add correction record, supersession pointer, and visible item-level caveat until resolved |
| `in_progress` | Source owner or accepted reform-status owner | Official implementation timeline, active program notice, ministry/agency update, or accepted owner record | Must show item-level `as_of_date` and stale/currentness warning when beyond accepted review interval | Update status with new `as_of_date`; preserve audit trail of previous status |
| `planned` | Source owner, accepted roadmap owner, or official planning document | Official plan, draft schedule, adopted roadmap, budget/program statement, or accepted owner record | Must state planned/not enacted where applicable; item-level caveat required | If cancelled, delayed, superseded, or enacted, create correction/supersession event |

Required fields before backend/API implementation:

- who declared status;
- evidence type and source ref;
- `as_of_date`;
- review interval or stale rule;
- item-level frozen-pilot/static caveat;
- supersession/repeal/correction pointer.

A page-level static banner is not enough. Every externally visible reform item must carry an item-level static/legal-currentness caveat.

## 6. `model_refs` Whitelist

Current `model_refs: string[]` is under-governed. Free string model references are not accepted for backend/API implementation.

Whitelist policy:

- `model_refs` may point only to accepted model ids, accepted model domains, or accepted artifact states with contracts.
- Every ref requires a version pin: model id, artifact id, contract version, or accepted snapshot.
- Display aliases such as `QPM`, `DFM`, `I-O`, `PE`, `CGE`, `FPP`, or `HFI` must map to canonical ids before API work.
- No model-output citation unless the model output is reviewed/accepted for that use.
- No Knowledge Hub item may cite a model output as evidence if the output depends on that Knowledge Hub item as a source.
- Current static-pilot `model_refs` strings pointing to gated lanes are grandfathered as static-pilot context only.
- Any external citation, export, or backend record carrying `HFI`, `FPP`, or `PE` refs is blocked until the corresponding contract reaches accepted state: `docs/data-bridge/06_hfi_contract.md`, `docs/data-bridge/07_fpp_contract.md`, or `docs/data-bridge/08_pe_contract.md`.

Initial whitelist posture:

| Display ref | Canonical candidate | Current contract posture | Knowledge Hub citation rule |
|---|---|---|---|
| `QPM` | `qpm-uzbekistan` | Existing app/data bridge surface; still requires version pin for citation | May be linked only with accepted artifact/run/version and reviewer scope. |
| `DFM` | `dfm-nowcast` | Existing app/data bridge surface; freshness warnings remain | May be linked only with accepted artifact/version and freshness caveat. |
| `I-O` | `io-model` | Existing I-O bridge/evidence surface | May be linked only with accepted artifact/version and I-O caveats. |
| `HFI` | `hfi` | Gated planning contract only | Must not be cited as accepted. |
| `PE` | `pe-model` | Gated planning contract only | Must not be cited as accepted while gated. |
| `CGE` | `cge-model` | Planned/gap; no accepted bridge in current set | Must not be cited as accepted. |
| `FPP` | `fpp-fiscal` | Gated planning contract only | Must not be cited as accepted while gated. |
| `Synthesis` | `synthesis` | Not implemented; future contract required | Must not be cited as accepted. |

HFI, FPP, and PE must not be cited as accepted while gated. Current static pilot references to HFI/PE/FPP/CGE can remain only as static pilot context with a visible caveat that the related model lane is planned/gated, not accepted model evidence.

## 7. `domain_tag` Vocabulary

Current `domain_tag` values are free strings. Values visible in the current Knowledge Hub mock include:

- `Trade`;
- `Monetary`;
- `Fiscal`;
- `Fiscal / structural`.

These values are derivable from the current app only as display labels, not as a controlled backend vocabulary.

Backend/API implementation STOP condition: `domain_tag` vocabulary must either be frozen as an accepted enum or explicitly accepted as `TO CONFIRM` with no backend/API use. Free-string domain tags are not accepted for backend/API implementation.

Candidate controlled vocabulary to confirm:

- `trade`;
- `monetary`;
- `fiscal`;
- `structural`;
- `external`;
- `energy`;
- `prices`;
- `financial`;
- `cross_cutting`.

`Fiscal / structural` must be split or mapped before backend/API implementation.

## 8. Citation Scope Per Item

Every record must carry a citation scope before external display/export/citation:

- `internal_only`;
- `external_allowed`;
- `prohibited`;
- `pending`.

Default when absent: `internal_only`.

`external_allowed` requires:

- complete lineage table fields;
- accepted license/redistribution class;
- attribution text;
- reviewer-of-record sign-off where prose/claims are analytical;
- RU/UZ review state if non-English content is externally visible;
- item-level static/legal-currentness caveat for reform-status claims.

## 9. Takedown / Correction / Retraction Protocol

Each Knowledge Hub item requires an owner-of-record before external citation or backend/API publication.

Protocol:

- Owner-of-record: named person or accepted owner team accountable for correction decisions.
- Time bound: P0 legal/safety/copyright/sensitive-data issue triaged within 1 business day; P1 factual or attribution issue within 3 business days; lower-severity corrections within 10 business days.
- Audit log expectation: record reporter, timestamp, affected item id, source version, old value, new value, reviewer/owner decision, and public/interim UI state.
- UI interim state: `pending_correction`, `citation_suspended`, `retracted`, or `superseded` where applicable.
- Link rot: preserve original URL, retrieval date, archived/snapshot ref where permitted, and replacement link if available.
- Source-version drift: if a source changes after retrieval, keep the previous snapshot/version pin and add a drift note; do not silently overwrite evidence.

Corrections should create new events or item versions, not erase prior lineage.

## 10. Copyright And Redistribution

For every cited source, the source record must declare:

- copyright/redistribution class;
- allowed excerpt/quote policy;
- translation rights;
- attribution text;
- external citation permission.

Rules:

- Unknown copyright or redistribution state blocks external citation.
- Licensed or restricted material cannot be copied into public/static artifacts unless the license explicitly allows it.
- Quotations must be minimal and policy-compliant; paraphrase and link where possible.
- Translations require rights to translate or an accepted internal-use-only classification.
- Attribution text must be stored per source, not improvised in UI copy.

## 11. Translation Parity

RU/UZ review state is independent per item and per language.

Allowed review states:

- `not_translated`;
- `ai_drafted_unreviewed`;
- `human_translated_unreviewed`;
- `reviewed`;
- `blocked`;
- `not_applicable`.

Rules:

- AI-drafted translations of reviewed EN content are not reviewed unless a translator/reviewer-of-record is named.
- Partial translation blocks external use for that language.
- RU/UZ terminology review is required before broader pilot.
- Review must cover terminology that affects model meaning, reform status, source attribution, legal-currentness caveats, and citation permission.

## 12. Reviewer / Byline Governance

`reviewed_by` requires reviewer sign-off and cannot be treated as a decorative byline.

Reviewer metadata must include:

- reviewer name or accepted reviewer team;
- reviewer role/scope;
- review date;
- content version reviewed;
- whether review covered prose;
- whether review covered factual claims;
- whether review covered numbers;
- whether review covered citations/source lineage;
- whether review covered model references;
- whether review covered translations.

Any reviewed-state user-facing wording must match `docs/ai-governance.md` Section 6 verbatim, modulo localization. `reviewed_by` display is not enough unless the item also has the accountable form "reviewed by {reviewer_name} on {review_date}" and the review scope metadata above.

Named authors on AI-drafted material require attribution approval. A named author must not appear as sole author if the prose was AI-drafted unless the attribution policy permits that representation and the author approves it.

## 13. Relationship To Models

Reforms can link to affected models/domains, but a link is not evidence by itself.

Rules:

- Knowledge Hub can cite model outputs only if those outputs are reviewed/accepted for the cited use.
- No automatic policy recommendation may be generated from model outputs.
- Knowledge Hub must preserve model authority boundaries; PE is not a macro forecast, FPP is not a QPM forecast, HFI is not a DFM refit, and I-O is not a price/behavioral model.
- Avoid a cross-citation loop: Knowledge Hub must not cite a model output that depends on Knowledge Hub as a source.
- Before any backend/API record cites a model output, the Knowledge Hub source record's `model_refs` must be checked against the model output's source manifest.
- Any overlap between the Knowledge Hub source record and the model output's source manifest blocks external citation until a reviewer-of-record confirms there is no circular evidentiary dependency.
- A reform item may say a model/domain is affected only when the model owner or accepted content owner approves the mapping.

## 14. Data Registry Relationship

Knowledge Hub source records are not model artifacts.

Future backend source records may appear as provenance metadata in registry-like surfaces, but the Registry/data bridge attests provenance only. It does not attest correctness, legal force, policy validity, or model validation.

Data Registry and source records must keep these concepts separate:

- source provenance;
- citation permission;
- content review;
- model artifact validation;
- model economic validation;
- legal/currentness status.

## 15. Future Read-Only API Shape

Future API work must be read-only first.

API principles:

- read-only first;
- snapshot-pinned;
- no CRUD in the first API slice;
- no live ingest;
- static pilot content remains fallback;
- backend operations and fallback contracts must be accepted before API work.

Illustrative future read endpoints only:

- `GET /api/v1/knowledge-hub/snapshot`;
- `GET /api/v1/knowledge-hub/reforms`;
- `GET /api/v1/knowledge-hub/reforms/{id}`;
- `GET /api/v1/knowledge-hub/briefs`;
- `GET /api/v1/knowledge-hub/briefs/{id}`;
- `GET /api/v1/knowledge-hub/sources/{source_id}`;

No frontend API wiring is authorized by this document. API mode must remain additive and preserve the static mock/current fallback until a separate accepted implementation slice changes it.

## 16. Static Pilot Content Rules

Current seeded content is static pilot content.

Rules:

- no live-feed claim;
- no legal-currentness claim;
- no automatic external citation;
- no model-output authority claim;
- no claim that reform status is current beyond its item-level `as_of_date`;
- no claim that RU/UZ terminology has completed human review unless review records exist.

Externally visible content requires an item-level static/legal-currentness caveat, not only a page-level banner.

Required caveat meaning:

> Static pilot content. Source and legal-currentness review is item-specific. Do not treat this item as a live legal registry or current official notice.

Exact wording can be localized later, but the meaning must remain intact.

## 17. STOP Conditions

Stop before app code, backend work, API wiring, CRUD, live ingest, content expansion, external citation, or new schema fields if any item remains unresolved:

- existing schema field-by-field governance accepted;
- alignment with `docs/ai-governance.md` accepted;
- canonical `template` / `assisted` / `reviewed` mode binding accepted;
- reviewed-state disclaimer and `reviewed_by` named-reviewer wording reconciled with `docs/ai-governance.md`;
- `KnowledgeHubMeta.literature_items` accepted as count-only with no standalone literature records until a future schema slice;
- existing pilot default states accepted: `citation_permission = internal_only`, `license_class = unknown`, `ru_uz_review_state = not_translated` or observed shell-only, absent `as_of_date` requires caveat, and `reviewed_by` without scope blocks external citation;
- reform-status authority and `as_of_date` semantics accepted;
- `model_refs` whitelist accepted;
- transitional gated-lane `model_refs` rules accepted for HFI/FPP/PE;
- model-output source-manifest overlap check accepted before backend/API citation;
- `domain_tag` vocabulary frozen or `TO CONFIRM` accepted with no backend/API free-string use;
- license/redistribution class declared per source class;
- per-item citation-scope default accepted;
- takedown/correction protocol accepted;
- RU/UZ per-item review model accepted;
- reviewer-of-record sign-off process accepted;
- item-level static-pilot/legal-currentness caveat accepted;
- read-only API shape and static fallback accepted before backend work.

## 18. Risks

Ranked risks:

1. reform-status drift;
2. copyright/redistribution exposure;
3. `model_refs` pointing at gated models;
4. AI-drafted/reviewed ambiguity;
5. translation drift;
6. attribution/byline risk;
7. link rot/source-version drift;
8. reviewer impersonation;
9. PII/political sensitivity;
10. cross-citation loop.

## 19. Implementation Sequence

Required sequence:

1. Contract acceptance.
2. Static pilot content audit.
3. Source/citation schema acceptance.
4. Read-only source registry.
5. Only later CRUD/review workflow.

No push, app-code edit, backend code, `data-contract.ts` edit, or mock-data addition is authorized by this contract.
