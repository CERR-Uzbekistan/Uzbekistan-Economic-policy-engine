# Knowledge Hub Static Content Audit

Date: 2026-04-27  
Status: docs-only static pilot audit; no app code, mock data, contract, backend, CRUD, live-feed, or data-file changes  
Inputs reviewed:

- `docs/data-bridge/09_knowledge_hub_contract.md`
- `docs/ai-governance.md`
- `apps/policy-ui/src/contracts/data-contract.ts`
- `apps/policy-ui/src/data/knowledge-hub/source.ts`
- `apps/policy-ui/src/data/mock/knowledge-hub.ts`
- `apps/policy-ui/src/components/knowledge-hub/KnowledgeHubContentView.tsx`
- `apps/policy-ui/src/components/knowledge-hub/ReformTimeline.tsx`
- `apps/policy-ui/src/components/knowledge-hub/BriefCard.tsx`
- Supporting render-path files inspected for caveat surface only: `TimelineItem.tsx`, `ResearchBriefList.tsx`, `KnowledgeHubPage.tsx`, EN locale keys, and trust-state label keys.

## 1. Inventory Current Content

First-class finding: the current metadata overclaims the represented corpus. `meta.reforms_tracked = 14` while 4 reform records are present; `meta.research_briefs = 9` while 3 brief records are present; `meta.literature_items = 22` while contract Section 2 confirms there is no standalone literature record type today. This may be intentional if the metadata refers to a broader tracked set while the page surfaces only a subset, but the cleanup slice should ask the content owner which interpretation is correct. Until then, this is acceptable only as static pilot display copy with an explicit curated-count caveat; it is not acceptable as derived corpus metadata for source/citation schema acceptance.

### Meta Counts

| Field | Current value | Actual represented records | Assessment |
|---|---:|---:|---|
| `reforms_tracked` | 14 | 4 | Drift. Must be reconciled or labelled as broader curated pilot count. |
| `research_briefs` | 9 | 3 | Drift. Must be reconciled or labelled as broader curated pilot count. |
| `literature_items` | 22 | 0 standalone records | Count-only. No literature item record type exists under contract Section 2. |

### Reforms

| ID | Title | Date/status | Domain tag | Model refs |
|---|---|---|---|---|
| `pp-642-customs-phase-2` | PP-642 - Customs modernization Phase II | `2026-04-14`; `completed` | `Trade` | `PE`, `CGE` |
| `cbu-fx-rr-2026` | CBU reserve requirement on FX deposits | `2026-04-02`; `in_progress` | `Monetary` | `QPM`, `FPP` |
| `gas-tariff-adjustment-2026` | Gas tariff adjustment mechanism | `2026-03-21`; `in_progress` | `Fiscal / structural` | `CGE`, `FPP` |
| `wto-final-tariff-schedule` | WTO accession - final tariff schedule | `Q3 2026 - Planned`; `planned`; no `date_iso` | `Trade` | `PE`, `CGE` |

Top finding: all current reforms cite gated lanes through `PE`, `CGE`, or `FPP`. These references must not be cited as accepted model evidence while gated. Current pilot status is grandfathered only if a visible gated-lane caveat exists. If that caveat is absent, cleanup is required before broader pilot use.

### Research Briefs

| ID | Title | Byline/date | Domain tag | Model refs |
|---|---|---|---|---|
| `brief-remittance-ca-2026-04` | Remittance-sensitive growth: how much insurance does the current account provide? | Author `N. Mamatov`; `11 Apr 2026`; 9 min | `Monetary` | `FPP`, `QPM` |
| `brief-gas-tariff-inflation-2026-03` | Gas tariff reform: inflation arithmetic and compensation design | Author `J. Akhmatov`; `28 Mar 2026`; 6 min | `Fiscal` | `CGE`, `QPM` |
| `brief-wto-winners-losers-2026-03` | WTO accession: winners and losers under uniform vs. differentiated elasticities | `ai_drafted: true`; `reviewed_by: "CERR Trade Desk"`; `05 Mar 2026` | `Trade` | `PE`, `CGE` |

### Literature

No standalone literature items are represented. `literature_items: 22` is a count only and cannot be audited as a corpus until a future literature record type is accepted.

### Field Values Observed

`model_refs`: `PE`, `CGE`, `QPM`, `FPP`. `PE`, `FPP`, and `CGE` are gated or unaccepted for Knowledge Hub citation under contract Section 6. QPM is an accepted bridge surface, but Knowledge Hub citation requires accepted artifact/run/version pin and reviewer scope per contract Section 6.

`domain_tag` values: `Trade`, `Monetary`, `Fiscal`, `Fiscal / structural`. These are display labels only, not an accepted controlled backend/API vocabulary.

AI/review fields: only `brief-wto-winners-losers-2026-03` has `ai_drafted: true` and `reviewed_by: "CERR Trade Desk"`. No item carries reviewer name, review date, review scope, citation permission, license class, retrieval date, source owner, RU/UZ review state, or `as_of_date`.

Dates/statuses: reform `date_label` values render as display labels; three reforms have `date_iso`, one planned reform does not. Briefs have byline display dates only. Reform statuses are UI states, not accepted legal-currentness states.

## 2. Per-Item Contract Assessment

Legend: "absent" means the current static content/schema has no field or value for the required contract element. "Default" refers to contract Section 2 default states for existing pilot items.

### Reform Items

| Item | Source title/ref | Institution/publication/retrieval | Citation/license/owner | Review and translation state | Model/domain state | Caveat, AI mode, disclaimer, loop risk |
|---|---|---|---|---|---|---|
| `pp-642-customs-phase-2` | Source title/ref absent; title references `PP-642` only. | Issuing institution absent; publication date inferable only from `date_iso`; retrieval date absent; `as_of_date` absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Review state only "curated pilot copy" in UI; no reviewer-of-record; RU/UZ review state absent/default `not_translated`. | `PE` and `CGE` are gated/unaccepted for citation; `Trade` must map to `trade`. | Item-level static/legal-currentness caveat absent; AI governance mode unbound; no reviewed disclaimer; cross-citation-loop check absent. |
| `cbu-fx-rr-2026` | Source title/ref absent; title references CBU reserve requirement only. | Issuing institution implied by title but not structured; publication date inferable only from `date_iso`; retrieval date absent; `as_of_date` absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Review state only "curated pilot copy"; no reviewer-of-record; RU/UZ review state absent/default `not_translated`. | `FPP` gated; QPM is an accepted bridge surface, but Knowledge Hub citation requires accepted artifact/run/version pin and reviewer scope per contract Section 6; `Monetary` must map to `monetary`. | Item-level static/legal-currentness caveat absent; AI governance mode unbound; no reviewed disclaimer; cross-citation-loop check absent. |
| `gas-tariff-adjustment-2026` | Source title/ref absent. | Issuing institution absent; publication date inferable only from `date_iso`; retrieval date absent; `as_of_date` absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Review state only "curated pilot copy"; no reviewer-of-record; RU/UZ review state absent/default `not_translated`. | `CGE` unaccepted and `FPP` gated; `Fiscal / structural` requires split/map decision. | Item-level static/legal-currentness caveat absent; AI governance mode unbound; no reviewed disclaimer; cross-citation-loop check absent. |
| `wto-final-tariff-schedule` | Source title/ref absent. | Issuing institution absent; publication date absent beyond `Q3 2026 - Planned`; retrieval date absent; `as_of_date` absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Review state only "curated pilot copy"; no reviewer-of-record; RU/UZ review state absent/default `not_translated`. | `PE` and `CGE` are gated/unaccepted for citation; `Trade` must map to `trade`. | Item-level planned/not-enacted and legal-currentness caveat absent; AI governance mode unbound; no reviewed disclaimer; cross-citation-loop check absent. |

### Brief Items

| Item | Source title/ref | Institution/publication/retrieval | Citation/license/owner | Review and translation state | Model/domain state | Caveat, AI mode, disclaimer, loop risk |
|---|---|---|---|---|---|---|
| `brief-remittance-ca-2026-04` | Source title/ref absent; brief title present only. | Issuing institution absent; publication date is display-only byline `11 Apr 2026`; retrieval date absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Author shown as `N. Mamatov`; no attribution approval, reviewer-of-record, review date, or review scope; RU/UZ review state absent/default `not_translated`. | `FPP` gated; QPM is an accepted bridge surface, but Knowledge Hub citation requires accepted artifact/run/version pin and reviewer scope per contract Section 6; `Monetary` must map to `monetary`. | Item-level static/legal-currentness caveat absent; AI mode unbound because no `generation_mode`; reviewed-state disclaimer not applicable/absent; cross-citation-loop check absent. |
| `brief-gas-tariff-inflation-2026-03` | Source title/ref absent; brief title present only. | Issuing institution absent; publication date is display-only byline `28 Mar 2026`; retrieval date absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | Author shown as `J. Akhmatov`; no attribution approval, reviewer-of-record, review date, or review scope; RU/UZ review state absent/default `not_translated`. | `CGE` unaccepted; QPM is an accepted bridge surface, but Knowledge Hub citation requires accepted artifact/run/version pin and reviewer scope per contract Section 6; `Fiscal` must map to `fiscal`. | Item-level static/legal-currentness caveat absent; AI mode unbound; reviewed-state disclaimer not applicable/absent; cross-citation-loop check absent. |
| `brief-wto-winners-losers-2026-03` | Source title/ref absent; brief title present only. | Issuing institution absent; publication date is display-only byline `05 Mar 2026`; retrieval date absent. | Citation permission defaults `internal_only`; license class `unknown`; source owner absent. | `ai_drafted: true` plus `reviewed_by: "CERR Trade Desk"`; team label has no reviewer name, review date, content version, or scope; RU/UZ review state absent/default `not_translated`. | `PE` and `CGE` are gated/unaccepted for citation; `Trade` must map to `trade`. | Must bind to `assisted` until reconciled, not `reviewed`; current "Reviewed by CERR Trade Desk" wording does not match AI Governance Section 6; item-level caveat absent; cross-citation-loop check absent. |

Specific required callout: `brief-wto-winners-losers-2026-03` has `ai_drafted: true` and `reviewed_by: "CERR Trade Desk"`. This is a team label with no named reviewer, no review date, no content version, and no review scope. It fails Knowledge Hub contract Sections 3 and 12 until reconciled through an accepted owner-of-record/team-review rule or named reviewer metadata. Until then, it inherits the assisted disclaimer from `docs/ai-governance.md` Section 6: "Do not cite, export, or share externally."

## 3. Classification

| Item | Classification | Rationale |
|---|---|---|
| `pp-642-customs-phase-2` | Needs caveat; blocked for external citation | Internal preview can keep it as static context, but missing source lineage, `as_of_date`, citation/license state, and gated `PE`/`CGE` caveat block external citation. |
| `cbu-fx-rr-2026` | Needs caveat; blocked for external citation | Internal preview only. `FPP` gated, `QPM` unversioned, source/review/currentness metadata absent. |
| `gas-tariff-adjustment-2026` | Should be revised before broader pilot; blocked for external citation | `Fiscal / structural` domain is unmapped; `CGE`/`FPP` refs are not accepted citation evidence; reform status/currentness metadata absent. |
| `wto-final-tariff-schedule` | Needs caveat; blocked for external citation | Planned item needs explicit planned/not-enacted and legal-currentness caveat; `PE`/`CGE` refs gated/unaccepted; source lineage absent. |
| `brief-remittance-ca-2026-04` | Acceptable for internal preview with caveat; blocked for external citation | Static authored brief can remain in pilot if caveated, but source/citation/license/reviewer metadata and `FPP` gate are unresolved. |
| `brief-gas-tariff-inflation-2026-03` | Acceptable for internal preview with caveat; blocked for external citation | Static authored brief can remain in pilot if caveated, but `CGE`/`QPM` refs require accepted version/review scope and source lineage. |
| `brief-wto-winners-losers-2026-03` | Should be revised or removed before broader pilot; blocked for external citation | AI-drafted/reviewed ambiguity conflicts with AI Governance and contract Sections 3/12; `PE`/`CGE` refs gated/unaccepted. |

Overall classification: the current corpus is acceptable only as internal static preview content if visible static/legal-currentness and gated-lane caveats are present. It is blocked for external citation, export, backend source records, and broader pilot claims until the gaps below are cleared.

**Warning:** Internal-preview classification does not authorize broader pilot or external citation.

## 4. Cleanup Needed

Exact cleanup needed for a future mock cleanup slice:

- Missing source metadata: add or reconcile source title, source ref/URL/file, issuing institution, publication date, retrieval date, source owner, and snapshot/version pin per item.
- Gated `model_refs`: add visible caveat that `PE`, `CGE`, and `FPP` are planned/gated or unaccepted for citation; do not cite them as accepted model evidence.
- AI/reviewer ambiguity: reconcile `brief-wto-winners-losers-2026-03` against AI Governance `assisted`/`reviewed` modes, reviewer name/date/scope, and accepted team-review rules.
- Reform status/currentness ambiguity: add `as_of_date`, status declarer, evidence type/ref, and planned/not-enacted caveat where applicable.
- Translation gaps: declare RU/UZ state per item; current default is `not_translated` or shell-only UI localization, not reviewed translated content.
- Copyright/citation gaps: declare citation permission, license/redistribution class, attribution text, translation rights, and quote/excerpt policy per source.
- Meta count mismatch: reconcile `14`, `9`, and `22` with actual represented records or label them as broader curated pilot counts; ask the content owner whether the counts describe a broader tracked set or only the surfaced subset.
- `domain_tag` mapping: freeze a controlled vocabulary before backend/API/schema use.

Recommended `domain_tag` mapping:

| Current value | Recommended controlled value | Notes |
|---|---|---|
| `Trade` | `trade` | Straight map. |
| `Monetary` | `monetary` | Straight map. |
| `Fiscal` | `fiscal` | Straight map. |
| `Fiscal / structural` | Split/map decision required | Either split into `fiscal` + `structural`, choose one primary plus secondary tags, or define `cross_cutting`; do not preserve slash label as backend enum. |

## 5. STOP-Conditions Crosswalk

These statuses are for source/citation schema acceptance readiness, not for this docs-only audit.

| Contract Section 17 STOP condition | Status |
|---|---|
| Existing schema field-by-field governance accepted | Satisfied at contract/governance level; not at per-item content level; no app edits authorized. |
| Alignment with `docs/ai-governance.md` accepted | Not satisfied at item level for `brief-wto-winners-losers-2026-03`; accepted as governance rule only. |
| Canonical `template` / `assisted` / `reviewed` mode binding accepted | Governance accepted; Knowledge Hub items are not bound in content/schema. |
| Reviewed-state disclaimer and `reviewed_by` named-reviewer wording reconciled | Not satisfied; current reviewed wording lacks name/date/scope and does not match Section 6 reviewed wording. |
| `KnowledgeHubMeta.literature_items` accepted as count-only | Satisfied at contract/governance level; not at per-item content level and not safe as corpus count without label. |
| Existing pilot default states accepted | Satisfied at contract/governance level; not at per-item content level beyond defaults: internal-only, unknown license, not translated, no `as_of_date`, reviewer scope absent. |
| Reform-status authority and `as_of_date` semantics accepted | Satisfied at contract/governance level; not at per-item content level. |
| `model_refs` whitelist accepted | Satisfied at contract/governance level; not at per-item content level because refs are free strings and unversioned. |
| Transitional gated-lane `model_refs` rules accepted for HFI/FPP/PE | Satisfied at contract/governance level; not at per-item rendering level because visible item/UI caveat is absent. |
| Model-output source-manifest overlap check accepted | Satisfied at contract/governance level; not at operational/per-item content level. |
| `domain_tag` vocabulary frozen or `TO CONFIRM` accepted with no backend/API free-string use | Not satisfied for backend/API; current tags remain free display strings. |
| License/redistribution class declared per source class | Not satisfied; all current items are unknown. |
| Per-item citation-scope default accepted | Satisfied by default `internal_only`; no external allowance exists. |
| Takedown/correction protocol accepted | Satisfied at contract/governance level; not at per-item content level because no owner-of-record is present. |
| RU/UZ per-item review model accepted | Satisfied at contract/governance level; not at per-item content level because states are absent/default not translated. |
| Reviewer-of-record sign-off process accepted | Satisfied at contract/governance level; not at per-item content level. |
| Item-level static-pilot/legal-currentness caveat accepted | Satisfied at contract/governance level; not at per-item rendering/content level. |
| Read-only API shape and static fallback accepted before backend work | Satisfied at contract/governance level; no backend/API work should start from current content. |

## 6. Rendering/Caveat Surface Check

Component review only; no rendering fixes made.

| Surface | Currently rendered? | Assessment |
|---|---|---|
| Page-level static banner | Yes | `KnowledgeHubContentView` renders a static banner: "Curated static pilot content - not a live legal or research feed." |
| Item-level static/legal-currentness caveat | No / partial only | Items render "Source: static pilot content" and review/source date fragments, but not the contract-required item-level caveat meaning: not a live legal registry or current official notice. |
| `reviewed_by` metadata | Yes, partial | `BriefCard` renders `Reviewed by {{reviewer}}` when present, but without reviewer name/date/scope reconciliation. Reforms render "Review state: curated pilot copy." |
| AI-drafted indicator | Yes, partial | `BriefCard` renders AI-drafted byline text and chip for `ai_drafted: true`, but the assisted-mode disclaimer text must render alongside it; current coverage is partial if that disclaimer is absent. |
| Source/citation metadata | Partial | UI renders static source/date/author/reviewer fragments, but not source title/ref, issuing institution, retrieval date, citation permission, license class, attribution text, or source owner. |
| Gated-lane caveat | No | `model_refs` render as badges only; no visible warning that `PE`, `CGE`, or `FPP` are gated/unaccepted for citation. |

## 7. Recommendation

1. Accept this audit as a docs-only gap map for the static pilot content.
2. Open a separate future mock cleanup slice, proposed handoff file `docs/planning/knowledge-hub-mock-cleanup-slice.md`, limited to meta counts, gated-lane caveat string, `domain_tag` mapping, and AI-mode reconciliation on `brief-wto-winners-losers-2026-03`.
3. Treat source/citation schema acceptance as the next gate after cleanup: lineage fields, citation permission, license class, source owner, reviewer metadata, RU/UZ review state, and `as_of_date`.
4. Do not add backend, live feed, CRUD, new data files, or API wiring until Knowledge Hub contract gates clear.

## 8. Risks

- Official-looking static content: reform statuses and dates can read as current official notices without item-level caveats.
- AI-drafted/reviewed ambiguity: the WTO brief currently implies review by a team label without the AI Governance Section 6 reviewed-state fields.
- Meta count overclaim: `14`, `9`, and `22` imply a larger represented corpus than is present.
- Gated `model_refs`: `PE`, `CGE`, and `FPP` references can be misread as accepted model evidence.
- Legal/currentness overclaim: reform `completed`, `in_progress`, and `planned` statuses lack `as_of_date`, authority, and evidence.
- Translation drift: RU/UZ UI shell strings exist, but item-level translation review is not recorded.
- Copyright/citation gaps: license, redistribution, quote/excerpt, attribution, retrieval, and citation-permission fields are absent.
- Cross-citation loop: model refs are not checked against source manifests, so Knowledge Hub could cite model outputs that depend on Knowledge Hub content.
