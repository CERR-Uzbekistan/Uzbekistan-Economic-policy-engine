# Prototype Alignment — Shot 1 (v2)

**Builder:** Claude Code
**Reviewer:** Codex (three-pass, after PR opens)
**Branch:** from `epic/replatform-execution` → `feat/prototype-alignment-shot-1`
**Target branch:** `epic/replatform-execution`
**Reference branch:** `codex/mvp-replatform-finish` (stays alive, not merged; used for selective file pulls during this work)
**Expected size:** +1500–2500 LOC across 15–25 files
**Slice owner:** supervisor/advisor (me) + @nozim on editorial content (Shot 2)

> **Revision note — v2.** This prompt was reviewed by Codex against the actual `epic/replatform-execution` branch before Claude Code received it. 10 BLOCKING + 6 NON-BLOCKING + 3 NIT findings were adjudicated and incorporated. Key changes from v1: (a) the prototype file lives at `docs/alignment/spec_prototype.html`, not at repo root; (b) file paths corrected throughout (ChartRenderer is in `components/system/`, locales at `src/locales/`, scenarioStore at `src/state/`); (c) route is `/scenario-lab` not `/lab`; (d) equation rendering uses JSX-in-mock with id lookup, not ReactNode in contract; (e) `.ui-chip--warn` added as part of cross-cutting setup; (f) field-name corrections across all five pages.

---

## 0. What this slice is and is not

This slice does **structural prototype alignment** across five pages. The five per-page alignment decisions (Option A / Mixed) were adjudicated in a prior conversation with the supervisor against side-by-side screenshot comparison of the current epic state (plus Codex's MVP reference branch) against the prototype. This prompt implements those decisions.

**In scope (what this slice builds):**
- Structural page rebuilds for Knowledge Hub, Model Explorer, Comparison
- Targeted restoration work for Scenario Lab (sliders, impulse-response chart, always-visible AI disclaimer, clickable suggested-next, scenario-details collapsed, saved-scenarios modalized)
- Targeted polish for Overview (contextual footnotes, em-emphasis, named-reviewer provenance, delta revert, section-head removal)
- CSS token and primitive alignment with the prototype
- Visible `[SME content pending]` placeholder chip pattern for editorial content Shot 2 will fill
- Tests that cover the structural changes (adapter tests, component tests where applicable)

**Out of scope (deferred):**
- Editorial content drafts (KPI contextual footnotes, trade-off summary template shells, Model Explorer caveat prose, reform mechanism paragraphs, validation summaries). These are Shot 2 and will be delivered by @nozim + CERR staff. Build with structural placeholders.
- Merging anything from `codex/mvp-replatform-finish` directly. Pull specific files via `git checkout codex/mvp-replatform-finish -- <path>` only when explicitly noted in a per-page spec below.
- New model wiring (QPM is live; DFM landed via PRs #86–#87; others remain mocked). Do not change bridge code or contracts unless explicitly called out below.
- SME content upgrades to existing Model Explorer content. Codex's MVP-voice text for all 6 models is acceptable starting content; Shot 2 improves it.
- DFM nightly regen workflow (PR 4 of the DFM bridge slice). Different track.
- Renaming/moving tests unless a new component's tests require a new file.
- Touching `index.html` at repo root or the legacy `policy-ui/` folder — they stay frozen until deployment cutover.

---

## 1. Primary reference — prototype file

**The prototype file is `docs/alignment/spec_prototype.html` on `feat/prototype-alignment-shot-1`.**

This file does NOT exist on epic/replatform-execution yet. It is committed as the very first commit on the alignment branch (before the audit commit). Supervisor has verified the 2831-line / 115835-byte file locally; its commit to the branch is the precondition for all §2 reads and all §4 line-number references to work.

**Commit sequence to start this slice:**

1. Supervisor creates `feat/prototype-alignment-shot-1` off epic.
2. Supervisor commits `docs/alignment/spec_prototype.html` (the 2831-line prototype). Commit message: `chore(alignment): commit spec prototype as primary reference for shot-1`.
3. Supervisor commits this prompt file as `docs/alignment/01_shot1_prompt.md`. Commit message: `docs(alignment): shot-1 prompt v2 (codex-reviewed)`.
4. Branch is pushed. Claude Code begins from this point.

If the `docs/alignment/spec_prototype.html` file is missing when Claude Code starts, STOP immediately and surface.

**Prototype file is 2831 lines / 115,835 bytes.** Verify this at audit time:

```bash
wc -l docs/alignment/spec_prototype.html
# Expected: 2831
wc -c docs/alignment/spec_prototype.html
# Expected: 115835
```

If either count is off by more than 5, STOP — the file was truncated or the reference is wrong.

**Key section anchors (all line numbers in `docs/alignment/spec_prototype.html`):**
- Tokens and design primitives: lines 12–430 (CSS variables, card, chip, button, status-badge, segmented-control)
- Overview page styles: 432–684
- Scenario Lab styles: 686–924
- Comparison page styles: 926–1058
- Model Explorer styles: 1060–1251
- Knowledge Hub styles: 1253–1324
- Overview HTML: 1438–1677
- Scenario Lab HTML: 1683–1895
- Comparison HTML: 1901–2052
- Model Explorer HTML: 2058–2303
- Knowledge Hub HTML: 2309–2418
- Scenario Lab simulation / presets / narrative engine: 2562–2814

Every per-page section below cites the specific lines that define the target. The prototype's tokens and primitive class names (`status-badge`, `equation-block`, `delta-table`, `tl-item`, `brief`, `cmp-card`, `assumption-field`, `preset-chip`, `ai-attribution`) are the authoritative visual specifications. Claude Code will implement React equivalents and should preserve visual parity at the rendering level, not literal class names.

---

## 2. Read-before-write audit — mandatory first phase

Before writing any code, produce a written audit. Do not skip this step. Scope mismatches surface here, not after 800 LOC.

### 2.1 Read these files in full

All paths are verified against `epic/replatform-execution` as of this prompt's authorship. If any path is missing or renamed when audit runs, STOP.

**Contracts and shared:**
1. `apps/policy-ui/src/contracts/data-contract.ts`
2. `apps/policy-ui/src/styles/tokens.css`
3. `apps/policy-ui/src/styles/base.css`
4. `apps/policy-ui/src/components/system/ChartRenderer.tsx`
5. `apps/policy-ui/src/components/system/chart-label-utils.ts`

**i18n:**
6. `apps/policy-ui/src/locales/en/common.json` (and `ru`/`uz` equivalents)
7. Verify whether any page-specific locale files exist beyond common.json; if so, list them and include in audit reads.

**Per-page current implementations:**
8. `apps/policy-ui/src/pages/OverviewPage.tsx` plus everything under `src/components/overview/` plus `src/pages/OverviewPage.css` (or whatever page-level stylesheet exists)
9. `apps/policy-ui/src/pages/ScenarioLabPage.tsx` plus everything under `src/components/scenario-lab/` plus page CSS
10. `apps/policy-ui/src/pages/ComparisonPage.tsx` plus everything under `src/components/comparison/` plus page CSS (note: `TradeoffSummaryPanel.tsx` and `ComparisonChartPanel.tsx` exist today — see §4.3 for their fate)
11. `apps/policy-ui/src/pages/ModelExplorerPage.tsx` plus everything under `src/components/model-explorer/` if it exists (verify during audit)
12. `apps/policy-ui/src/pages/KnowledgeHubPage.tsx` — note: this is currently a placeholder page with hardcoded arrays. There is no `src/components/knowledge-hub/` directory. You will create it in this slice.

**Data pipeline per page (where it exists):**
13. `src/data/<page>/` — source.ts, client, adapter, mock, raw-live, tests. Discover during audit what's present for each page.

**Scenario store (for Scenario Lab work):**
14. `apps/policy-ui/src/state/scenarioStore.ts`

**Routing:**
15. `apps/policy-ui/src/app/router.tsx` — verify routes. Prototype JS uses `go('lab', ...)` but the React app routes are `/overview`, `/scenario-lab`, `/comparison`, `/model-explorer`, `/knowledge-hub`. All route-based references in this prompt use the React app's route paths.

**Prototype:**
16. `docs/alignment/spec_prototype.html` end-to-end — policy-aligned read, not a glance.

### 2.2 Produce a state summary per page

For each of the five pages, write one paragraph covering:

- **Current state on epic:** what components render now, what data shapes they consume, what i18n keys they use, what's missing relative to the prototype.
- **Delta from spec:** list the specific gaps this slice closes (reference the per-page specs in §4 below) plus any gaps that will remain after this slice ships.
- **Risk flags:** anything the read surfaces that the per-page spec doesn't already account for (e.g., a contract field you'll need to extend, a component that's reused across pages so changing it affects other pages, a test that will need update, an accessibility concern).

### 2.3 STOP conditions before build begins

After writing the five state summaries, **do not start implementing anything** until you've produced an explicit `BUILD-READY` or `STOP` verdict covering these checks:

**Prerequisites:**
- [ ] `docs/alignment/spec_prototype.html` exists, is 2831 lines, ~115835 bytes.
- [ ] All file paths in §2.1 exist in the tree (or have been discovered to be renamed; list renamings in audit).
- [ ] All `git checkout codex/mvp-replatform-finish -- <path>` commands referenced in §4 point to files that actually exist on that branch. Verify with `git ls-tree -r codex/mvp-replatform-finish -- <path>` before proposing to use.
- [ ] All route paths referenced in specs (`/scenario-lab`, `/comparison`, etc.) match what's registered in `router.tsx`.
- [ ] Font imports in `tokens.css` actually load `Source Sans 3` (not just declare it). Verify during audit; if only declared, add the `@import` during cross-cutting setup.

**Contract and component impact:**
- [ ] Contract changes needed are all additive (no field renames). If any change is breaking, surface it for adjudication — do not silently rename fields. Verify existing types' field names during audit.
- [ ] Cross-page shared components (`ChartRenderer`, status badges if shared) — document which pages each change affects and whether existing behavior is preserved.

**Scope:**
- [ ] Editorial placeholder pattern (§3.4 below) is understood; list which specific fields across the five pages use it.
- [ ] No per-page spec assumes a component/file that doesn't exist without calling that out explicitly.

Write the state summaries and the STOP-or-BUILD verdict as a commit on the alignment branch (commit message: `docs(alignment): shot-1 pre-build audit`) into `docs/alignment/01_shot1_audit.md`. Push that commit before touching any implementation code.

If any STOP condition triggers, wait for adjudication in conversation — don't proceed.

---

## 3. Cross-cutting conventions for this slice

### 3.1 CSS tokens and design primitives

The epic's `tokens.css` already aligns with the prototype at the level of most brand colors, typography, and spacing. Tokens to verify and add during cross-cutting setup:

**Already present on epic (verify, don't duplicate):**
- `--color-downside`
- `--color-upside`
- `--color-uncertainty` — note: epic's value is `rgba(77, 93, 116, 0.25)`, different from prototype's solid `#c5ceda`. **Keep the existing alpha value.** Alpha compositing is load-bearing for DFM's three-band nesting in PR #87; do not change to prototype parity.

**Missing on epic (add to `tokens.css`):**
- `--color-baseline` — `#1f3658` (matches `--color-brand` but exists as a distinct semantic token in prototype)
- `--color-alternative` — `#2f7b8a`
- `--color-warn-soft` — `#f4e8d0`
- `--color-crit-soft` — `#f5dfd6`

Verify the full list during audit — only add what's missing, and list the additions in the audit doc.

**Font imports:** `tokens.css` declares `Source Sans 3` in `--font-sans` but may not actually import it. Audit should verify the `@import` is present; if missing, add to `tokens.css` alongside the existing IBM Plex imports.

**Primitive classes from the prototype that this slice will need React equivalents of:**
- `.status-badge` (with `--ok`, `--warn`, `--crit` variants) — `spec_prototype.html:382–394`
- `.equation-block` — `spec_prototype.html:1164–1185`
- `.param-table` — `spec_prototype.html:1186–1214`
- `.caveat-item` with numbered `strong` prefix and severity border colors — `spec_prototype.html:1220–1234`
- `.source-item` (three-column grid) — `spec_prototype.html:1238–1251`
- `.delta-table` with `.highest`/`.lowest` star decoration — `spec_prototype.html:995–1037`
- `.cmp-card` with `data-role` variant border colors — `spec_prototype.html:965–993`
- `.scenario-chip` — `spec_prototype.html:942–956`
- `.tl-item` with `.in-progress`/`.planned` status — `spec_prototype.html:1263–1299`
- `.brief` — `spec_prototype.html:1301–1324`
- `.ai-attribution` — `spec_prototype.html:902–913`
- `.assumption-field` with slider and technical-name toggle — `spec_prototype.html:776–819`
- `.preset-chip` (active state) — `spec_prototype.html:723–737`

**Adding `.ui-chip--warn`:** The existing `base.css` has `.ui-chip--neutral` and `.ui-chip--accent`. The prototype uses `.ui-chip--warn` (amber) for the AI-drafted brief badge and the SME-pending placeholder chip. **Add `.ui-chip--warn` once in `base.css` as part of cross-cutting setup.** Styling per prototype lines 283–287 and 902–913 (pattern-matching on warn-soft background + amber border). This is a cross-cutting commit, not scoped to any single page.

Implement page-level CSS primitives under `src/pages/<page>.css` (existing convention). Only introduce component-scoped CSS under `src/components/<page>/` if a component is reused across pages.

### 3.2 Component placement

- Page-specific components under `src/components/<page>/`.
- Page-level CSS at `src/pages/<page>.css`.
- Genuinely shared components (e.g., `StatusBadge` if reused across Overview caveat rail AND Model Explorer catalog) under `src/components/shared/` or keep local and deduplicate in a follow-up if reuse is confirmed.
- No CSS Modules introduced — the project uses plain CSS today, keep that convention.

### 3.3 i18n pattern

All visible strings go through `useTranslation()`. No hardcoded English in components. Locales live at `src/locales/{en,ru,uz}/common.json`. All keys added in this slice go into `common.json` for their respective locale unless the audit surfaces page-specific locale files in use (in which case, match the discovered convention).

For prototype content with copy in `spec_prototype.html` (e.g., "Reforms tracked", "Select 2-4 scenarios"), add translation keys to all three locales with English = verbatim prototype copy, RU and UZ translated appropriately.

For Overview KPI contextual footnotes, Comparison trade-off summary shells, and Model Explorer validation summaries that are deferred to Shot 2, use the placeholder pattern in §3.4 below — the i18n keys should exist but the English value should be the sentinel string `"[SME content pending]"`.

### 3.4 Editorial placeholder pattern for Shot 2 content

Fields that need SME content in Shot 2 use this pattern. Both adapter-side (data-driven content like KPI context_note) and i18n-side (static prose like trade-off shells) are supported.

**Sentinel value:** the English string literal `"[SME content pending]"` — exactly that text, case-sensitive, used as the visible value at data/i18n layer.

**Rendering rule:** any time a component receives this string as content for a field, render a small warning-tint chip using `.ui-chip--warn` (which you'll have added per §3.1). Chip text: `"SME content pending"` (no brackets, no italicization). The chip is visible to users — Shot 2's job is to replace these strings with real content; until then, surface in UI that content is incomplete.

**Where this applies in Shot 1:**
- Overview: 8 KPI `context_note` fields. The contract's `HeadlineMetric` type gains a `context_note?: string` field. Mock data populates all 8 with the sentinel.
- Model Explorer: per-model `validation_summary` prose field. The contract's model-explorer type gains `validation_summary?: string[]` (array of paragraphs). Mock populates with sentinel strings.
- Comparison: `trade_off_summary` rendered prose. Adapter returns `{ mode: 'shell' | 'static' | 'empty', shell_id?, rendered_text? }`. When no shell applies and no static text is provided, render the sentinel chip.
- Overview: Named-reviewer provenance line — if `reviewer_name` is absent, render sentinel in that position.

Do not use this pattern for structural fields that are supposed to be empty in MVP (e.g., empty feed sections with no entries — use an empty-state message instead).

### 3.5 Accessibility

All existing accessibility primitives stay. Any new interactive component added in this slice needs:
- Correct `role` / `aria-labelledby` / `aria-selected` where applicable
- Focus-visible styling inherited from `base.css` (don't override)
- Keyboard operability for new tabs, chips, modal dialogs

The scenario chip rail's `×` close affordance must be keyboard-operable. The suggested-next anchors must be real `<Link>` (or `<a>`) components with `href`/`to`, not buttons-that-act-as-links.

### 3.6 Chart rendering

The existing `ChartRenderer` at `src/components/system/ChartRenderer.tsx` stays the core chart component. For Scenario Lab impulse-response, construct a `ChartSpec` with three series (GDP gap, Inflation, Policy rate) that renders as a line chart over 12 quarters. Use `--color-baseline`, `--color-downside` (dashed), and `--color-text` (dashed, thinner) per `spec_prototype.html:2600–2606`.

For the Comparison page chart panel: we are **explicitly dropping** the comparative chart panel in this slice (Option A decision). The page has no chart. Delete `ComparisonChartPanel.tsx` and remove its rendering from the Comparison page. If the contract has fields that were populated only to feed that panel, keep them for now (removing contract fields is a separate cleanup).

### 3.7 Commit strategy

One PR. Commits within the PR should each be a coherent unit — prefer "one commit per page" plus one setup commit for cross-cutting changes (token additions, `.ui-chip--warn` class, contract extensions) and one tests commit if tests aren't colocated with the changes they cover.

Commit message convention per repo:
- `feat(alignment): shot 1 — <page>` for page rebuilds
- `chore(alignment): shot 1 — tokens, primitives, contract` for cross-cutting
- `test(alignment): shot 1 — <scope>` for tests-only commits
- `docs(alignment): shot-1 pre-build audit` for the §2 audit commit

---

## 4. Per-page specifications

### 4.1 Knowledge Hub (Option A — full alignment)

**Prototype reference:** `spec_prototype.html:2309–2418` (HTML), `spec_prototype.html:1253–1324` (CSS).

**Context for this page:** Knowledge Hub is currently a placeholder page on epic. There is no `src/components/knowledge-hub/` directory. There is no Knowledge Hub mock or adapter on either epic or `codex/mvp-replatform-finish` — Codex's branch hardcoded arrays into the page component. You will build the full mock → adapter → component stack from scratch in this slice.

**Decision summary:** Build as two-column layout. Left column is a reform timeline with date rail and status dots. Right column is a vertical list of research brief cards. Three counts (reforms tracked, research briefs, literature items) go into the page-header meta strip.

**Target structure:**

```
Page header
  eyebrow:      "Reforms · Research · Literature"  (i18n)
  title:        "Knowledge Hub"                    (i18n)
  description:  "Context for scenarios. Reforms underway,
                 CERR research output, and the academic
                 literature behind each model."    (i18n)
  meta:         Reforms tracked · N · Research briefs · M
                · Literature items · L

Two-column body:
  Left (1.2fr):  Reform tracker
    section head (h2 "Reform tracker" + helper)
    timeline (vertical rule, dated items)
      item: tl-date, title, mechanism paragraph, meta chips + attribution badges
      status dot variants: default / in-progress / planned

  Right (1fr):   Research briefs
    section head (h2 "Research briefs" + helper)
    brief-list (vertical stack)
      brief card: byline (author · date · read-time OR AI-drafted flag),
                  title (h4), summary paragraph, meta chips
```

**Contract changes (additive):**

Add to `data-contract.ts`. If existing types partially cover this, preserve existing names and extend; don't duplicate.

```typescript
export type ReformStatus = 'completed' | 'in_progress' | 'planned';

export interface ReformTrackerItem {
  id: string;
  date_label: string;              // e.g., "14 Apr 2026" or "Q3 2026 · Planned"
  date_iso?: string;               // optional ISO for sorting
  status: ReformStatus;
  title: string;
  mechanism: string;               // paragraph describing mechanism + expected impact
  domain_tag: string;              // e.g., "Trade", "Monetary", "Fiscal / structural"
  model_refs: string[];            // e.g., ["PE", "CGE"]
}

export interface ResearchBrief {
  id: string;
  byline: {
    author?: string;               // e.g., "N. Mamatov"
    date_label: string;
    read_time_minutes?: number;
    ai_drafted?: boolean;
    reviewed_by?: string;          // e.g., "CERR Trade Desk"
  };
  title: string;
  summary: string;
  domain_tag?: string;
  model_refs: string[];
}

export interface KnowledgeHubContent {
  reforms: ReformTrackerItem[];
  briefs: ResearchBrief[];
  meta: {
    reforms_tracked: number;
    research_briefs: number;
    literature_items: number;
  };
}
```

**Content seed:**

Knowledge Hub has no existing mock file to checkout from the Codex branch. Build the mock from scratch. Use the prototype's content verbatim from `spec_prototype.html:2332–2412`:

Four reforms:
- `14 APR 2026` · `PP-642 · Customs modernization Phase II` — completed status, Trade domain, PE + CGE refs
- `02 APR 2026` · `CBU reserve requirement on FX deposits` — in_progress, Monetary, QPM + FPP
- `21 MAR 2026` · `Gas tariff adjustment mechanism` — in_progress, Fiscal / structural, CGE + FPP
- `Q3 2026 · Planned` · `WTO accession · final tariff schedule` — planned, Trade, PE + CGE

Three briefs:
- N. Mamatov · 11 Apr 2026 · 9 min read · "Remittance-sensitive growth..."
- J. Akhmatov · 28 Mar 2026 · 6 min read · "Gas tariff reform: inflation arithmetic..."
- AI-drafted · reviewed by CERR Trade Desk · 05 Mar 2026 · "WTO accession: winners and losers..."

Use the mechanism/summary paragraphs from the prototype verbatim. These are content, not editorial voice — they're well-formed and match the institutional register.

**Components to build:**

```
src/components/knowledge-hub/
  ReformTimeline.tsx       — renders vertical timeline with tl-item status variants
  ResearchBriefList.tsx    — renders brief-list (cards stacked vertically)
  TimelineItem.tsx         — single reform row with dot + date + body
  BriefCard.tsx            — single brief with byline + title + summary + meta
```

**Responsive:** Both columns collapse to single column below 1100px per prototype's `@media (max-width: 1100px) { .hub-grid { grid-template-columns: 1fr; } }`. Inherit via scoped CSS at `src/pages/KnowledgeHubPage.css` (or whatever the existing pattern names the page CSS).

**Success criteria:**
- Page renders two columns at desktop width (≥1100px).
- Timeline shows 4 reform items, one with `planned` status rendering as dashed dot.
- Brief list shows 3 briefs, one with `ai_drafted: true` showing AI-drafted chip (use `.ui-chip--warn`).
- All visible strings are i18n'd (including bylines where formatted).
- Page-header meta strip shows the three counts.
- Adapter test verifies Knowledge Hub adapter produces the expected shape.
- Existing placeholder KnowledgeHubPage content is removed; new structure is the primary render.

**Out of scope:**
- Third column with Literature items (not in prototype at top level)
- Filtering or search
- Pagination
- Any integration with mcp_server literature tools (Shot 2+ concern)

---

### 4.2 Model Explorer (Option A — full alignment; keep Codex's content as starting point)

**Prototype reference:** `spec_prototype.html:2058–2303` (HTML), `spec_prototype.html:1060–1251` (CSS).

**Decision summary:** Rebuild catalog cards with severity-coded status badges, methodology signature line, 3-stat mini-row per model. Restore 5-tab structure (Overview · Equations · Parameters · Data sources · Caveats). Two-column body on the Overview tab (equations + parameters left, caveats + data sources + validation right). Render equations as inline math with italic variables, Unicode subscripts, Greek. Parameter table with 4 columns (Symbol · Name · Value · Range) and inactive-flag styling. Numbered caveats with severity color borders. Validation summary prose. Page header with meta strip.

**Target structure:**

```
Page header
  eyebrow:      "Methodology · Parameters · Caveats"  (i18n)
  title:        "Model Explorer"                      (i18n)
  description:  "Inspect the mechanics behind every output.
                 Honest about what each model does
                 — and does not — do."                (i18n)
  meta:         Models · N live · Last calibration audit · <month>
                · Open methodology issues · N

Model catalog (3-column grid)
  model-card (one per model): title + status-badge (severity-coded),
                              methodology signature line,
                              description paragraph,
                              three stats (e.g., 14 Params · 4 Equations · Q Freq.)
  Active model's card has .active styling (brand-soft background, brand border)

Model detail (below catalog)
  detail-head: eyebrow "<Full name> · <lifecycle>", h3 title + subtitle, status-badge right
  tab strip: Overview · Equations · Parameters · Data sources · Caveats
    (segmented-control styling; tabs show/hide detail body content)

  Default tab: Overview (shows a two-column everything-at-once body)
    Left column (1.4fr):
      Purpose paragraph
      Core equations (stack of equation-block)
      Key parameters table
    Right column (1fr):
      Caveats (numbered list, severity colors)
      Data sources (three-column source-item list)
      Validation summary (two paragraphs)

  Other tabs:
    Implementation note — simplest pattern: Overview shows everything; Equations/
    Parameters/Data sources/Caveats tabs filter to just their section. Pick this
    pattern OR implement anchors that scroll to the section. Document the choice
    in the PR description.
```

**Contract changes (additive):**

Extend the existing model-explorer contract. The current epic contract has `model_type`, `frequency`, and `status: 'active' | 'staging' | 'paused'`. Add new fields alongside; preserve existing ones (don't rename).

```typescript
export type ModelStatusSeverity = 'ok' | 'warn' | 'crit';

export interface ModelStatusLabel {
  label: string;          // e.g., "2 Fixes", "Active", "Fix", "Gap", "CA exog."
  severity: ModelStatusSeverity;
}

export interface ModelEquation {
  id: string;             // e.g., "qpm_is", "qpm_phillips" — used for JSX lookup
  label: string;          // e.g., "IS · Aggregate demand"
  // Note: the rendered equation JSX lives in a sibling file keyed by this id.
  // The contract stays serializable; see Equation rendering note below.
}

export interface ModelParameter {
  symbol: string;         // e.g., "b_1", "γ_π" — rendered by EquationRenderer
  name: string;           // e.g., "Output persistence"
  value: string;          // e.g., "0.60" or "0.00 (inactive)"
  range: string;          // e.g., "0.40 – 0.80"
  inactive?: boolean;     // when true, render value in --color-downside
}

export interface ModelCaveat {
  id: string;
  number: string;          // e.g., "01", "02" — display numbering
  severity: 'info' | 'warning' | 'critical';
  title: string;           // bold line
  body: string;            // paragraph
  issue_refs?: string[];   // e.g., ["#23"]
  target_version?: string; // e.g., "v1.1"
}

export interface ModelDataSource {
  institution: string;
  description: string;
  vintage_label: string;   // e.g., "Apr 2026", "Q1 2026"
}

export interface ModelCatalogEntry {
  id: string;
  title: string;                    // e.g., "QPM"
  full_title: string;                // e.g., "QPM — New-Keynesian Small Open Economy"
  lifecycle_label: string;           // e.g., "Quarterly Projection Model · Active"
  status: ModelStatusLabel;
  model_type: string;                // existing — kept for backward compat
  frequency: string;                 // existing — kept for backward compat
  methodology_signature: string;     // new — longer descriptor e.g., "DSGE · Quarterly · New-Keynesian SOE"
  description: string;               // short description
  stats: Array<{ value: string; label: string }>;  // 3-element array
  purpose: string;
  equations: ModelEquation[];
  parameters: ModelParameter[];
  caveats: ModelCaveat[];
  data_sources: ModelDataSource[];
  validation_summary: string[];      // array of paragraphs; Shot 2 fills real content
}
```

**Equation rendering — serializable contract + JSX-in-mock:**

Equations must stay serializable in the contract (the contract is consumed by mocks, adapters, guards, and raw JSON payloads — `ReactNode` would break that boundary).

The pattern:

1. The contract stores only `equations: ModelEquation[]` where each entry has `id` and `label`.
2. A sibling file at `src/components/model-explorer/equations/<model-id>-equations.tsx` exports a `Record<string, ReactNode>` keyed by equation id:

```typescript
// src/components/model-explorer/equations/qpm-equations.tsx
import { ReactNode } from 'react';

export const qpmEquations: Record<string, ReactNode> = {
  'qpm_is': (
    <><em>y</em><sub>t</sub> = <em>b</em><sub>1</sub>·<em>y</em><sub>t−1</sub> − <em>b</em><sub>2</sub>·(<em>r</em><sub>t</sub> − <em>r̄</em>) + <em>b</em><sub>3</sub>·<em>y</em><sub>t</sub>* + ε<sub>t</sub><sup>y</sup></>
  ),
  'qpm_phillips': (
    <>π<sub>t</sub> = <em>a</em><sub>1</sub>·π<sub>t−1</sub> + <em>a</em><sub>2</sub>·<em>rmc</em><sub>t</sub> + <em>a</em><sub>3</sub>·Δ<em>s</em><sub>t</sub> + ε<sub>t</sub><sup>π</sup></>
  ),
  // ...
};
```

3. `EquationBlock.tsx` takes `{ equation: ModelEquation; jsx: ReactNode }` as props and renders.
4. The page component composes catalog entry's equations with the lookup map before rendering.

This keeps the data contract clean (serializable, testable via guards) and puts the JSX in a conventional React location.

For the `ModelParameter.symbol` field and `ModelEquation.label` eyebrow, you can use simple inline JSX rendering via a small helper that handles subscripts (e.g., rendering `"b_1"` as `<>b<sub>1</sub></>`). Keep it simple — these are short identifiers, not equations.

**Key parameters table:**

Four columns per `spec_prototype.html:2206–2242`. Symbol column uses `.sym` styling (monospace italic brand-colored). Value column with `.issue` modifier for inactive params (e.g., `b_3 · External demand channel · 0.00 (inactive) · 0.00 – 0.45`).

**Caveats:**

Each caveat row has a numbered prefix (`01 ·`, `02 ·`, etc.) bolded in the title. Left border color per severity: `--color-downside` for critical, `--color-warn` for warning, `--color-border-strong` for info. Include issue refs and target version inline when present.

**Data sources:**

Three-column grid per source row: institution | description | vintage. See `spec_prototype.html:2272–2291`.

**Validation summary:**

Two short paragraphs below data sources on the Overview tab. This is Shot 2 SME content — render `[SME content pending]` sentinel for any model where `validation_summary` contains the sentinel string.

**Content seed:**

Pull Codex's 6-model content from the reference branch (verify paths exist on that branch first):

```bash
git checkout codex/mvp-replatform-finish -- apps/policy-ui/src/data/mock/model-explorer.ts
git checkout codex/mvp-replatform-finish -- apps/policy-ui/src/data/raw/model-explorer-live.ts
```

Map Codex's content into the new shape. Actual field mappings (corrected against epic + codex branch):

- Codex's `model_type` + `frequency` → compose into `methodology_signature` (e.g., `"DSGE"` + `"Quarterly"` → `"DSGE · Quarterly · New-Keynesian SOE"` where the "New-Keynesian SOE" suffix is added per prototype's longer-form descriptors)
- Codex's `status: 'active' | 'staging' | 'paused'` → becomes `status: { label, severity }`. Mapping (per prototype's six specific labels):
  - QPM: `{ label: '2 Fixes', severity: 'warn' }`
  - DFM: `{ label: 'Active', severity: 'ok' }`
  - PE: `{ label: 'Fix', severity: 'crit' }`
  - I-O: `{ label: 'Active', severity: 'ok' }`
  - CGE: `{ label: 'Gap', severity: 'warn' }`
  - FPP: `{ label: 'CA exog.', severity: 'warn' }`
- Codex's assumptions/parameters → `parameters` (mapping each to symbol/name/value/range; where Codex's data lacks ranges, use `"—"` placeholder — ranges are structural, they appear in the table but missing ranges aren't a sentinel-chip case, just a display "—")
- Codex's equations (as text) → `equations` (requires per-model JSX authoring in `equations/<model>-equations.tsx`)
- Codex's caveats → `caveats` (add `number`, `severity` — derive severity from Codex's chip type if available, else default to `'warning'` for conservative visibility)
- Codex's data_sources → `data_sources` (straight mapping)
- Codex's validation text → `validation_summary` array; where absent, use sentinel

**Components to build:**

```
src/components/model-explorer/
  ModelCatalog.tsx          — 3-column grid of cards
  ModelCatalogCard.tsx      — single card with status badge + stats
  ModelDetail.tsx            — detail area with head + tabs + body
  ModelDetailTabs.tsx        — segmented-control tab strip
  ModelOverviewBody.tsx      — 2-column body
  EquationBlock.tsx          — single equation block (takes equation + jsx)
  ParameterTable.tsx         — param table
  CaveatList.tsx              — numbered severity-coded caveats
  DataSourceList.tsx          — 3-column source list
  ValidationSummary.tsx       — validation paragraphs (with sentinel support)
  equations/qpm-equations.tsx
  equations/dfm-equations.tsx
  equations/pe-equations.tsx
  equations/io-equations.tsx
  equations/cge-equations.tsx
  equations/fpp-equations.tsx
```

Reuse `StatusBadge` if shared with Overview; otherwise keep local to model-explorer.

**Success criteria:**
- Catalog renders 6 cards in a 3-column grid (auto-fit or explicit 3-column at wide widths; collapses to 1-column below 1100px).
- Each card shows one of the six severity labels from prototype (not all "Active/Staging").
- Methodology signature line renders.
- Three stats render per card.
- Clicking a card loads detail area below with that model's content.
- Detail Overview tab shows 2-column body with all content sections.
- Equations render with italic variables + Unicode subscripts + Greek via `EquationBlock` + JSX lookup pattern.
- Parameter table shows 4 columns with inactive value in red when applicable (QPM's b₃).
- Caveats show numbered prefixes + severity borders.
- Data sources show 3-column rows.
- Validation summary shows sentinel chips for all 6 models.
- Page-header meta strip shows counts.
- Adapter test verifies shape.
- All visible strings i18n'd.

**Out of scope:**
- Issue-tracker integration (issue_refs display as plain text like "#23", no hyperlink)
- Per-model issue count aggregation
- Model comparison across cards

---

### 4.3 Comparison (Option A — full alignment rebuild)

**Prototype reference:** `spec_prototype.html:1901–2052` (HTML), `spec_prototype.html:926–1058` (CSS).

**Decision summary:** Replace Codex's full-panel selector with a chip-rail selector. Add three scenario summary cards with author-date-source role tag, top-border color, and 5-metric summary. Replace the current table with a delta-column table structure. Add star-best-on-metric decoration with policy-judgment footnote. Expand metric coverage from 4 to 7 (GDP 3y avg, Inflation terminal, CA %GDP, Fiscal %GDP, Reserves end, Unemployment avg, Real wages cumulative). Rewrite trade-off summary as editorial prose with hybrid template shells + sentinel fallback. Drop the comparative chart panel. Keep the 3-slot limit (current `COMPARISON_SLOT_LIMIT = 3`). Keep baseline switcher. Remove per-scenario tag dropdowns.

**Current file fates:**
- `TradeoffSummaryPanel.tsx` — rename to `TradeoffSummary.tsx` OR keep filename and update internals; choose one and document in PR. Prefer updating internals of existing file to preserve import statements.
- `ComparisonChartPanel.tsx` — delete. Remove imports and rendering from `ComparisonPage.tsx`.

**Target structure:**

```
Page header
  eyebrow:      "Scenario trade-offs"                (i18n)
  title:        "Comparison"                         (i18n)
  description:  "Hold saved scenarios side by side;
                 examine deltas, trade-offs, and which
                 results are robust across models."  (i18n)
  meta:         Comparing · N scenarios · Horizon · <range>
                · Mode · Deltas vs. Baseline

Chip-rail selector (.cmp-selector)
  "In view" label
  scenario-chip × N (each with dot in role color, name, close ×)
  + Add saved scenario ghost button (right-aligned)

Three scenario summary cards (.cmp-cards grid)
  Per scenario: top-border in role color, tag line (role · author · date),
                h3 title, 5 metric rows (name | value)

Delta table (.delta-table)
  Columns: Indicator | Baseline | <alt1> | Δ | <alt2> | Δ (for 3-scenario case)
  Rows: 7 metrics (see below)
  Star decoration on best-on-metric cell
  Policy-judgment footnote below: "★ indicates numerically lowest or highest value.
    Policy judgment is separate and not encoded."

Trade-off summary (.tradeoff)
  Editorial prose with em-emphasized scenario names
  Template-shell-driven when scenario configuration matches;
  sentinel chip when no shell matches (Shot 2 fills shells)
```

**Contract changes (additive):**

```typescript
export type ScenarioRole = 'baseline' | 'alternative' | 'downside' | 'upside';

export interface ComparisonScenarioMeta {
  id: string;
  name: string;
  role: ScenarioRole;
  role_label: string;          // e.g., "Baseline", "Alternative", "Stress"
  author?: string;
  author_date_label?: string;  // e.g., "14 Apr"
}

export interface ComparisonMetricRow {
  id: string;                  // e.g., "gdp_growth_3y_avg"
  label: string;               // e.g., "GDP growth · 3y avg"
  baseline_value: string;
  values: Record<string, string>;      // keyed by scenario id
  deltas: Record<string, string>;      // keyed by scenario id, relative to baseline
  highest_scenario?: string;           // id of scenario with highest value
  lowest_scenario?: string;            // id of scenario with lowest value
}

export interface TradeoffSummary {
  mode: 'shell' | 'static' | 'empty';
  shell_id?: string;                   // when mode === 'shell'
  rendered_text?: string;              // when mode === 'static' or rendered from shell
}

export interface ComparisonContent {
  scenarios: ComparisonScenarioMeta[];  // max 3 (COMPARISON_SLOT_LIMIT)
  baseline_scenario_id: string;
  horizon_label: string;
  metrics: ComparisonMetricRow[];
  tradeoff: TradeoffSummary;
}
```

**Metric coverage — seven metrics this slice supports:**

1. GDP growth · 3y avg
2. Inflation · terminal
3. Current account · %GDP
4. Fiscal balance · %GDP
5. Reserves · end
6. Unemployment · avg
7. Real wages · cumulative

If the existing adapter/model outputs don't yet produce unemployment and real-wages paths, use mock values per `spec_prototype.html:2020–2035`. Flag in PR description that live wiring for these two metrics is Shot 2 / subsequent slices.

**Trade-off summary shells:**

Build 3 template shells. Each is a function that takes `(scenarios, metrics) => rendered_text`. Shell selection logic picks the first matching shell.

- **Shell A — "single-alternative-vs-baseline"** — applies when exactly 2 scenarios (baseline + 1 alternative).
- **Shell B — "fiscal-vs-growth-tradeoff"** — applies when 2+ scenarios and at least one scenario's metadata indicates fiscal consolidation. The prototype's prose (lines 2045–2047) is the authoritative English shell; use verbatim.
- **Shell C — "stress-vs-baseline-robustness"** — applies when any scenario has `role: 'downside'`.

Shells that don't apply: render sentinel. Shells that apply but haven't been written yet for the current locale: render sentinel. RU and UZ translations of Shell B are the minimum content deliverable; A and C are Shot 2 for all locales if not completed in this slice.

**Content seed:** Build a fresh mock for Comparison; don't pull from Codex branch. The prototype's 3-scenario example (Baseline · CERR Macro · 14 Apr / Fiscal consolidation · J. Akhmatov · 09 Apr / Russia slowdown · A. Karimova · 04 Apr) is the content seed. Use prototype values verbatim for metric values. The trade-off prose from `spec_prototype.html:2045–2047` is the authoritative Shell B content.

**Components to build/modify:**

```
src/components/comparison/
  ComparisonSelector.tsx          — chip-rail selector with baseline switcher (replaces existing selector)
  ScenarioChip.tsx                 — single chip with color dot + name + close
  ScenarioSummaryCards.tsx         — 3-card row with top-border color + tag + title + metrics
  ScenarioSummaryCard.tsx          — single summary card
  DeltaTable.tsx                    — 7-metric table with delta columns and stars
  TradeoffSummary.tsx (or modified TradeoffSummaryPanel.tsx) — shell-rendered prose with sentinel
```

Remove from page:
- `ComparisonChartPanel` rendering (and delete the file)
- Scenario tag dropdowns (Preferred/Balanced/Aggressive dropdown per scenario)
- The full-panel selector

**Success criteria:**
- Chip rail renders with color dots per scenario role.
- `+ Add saved scenario` ghost button is present and functional (opens a modal or navigates to a picker — a stub `onClick` that logs is acceptable if no modal has been specified yet).
- Three summary cards render with top-border colors in the role palette.
- Delta table has 7 rows covering the specified metrics.
- Star decorations appear on numerically best-on-metric cells.
- Policy-judgment footnote renders below the table.
- Trade-off summary renders prose from the matching shell, or sentinel chip if no shell matches.
- Comparative chart panel is absent from the page.
- Page-header meta strip shows `Comparing · N · Horizon · ... · Mode · Deltas vs. Baseline`.
- Per-scenario tag dropdowns are absent.
- Slot limit remains 3 (`COMPARISON_SLOT_LIMIT = 3`).
- Adapter test verifies shape; component test verifies star placement logic.

**Out of scope:**
- Comparative chart panel (deferred)
- Editorial shell content drafts beyond Shell B EN (Shot 2)
- Additional metrics beyond the seven
- Multi-model comparison (cross-model deltas)
- Raising the slot limit from 3 to 4 (separate decision if ever needed)

---

### 4.4 Scenario Lab (Mixed — restore prototype interaction patterns; keep Codex's expansions where they fit)

**Prototype reference:** `spec_prototype.html:1683–1895` (HTML), `spec_prototype.html:686–924` (CSS), `spec_prototype.html:2562–2814` (JS for simulate/narrative patterns).

**Decision summary:** Restore sliders as the primary assumption interaction (with number-input secondary for precise entry). Restore the 12-quarter impulse-response line chart (drop the horizontal-bar headline impact chart). Always show the AI-draft disclaimer regardless of `generation_mode`. Restore clickable suggested-next anchors. Move scenario type/description/tags into a collapsed `▶ Scenario details` section under the scenario name. Remove the inline saved-scenarios list; replace with a `Load saved scenario` text link that opens a modal.

**Target structure:**

```
Page header (per prototype)

Three-column lab grid (per .lab-grid at spec_prototype.html:690–701)
  LEFT — Assumptions (.lab-panel)
    h3 "Assumptions" + helper
    preset chips row (.presets)
    lab-session block:
      scenario name input
      [▶ Scenario details (collapsed by default)]  <-- contains type/description/tags
      Run scenario (primary) + Save draft (secondary)
      Load saved scenario (text link — opens modal)
    technical-variable-names toggle

    assumption-group × 3 (Monetary · External · Fiscal; optional Trade if 4+ items)
      assumption-field (label + value + slider + number-input + help text + tech name)

  CENTER — Results (.lab-panel)
    h3 "Results" + helper
    result-tabs (Headline impact · Macro path · External balance · Fiscal effects)
    stale-banner (when results reflect previous run)
    headline-metrics (4-tile strip: GDP 4q avg · Inflation terminal · Current account · Policy rate end)
    impulse-response chart card:
      eyebrow "IMPULSE RESPONSE"
      h4 "GDP gap, inflation & policy rate · 12 quarters"
      attribution-badge "QPM · FPP"
      line chart (3 series, 12 quarters, deviation from baseline · pp)
      legend + caption

  RIGHT — Interpretation (.lab-panel)
    h3 "Interpretation" + helper
    interpretation-section × 4 (What changed · Why it changed · Key risks · Policy implications)
    Suggested next scenarios (clickable <Link> anchors)
    AI-draft attribution block (.ai-attribution — ALWAYS visible)
```

**Contract / data changes:**

The relevant type is `ScenarioLabInterpretation`, not `NarrativeBlock`. Current Scenario Lab casts metadata onto it informally. Add a proper metadata type:

```typescript
export interface ScenarioLabInterpretationMetadata {
  generation_mode: 'template' | 'assisted';
  reviewer_name?: string;
  reviewed_at?: string;        // ISO or display date
}

export interface ScenarioLabInterpretation {
  // existing fields preserved
  what_changed: string[];
  why_it_changed: string[];
  key_risks: string[];
  policy_implications: string[];
  suggested_next: SuggestedNextScenario[];   // new, see below
  metadata: ScenarioLabInterpretationMetadata;
}

export interface SuggestedNextScenario {
  label: string;
  target_route: '/scenario-lab' | '/comparison';
  target_preset?: string;      // e.g., "russia_slowdown", "energy_reform"
}
```

Do **not** branch the AI-attribution block rendering on `generation_mode`. Render always. Use `generation_mode` only to pick disclaimer wording ("template narrative engine" vs "assisted narrative engine") — never to hide the disclaimer.

**Slider-with-number-input pattern:**

Each assumption field has:
- Label (e.g., "Policy rate change")
- Current value displayed on the right (brand-colored monospace)
- Slider (primary — `spec_prototype.html:799–819` for styling)
- Number input (secondary — small input box below the slider, visible, lets user type a precise value)
- Helper paragraph below
- Technical variable name (hidden by default, shown when toggle is active)

Slider min/max/step per prototype (`spec_prototype.html:1735, 1744, 1757, 1766, 1779`):
- Policy rate change: -300 to 300, step 25, default 0, unit bp
- Currency depreciation: -15 to 25, step 1, default 0, unit %
- Remittance flow: -30 to 15, step 1, default 0, unit %
- Commodity price shock: -40 to 40, step 1, default 0, unit %
- Government spending: -4 to 4, step 0.25, default 0, unit pp

If Codex's current scenarioStore uses additional shocks (tax_revenue, tariff_adjustment, external_demand_shift), keep those as additional fields. Prototype has 5 sliders; Codex expanded to 8. Keep Codex's 8 grouped as Monetary · External · Fiscal + optional Trade for the 3 extras, rendered with the prototype's slider pattern.

**Scenario details collapsed section:**

Default collapsed. Keyboard-operable disclosure. Contents: type dropdown, description textarea, tags chips.

**Load saved scenario modal:**

Click `Load saved scenario` opens a modal dialog (focus-trapped) listing all saved scenarios from `scenarioStore` (at `src/state/scenarioStore.ts`). Each row has name, saved-at timestamp, Load button. Selecting Load closes modal and populates lab state from that scenario.

**Impulse-response chart:**

Three-series line chart, 12 quarters, using `ChartRenderer`. Series: GDP gap (navy solid), Inflation (red dashed), Policy rate (near-black dashed). Axis is "Deviation from baseline · pp". The `ChartSpec` should be constructed in `data/scenario-lab/` adapter from the simulate output.

Use whatever epic currently has for simulation logic. Don't reimplement from scratch. Produce the 3-series `ChartSpec` from existing simulate output.

**AI attribution disclaimer:**

Always visible. Content per `spec_prototype.html:1887–1890`:

> **AI-assisted · Unreviewed draft**
> This interpretation was drafted from structured simulation outputs using the template narrative engine. Human review is required before citing externally.

For `metadata.generation_mode === 'template'`, use prototype copy verbatim. For `metadata.generation_mode === 'assisted'`, swap "template narrative engine" with "assisted narrative engine". Disclaimer itself always present.

**Suggested next scenarios:**

Three entries. Clickable `<Link>` components (from `react-router-dom`), not buttons. Routes use the React app's paths:
- "Pair with a remittance shock" → `/scenario-lab?preset=russia_slowdown`
- "Add energy tariff adjustment" → `/scenario-lab?preset=energy_reform`
- "Compare with baseline and tight-money" → `/comparison`

**Components to modify/build:**

```
src/components/scenario-lab/
  AssumptionsPanel.tsx          — restructure to use AssumptionField with sliders
  AssumptionField.tsx            — new; slider + number input + help + tech name
  ScenarioDetails.tsx            — new; collapsed section for type/desc/tags
  SavedScenarioModal.tsx         — new; modal picker for saved scenarios
  ResultsPanel.tsx               — restore impulse-response chart (drop bar chart)
  ImpulseResponseChart.tsx       — new; ChartRenderer wrapper for 3-series line chart
  InterpretationPanel.tsx        — ensure AI-attribution always visible
  SuggestedNextScenarios.tsx     — new or modify; clickable Link anchors
```

**Success criteria:**
- Each assumption field renders both slider and number input.
- Scenario details section is collapsed by default; expands to reveal type/desc/tags.
- Saved scenarios are accessed via a text link that opens a modal — no inline list on the Assumptions panel.
- Results panel shows impulse-response line chart with `QPM · FPP` attribution badge and `IMPULSE RESPONSE` eyebrow.
- Headline-impact horizontal-bar chart from Codex is removed.
- Suggested-next anchors navigate via `Link` (not `onClick` → navigate).
- AI-attribution disclaimer renders regardless of `metadata.generation_mode`.
- Preset chips still work and still apply preset values to sliders.
- Scenarios saved via Save-draft are still persisted through scenarioStore and retrievable via the modal.
- Adapter tests updated if adapter's output shape changed.
- Component tests for new components (AssumptionField, ImpulseResponseChart wrapping, SavedScenarioModal focus-trap).

**Out of scope:**
- Any change to simulation logic or preset values
- Rewiring scenarioStore persistence
- Comparative preview (that's the Comparison page)

---

### 4.5 Overview (Mixed — accept structure, polish 5 items)

**Prototype reference:** `spec_prototype.html:1438–1677` (HTML), `spec_prototype.html:432–684` (CSS).

**Decision summary:** Accept Codex's current structural work (state header, 8-KPI strip, nowcast chart with attribution, 3-risk rail, quick actions, vertical feed). Polish five specific items:

1. Add `<em>` emphasis to key numbers in the state narrative.
2. Add named-reviewer provenance line below the narrative.
3. Add contextual footnotes per KPI tile (8 total; Shot 2 fills editorial content).
4. Revert the "Core indicators / Current values and period-over-period change" section head above the KPI strip (remove the header).
5. Revert delta chip-pills in KPI tiles back to inline arrow-text format.

Keep `CaveatPanel` and `ReferencesFooter` — they're additive trust-surface work, not drift.

**Target changes:**

**1. State narrative `<em>` emphasis.**

The current component is `EconomicStateHeader`. The contract field is `MacroSnapshot.summary` (string). Change to accept either a string (back-compat) or a structured `NarrativeSegment[]`:

```typescript
export interface NarrativeSegment {
  text: string;
  emphasize?: boolean;
}

// MacroSnapshot.summary becomes: string | NarrativeSegment[]
```

Adapter/mock updates so the English narrative becomes structured:

```
[
  { text: "Growth remains solid at " },
  { text: "5.9%", emphasize: true },
  { text: ", driven by services and construction; inflation is easing but remains above the Central Bank's " },
  { text: "5% target", emphasize: true },
  { text: "; the external position has narrowed modestly, though remittance dependence continues to anchor the principal downside risk." }
]
```

Render `<em>` around segments with `emphasize: true`. For RU/UZ translations, translators receive the structured form; they emphasize the equivalent parts of their translations.

**2. Named-reviewer provenance line.**

Below the narrative, add a monospace meta line matching `spec_prototype.html:1457–1460`:

```
STATE NARRATIVE · drafted from DFM + QPM baseline
AI-assisted · reviewed 16 Apr · M. Usmanov
```

Extend `MacroSnapshot` with:

```typescript
export interface StateProvenance {
  drafted_from: string;          // e.g., "DFM + QPM baseline"
  ai_assisted: boolean;
  reviewed_at: string;           // e.g., "16 Apr"
  reviewer_name?: string;        // full name
}

// MacroSnapshot gains: provenance?: StateProvenance
```

If `reviewer_name` is absent, render the sentinel chip in that position.

**3. KPI contextual footnotes.**

`HeadlineMetric` currently has `delta_abs`, `delta_pct`, `direction`. Add:

```typescript
// HeadlineMetric gains:
context_note?: string;           // e.g., "70% band · 5.2 – 6.4%", or "[SME content pending]"
delta_label?: string;            // e.g., "+0.3 pp vs prior estimate", or full inline phrase
```

Mock populates `context_note` with the sentinel `"[SME content pending]"` for all 8 KPIs; Shot 2 replaces with real content.

In the KPI tile component, below the delta line:
- If `context_note` is present and not the sentinel: render per `.kpi__context` (`spec_prototype.html:519–523`).
- If `context_note` is the sentinel: render the SME-pending chip (§3.4).
- If absent: render nothing.

**4. Remove section head above KPI strip.**

Find the current `<h2>Core indicators</h2>` + helper section-head above `KpiStrip`. Remove it. The KPI strip flows directly from the state header. Prototype `spec_prototype.html:1462–1513` has no section head between state header and KPI strip.

**5. Revert delta chip-pills to inline arrow text.**

Current Codex rendering has delta as a chip-pill like `▲ +0.3`. Prototype has inline format `↑ +0.3 pp vs prior estimate` (`spec_prototype.html:1468, 1474, 1480, 1486, 1492, 1498, 1504, 1510`).

Change `KpiTile`'s delta area from a chip component to a styled text line with:
- Arrow glyph (`↑`, `↓`, `→`) from `direction`
- Delta value from `delta_abs` + unit
- Delta phrase from new `delta_label` field

If `delta_label` is present, render it directly (it's the full phrase per-indicator). If not present, fall back to a composed phrase from `delta_abs` + unit.

**Keep:**
- `CaveatPanel` component and its rendering position (below the nowcast-and-risks two-column, per existing Codex structure).
- `ReferencesFooter` component at the bottom.
- Current 8-KPI content.
- Current feed structure.

**Success criteria:**
- State narrative shows `<em>` emphasis on key numbers.
- Named-reviewer line renders below narrative with date + name (or sentinel if name absent).
- All 8 KPI tiles show a context_note line (sentinel chip in Shot 1; real content in Shot 2).
- No "Core indicators" section heading renders above the KPI strip.
- Delta line in each KPI tile renders as inline arrow-plus-text, not a chip-pill.
- CaveatPanel and ReferencesFooter still render.
- Feed still shows three vertical sections.
- Adapter test updated for new contract fields.
- No regression on existing Overview tests.

**Out of scope:**
- Changing the nowcast chart logic or Recharts wiring
- Changing the risk rail count or test-preset mapping
- Changing the quick actions count or layout
- Moving feed into horizontal columns

---

## 5. Optional file pulls from Codex reference branch

During this slice, Claude Code may cherry-pick these specific files from `codex/mvp-replatform-finish` if they align with the work. These are purely cleanup / hardening items:

- `apps/policy-ui/src/state/scenarioStore.ts` — Codex's defensive localStorage try/catch wrappers. Pure hardening, no semantic change. Pull if the current scenarioStore lacks these wrappers; skip otherwise. Verify by diffing both versions in the audit step.
- `apps/policy-ui/src/components/system/chart-label-utils.ts` — if PR #87's `toBandMeta` helper is already in epic, skip. If not, this file is a clean code-organization refactor worth pulling.

Any pull is a separate small commit: `chore(scenarios): pull defensive localStorage wrappers from codex branch` or equivalent. If you pull, name the commit and keep it isolated from page-alignment commits.

Do not pull any component, page, or contract file from Codex's branch. All page-level work in this slice is a fresh rebuild against the prototype, using Codex's data as content source only (via the explicit `git checkout` pulls named in §4.2 for Model Explorer — Knowledge Hub has no mock file to pull, per B6 adjudication).

---

## 6. Tests

Test harness on this project: Node's built-in test runner over transpiled `.test-dist`. Tests live under:
- `apps/policy-ui/tests/components/...` — component tests
- `apps/policy-ui/tests/data/adapters/...` — adapter tests
- `apps/policy-ui/tests/state/...` — state/store tests

Add or update tests in the existing folder pattern. No separate "contract shape" test harness exists; contract shape is exercised indirectly through adapter + guard tests.

**Add or update:**
- Adapter tests for Knowledge Hub, Model Explorer, Comparison — verify mock adapter produces expected shape (at `tests/data/adapters/<page>.test.ts`)
- Guard tests for any new guards (at `tests/data/adapters/<page>-guard.test.ts`)
- Component tests where behavior is non-trivial (at `tests/components/<page>/<Component>.test.tsx`):
  - Star-best-on-metric placement in `DeltaTable`
  - Sentinel chip rendering in context-note, validation-summary, trade-off-summary
  - Modal focus-trap in `SavedScenarioModal`
  - Preset-applies-to-sliders in Scenario Lab after restore
  - Suggested-next `<Link>` targets are correct routes
  - AI-attribution always renders regardless of `generation_mode`

Expected test count delta: +25 to +50. If outside that range the slice scope has probably drifted — surface in PR description.

Target: all tests pass with `npm test` from `apps/policy-ui/`.

---

## 7. Build-complete summary

When the build is complete, open the PR to `epic/replatform-execution` with a description covering all the following sections. The PR description is the primary input for Codex's review, so err toward thoroughness.

### 7.1 Required sections in PR description

**Summary.** One paragraph describing what the slice delivers.

**Pages and their status.** A per-page table or bulleted list showing which pages got which treatment (Option A / Mixed), with one line per page summarizing what's in this PR.

**Contract changes.** All additive changes to `data-contract.ts`, grouped by page section. Flag if any existing field was renamed (there should be none; flag as violation if there is).

**Shot 2 placeholders visible in UI.** Enumerate which fields across which pages render the `[SME content pending]` chip today and which editorial owner (CERR staff / @nozim) fills them in Shot 2. Include approximate string count per field.

**Dropped / reverted from Codex branch.** List things that were in `codex/mvp-replatform-finish` but are not in this PR:
- Scenario Lab horizontal-bar chart
- Scenario Lab inline saved-scenarios list
- Comparison full-panel selector
- Comparison comparative-chart panel
- Comparison per-scenario tag dropdowns
- Knowledge Hub filter dropdowns
- Knowledge Hub pulse KPI strip
- Knowledge Hub tab switcher with Literature tab
- Model Explorer 4-tab structure (now 5)
- Model Explorer neutral status chips (now severity-coded)
- Overview delta chip-pills (now inline arrow text)
- Overview "Core indicators" section head

**Kept from Codex branch.** List additions that survived:
- Overview CaveatPanel
- Overview ReferencesFooter
- Overview 8-KPI coverage
- Scenario Lab 8-assumption coverage
- Scenario Lab scenario metadata (type/description/tags) — relocated to collapsed section
- Model Explorer 6-model content
- (Knowledge Hub content seeded from prototype verbatim, not from Codex)

**Known-deferred items.** Anything in the audit that this slice did not close.

**Judgment calls made during build.** Any implementation choice that wasn't pre-specified in the prompt — e.g., how Model Explorer tabs other than Overview were implemented (scroll vs filter), how the saved-scenario modal handles empty state, any out-of-scope fix included for correctness.

**Tests.** Before/after test count, brief description of test categories added.

**Verification steps.** Sequence of manual steps Codex reviewer can run:
1. `git checkout feat/prototype-alignment-shot-1`
2. `cd apps/policy-ui && npm install && npm test`
3. `npm run dev`
4. Navigate to each of the five pages and confirm the success criteria in §4
5. Check browser console for warnings/errors
6. Change language to RU then UZ and confirm key pages render without missing-key warnings

**Screenshots.** For each page, a screenshot of the new rendering. If possible, side-by-side with prototype.

### 7.2 Review anchors for Codex three-pass

**Pass 1 — static anchors.** Codex reads PR description, then reads code against success criteria in §4.

**Pass 2 — open-ended.** Codex looks for things the prompt didn't enumerate. The PR description should flag any judgment calls Claude Code made during build that weren't pre-authorized.

**Pass 3 — runtime verification.** Codex runs the app, takes screenshots, compares to prototype. The verification steps in §7.1 drive this pass.

---

## 8. Failure modes and escape hatches

### 8.1 STOP conditions during build

Commit current progress to the branch and stop for adjudication if:

- A contract change that's not clearly additive (field renames, type narrowing, required becoming optional in a way that affects existing consumers)
- A cross-page shared component change that would break another page's behavior
- Discovery that the prototype has a design element the per-page spec didn't mention but which seems required for visual parity
- Total LOC approaching 3000+ (indicates scope creep)
- A per-page success criterion that cannot be met without exceeding scope
- A required file path turns out to be wrong (even after §2.3 verification — branch state can change)

### 8.2 Fallback if a page's work doesn't complete in this slice

If one of the five pages cannot complete within the slice window, land the completed pages as this PR and open a follow-up slice `feat/prototype-alignment-shot-1b` for the remaining page. Do not delay the entire slice to finish one page. Document the carve-out in the PR description.

### 8.3 Reference branch unavailable

If `codex/mvp-replatform-finish` is gone, Model Explorer content seed needs a different source. Surface this; do not improvise content. Fallback: supervisor or @nozim delivers content as separate input.

---

## 9. Non-negotiable conventions from prior project rules

These apply to Shot 1 as to every prior slice:

1. Read-before-write audit per slice — this is §2 above.
2. Alternating builder/reviewer — Claude Code builds, Codex reviews three-pass.
3. Amend-in-place via force-push with lease for REQUEST CHANGES outcomes.
4. Runtime verification mandatory for demo-track slices — this IS a demo-track slice.
5. Honest-over-convenient attribution — all new components carry correct data-contract references.
6. Trust surfaces stay visible to all audiences — do not add any "presentation mode" toggle to hide sentinel chips or AI-attribution.
7. ASCII in technical metadata strings; consumer-side pretty-printing for user-visible labels.

---

## 10. Start

Preconditions verified (by supervisor, before Claude Code starts):
- `feat/prototype-alignment-shot-1` branch exists off `epic/replatform-execution`
- `docs/alignment/spec_prototype.html` committed on the branch (2831 lines, ~115835 bytes)
- `docs/alignment/01_shot1_prompt.md` (this file) committed on the branch

Claude Code begins at §2 (read-before-write audit). Produce the audit document at `docs/alignment/01_shot1_audit.md` as the first commit your session makes. Push. Wait for `BUILD-READY` verdict (self-check against STOP conditions or supervisor adjudication), then proceed to §4 per-page work.

End of prompt.
