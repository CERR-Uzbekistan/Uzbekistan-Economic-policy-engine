# Uzbekistan Economic Policy Engine — Audit & Sprint 1 Conversation

**Date range:** 2026-04-18 to 2026-04-20
**Participants:** Nozimjon Ortiqov (project owner) + Claude (advisor/reviewer)
**Context:** External audit of the policy engine → prototype design → React replatform execution plan → Sprint 1 execution

---

## User: audit and help me to finish the overall concept of this policy engine

https://github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine

**Date:** 18 апр.

## Claude

Excavated repository documentation to comprehend architecture and roadmap. Let me dig deeper into the key architectural docs — the ROADMAP, CLAUDE.md, and the frontend spec will tell me what's been planned vs. what's still missing.

Examined project roadmap and reviewed architectural documentation. Now let me look at CLAUDE.md (the internal architecture brief) and the open issues to see what's actually blocking progress.

Synthesizing project overview to commence comprehensive audit. Let me check the open issues (which reveal actual blockers vs. the clean roadmap) and the frontend re-platform spec.

Synthesizing repository architecture and economic model frameworks. One more — the frontend reimagining spec, since the repo has both the current static site AND an apps/policy-ui folder that looks like a new direction (React/TypeScript).

Synthesized architectural tensions and formulated comprehensive audit strategy.

I've read through the repo end-to-end — the README, ROADMAP, CLAUDE.md internal spec, the Frontend Reimagining Spec, and the open issues. Before writing anything to a file, let me tell you what I think up front, because the most important finding isn't on any one page — it's in how the documents relate to each other.

**The short version:**

This is an ambitious project with three serious strategic problems the roadmap doesn't resolve:

1. **The ROADMAP and the Frontend Reimagining Spec contradict each other.** The ROADMAP says "stay static HTML through Phase 2, vanilla JS, no framework." The Frontend Spec says "do not continue the major redesign in the current static HTML pattern — use React + TypeScript + centralized state." You've already started apps/policy-ui (the 17.9% TypeScript in the repo is the tell). One of these two docs is wrong. That has to be resolved before anything else, because it determines where every future line of code goes.

2. **The April 2026 methodology audit is buried as "Phase 1B" but it's actually first-order.** A platform selling macroeconomic credibility to the CBU and MinFin cannot ship with an inactive external-demand-shock button (QPM b3), uniform trade elasticities in the PE model (food ≠ machinery), inconsistent Phillips curve parameters between QPM and FPP, and only one model (DFM) showing uncertainty bands. These aren't "polish" — they're the difference between a research prototype and a tool a central banker will cite.

3. **The AI layer and auto-curation pipelines (Phase 3) are proposed without the trust infrastructure they require.** Auto-scraping lex.uz weekly → Claude-categorized reforms → published on a CERR-branded site, with no human-in-the-loop, is going to produce errors that look authoritative. The Frontend Spec mentions "narrative hallucination" in the risk register but doesn't solve it. You need a structured narrative contract, scenario provenance, and a review checkpoint before any AI feature ships.

I'm going to write this up as a full audit document you can drop into the repo, commit, and share with the team. Let me create it now.

Ran 2 commands, created a file, read a file.

**The audit is ready. Here are the key moves it proposes, in descending order of importance:**

**1. Resolve the charter contradiction.** Your ROADMAP says "static HTML through Phase 2"; the Frontend Reimagining Spec says "don't continue in the static HTML pattern." The presence of apps/policy-ui and 17.9% TypeScript tells me the team is already drifting toward the Spec. Formalize it. Update ROADMAP, write a one-page DECISIONS.md, commit to a stack. The two documents currently cannot both be right.

**2. Reorder the Phase 1B methodology fixes to Stage 1.** An inactive b3 button on the QPM, uniform trade elasticities in the PE model, a runBL() function mathematically inconsistent with solveIRF(), Phillips curve parameters that disagree between QPM and FPP, and only DFM showing uncertainty bands — these aren't polish. A tool pitched to the CBU dies on the first of those a reviewer notices. No AI advisor, no Knowledge Hub, no auto-curation until these are closed.

**3. Build AI guardrails before the AI layer.** Your ROADMAP Phase 3.5 has Claude auto-scraping lex.uz weekly, auto-categorizing reforms, auto-writing to shared/policy-tracker-data.js. A CERR-branded auto-published hallucination about a Presidential Decree is a real-world incident waiting to happen. Draft queues, human sign-off, structured narrative contracts, and AI-generated disclaimers need to exist before any of that runs live.

**4. Fill in the missing dimensions.** Model validation (RMSE for DFM, calibration provenance for QPM, SAM reconciliation for IO/CGE), reproducibility (header metadata on every generated data file), and scenario provenance (author/vintage/version from day one, even with only localStorage) — none of these are in the current plan and all three are cheap to add now, expensive to retrofit.

**5. Scope-cut aggressively.** The ROADMAP is ~30–40 person-months against a 4–5 person team. Academic Literature Tracker, REST API + SDK, five new macro models, backend migration, collaboration features — these are v2 at earliest. Ship the five-section IA, six hardened models, scenario save/compare, and a human-gated AI draft layer. Nothing more.

The audit also includes a proposed stage-by-stage plan (Stages 0–5 replacing the current Phase 1–4), a one-paragraph product thesis to replace the feature-list README framing, and a list of six concrete next steps before the next sprint.

Two things I'd want to hear back from you on before going deeper: (a) is the React/TypeScript direction in apps/policy-ui already a decision, or is it still exploratory? and (b) who actually uses this inside CERR today — is it live in anyone's daily workflow, or still a demo? The answer shifts what "finishing the concept" really means.

> **Artifact produced:** Audit (Document · MD)

---

## User: can you generate the prototype of how you envision such platform

**Date:** 18 апр.

## Claude

Architected multi-page prototype demonstrating unified policy intelligence platform vision.

Absolutely — this is the natural next step, and I'd rather you see the vision than keep reading about it. Before I write the code, let me pull in the design skill so the prototype actually looks like something a central bank would take seriously, rather than generic AI-tool chrome.

Architected institutional macroeconomic dashboard with typography, colors, and interactive components.

Now I'll build the prototype. A few design decisions up front, since the skill pushes me to commit rather than hedge:

**Aesthetic direction:** Editorial-institutional. Think BIS Annual Economic Report or an IMF staff paper more than a SaaS dashboard. The central bank audience responds to quiet authority, not product-design pyrotechnics. That means serif display type (Fraunces), tabular monospace for every number (IBM Plex Mono), a restrained paper/ink/teal palette, hairline rules instead of boxy cards, and motion used surgically — one stagger on section load, nothing bouncy.

**What I'm demonstrating, not decorating:**

- Navigation is the five tasks (Overview → Scenario Lab → Comparison → Model Explorer → Knowledge Hub) — not the six models. Models appear only as attribution badges on outputs.
- Scenario Lab uses the three-column Assumptions → Results → Interpretation layout from the Frontend Spec §9.2, with assumption labels in policy language ("Tariff reduction") not variable names.
- Every output carries model attribution, data vintage, and — where shown — uncertainty bands.
- EN/RU/UZ switcher wired for the UI chrome so you can see the i18n architecture working.
- A "Model caveats" block that surfaces the real Phase 1B methodology issues from your own audit — because trust through transparency is the thesis.

Created a file, ran a command, read a file.

Open prototype.html in a browser — everything works client-side, no build step. A tour of what you're looking at and why each piece is there:

**Overview.** The policymaker's page. One narrative sentence at the top (the "economic state header" from Frontend Spec §9.1A, auto-generated with data attribution), an eight-indicator KPI strip with freshness tags and context lines, a GDP nowcast chart with a 70% band (the uncertainty-visible principle), a ranked risk panel where each risk links directly to the matching Scenario Lab preset, four quick actions, and a three-column recent-updates feed. No sliders, no equations, no model names in the chrome — models appear only as small attribution badges on the chart.

**Scenario Lab.** Three columns exactly as the spec lays out. Left: assumptions grouped by policy meaning — "Policy rate change," "Currency depreciation," "Remittance flow," "Commodity price shock," "Government spending" — with technical variable names (Δi, Δs, rem, p*, ΔG/Y) shown in italics as secondary information. Five presets at the top (Baseline, Rate cut, Russia slowdown, WTO, Energy reform). Drag any slider or hit a preset — the center column's headline metrics, chart, and right-column narrative all update live. The narrative is templated, not prose-generated — it selects a mechanism block keyed to the dominant shock, which is exactly the structured-narrative-contract pattern the audit insisted on. Note the yellow-dot "AI-assisted · Not CERR-attributed · Review before citing" line — that's the liability guardrail made visible.

**Comparison.** Three pre-loaded scenarios (Baseline, Fiscal consolidation, Russia slowdown) with a clean delta matrix. Best-on-metric gets a star rather than a color bomb. The trade-off summary at the bottom is written in editorial prose, not bullet points — it's designed to be the paragraph a policymaker lifts directly into a memo.

**Model Explorer.** The catalog shows all six models with honest status badges — QPM flagged "2 known fixes," PE flagged "Critical fix," CGE flagged "Gap: labor block," FPP flagged "CA exogenous." The expanded QPM detail shows the four core equations rendered as styled HTML (italic serif variables), a parameter table where the inactive b₃ external-demand term is explicitly marked with the issue number (#23), and a caveats list that reproduces the Phase 1B audit findings from your own ROADMAP. This is the trust-through-transparency thesis made concrete: a reviewer from the IMF can open this page and see exactly what works and what doesn't.

**Knowledge Hub.** Reform tracker as a vertical timeline with model attribution pills, and a research-brief list with author attribution (one of the four briefs is labeled "AI-drafted · reviewed by CERR Trade Desk" — again, the guardrail is in the UI, not in a policy doc).

**Cross-cutting details that demonstrate the concept:**

- Language switcher works for the UI chrome (nav, page titles, subtitles) across EN/RU/UZ. This shows the architecture — content stays in the authoritative language, chrome translates.
- Every output carries model attribution (the QPM, DFM, PE badges). Models are second-class in the IA, first-class in the data lineage.
- Every number is tabular-monospace. Every caveat is a visible UI element, not a footnote.
- The footer carries a visible "Illustrative prototype · figures for demonstration only · not for policy use" caveat — because this is what the production version should carry during any phase where data freshness isn't guaranteed.

**What I deliberately didn't build:**

- Real model math. The Scenario Lab sliders drive a toy impulse-response kernel (exponential decay, peak at quarter 4) — enough to show the interaction pattern works, but you wouldn't run actual policy against it. The real QPM/FPP engines live on the server side in your R code.
- Full i18n of body content. Translating every paragraph in the prototype would be 800+ strings of busywork that demonstrates nothing new; the chrome switcher is enough to prove the wiring.
- Export (PDF/CSV) — the buttons exist, the flows don't. Same reasoning.
- A fake backend. Saved scenarios use localStorage in production; the prototype just alerts to show the flow.

Two things to note as you open it:

- If you want to see the full polish, view it at 1400px+ width. Below 1100px the layout collapses gracefully but loses the three-column Scenario Lab, which is the page that most shows the conceptual shift.
- The fonts load from Google Fonts — if the page looks bare for a second on first load, that's the swap.

If any of the five sections feels off — too dense, too sparse, wrong tone, wrong hierarchy — tell me which one and I'll tune it. The architecture is the point; the specific visual execution is a starting position, not a destination.

> **Artifacts produced:** Prototype (Code · HTML), Audit (Document · MD)

---

## User: This is what we have now policy-ui review it against your vision and

**Date:** 18 апр.

## Claude

Excavating common Next.js files from policy-ui directory. Understood — you want me to look at apps/policy-ui (the React/TypeScript direction I flagged in the audit) and compare it to the prototype I just built. Let me pull it up.

Verifying folder accessibility through prior search results. Let me try fetching likely files directly via GitHub's blob path (which worked for the other docs).

Diagnosed access limitations and strategized information-gathering approach.

Two things blocking me from a real review, and one quick note:

1. **My fetcher can't see into apps/policy-ui.** GitHub's tree/directory views are disallowed by robots, and the raw-file fetches only work if the URL appeared in prior results. The folder itself was listed when I fetched the root repo page, but I can't walk into it from here.

2. **Your last message got cut off.** It ended with "review it against your vision and" — so I don't know what came after the and. If you had a specific comparison axis in mind (architecture? design? scope? methodology surfaces?), tell me which one, because my default would be all of them and that's not always what people want.

**What I need from you to do this properly:**

The minimum useful bundle — paste each into the chat, or drop them as files:

- `apps/policy-ui/package.json` — tells me the stack (React/Next/Vite, state lib, UI lib, chart lib, i18n) in one file
- The directory tree — `ls -R apps/policy-ui` or the output of `tree -L 3 -I node_modules apps/policy-ui`, so I can see what pages and components exist
- The top-level layout file (likely `app/layout.tsx`, `src/App.tsx`, or `src/routes/root.tsx` — whichever the structure uses)
- One representative page or two — ideally whichever of Overview / Scenario Lab / Comparison you've built furthest, because that's where the real decisions live
- Any `README.md` inside `apps/policy-ui/` if it exists
- The `docs/frontend-replatform/` contents too, if there's anything there — that was in the root listing but I couldn't reach it either

If that's a lot of pasting, the single most useful file is `package.json` + the tree. With those two I can tell you within five minutes whether the architecture matches what the Frontend Reimagining Spec called for, and where it's drifting.

Alternatively: if the repo has a deployed preview (Vercel, GitHub Pages, Netlify), just drop the URL — I can fetch live pages and that's often richer than reading source.

**Which route is easiest for you?**

---

## User: yes you may find here https://github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine

**Date:** 18 апр.

## Claude

Grappling with robot-blocked URLs and inaccessible blob paths. Let me try fetching directly now that you've re-authorized access.

Analyzing deployed site's architecture and features. The tree URL is still robots-blocked, and the blob URLs inside `apps/policy-ui/` don't appear anywhere I can reach them, so GitHub isn't going to let me walk in. Before I give up and ask you to paste, one more probe — you have a live deployed site listed on the repo. Let me check if it's the old static build or if policy-ui is published somewhere.

Excavated live deployment, recalibrated audit findings, identified architectural gaps.

Good — the deployed site came through and it changes my picture materially. I still can't walk into apps/policy-ui from the fetcher (GitHub's tree URLs are hard-blocked by robots), but the live site at cerr-uzbekistan.github.io/... gave me real ground truth instead of just reading docs. Let me tell you what I actually see, because several things in my earlier audit were out of date.

### What the team has actually shipped (that the README doesn't advertise)

Reading the deployed product, this is considerably more advanced than I'd concluded from the ROADMAP alone:

- **Macro snapshot with current data.** GDP 2025 at 7.7%, DFM nowcast at 7.01% for 2026Q1, CBU policy rate at 14%, inflation at 7.3%. My prototype's numbers were plausible-looking but meaningfully wrong — the team is doing the data maintenance properly. That's a concern I should retract from the audit's data-governance section.
- **International Organizations comparison page.** IMF Art. IV Apr 2026, World Bank Apr 2026, EBRD Mar 2026, ADB — side-by-side GDP/inflation/CA/fiscal/debt forecasts with source attribution. This is a genuine differentiator I didn't know existed and that my prototype didn't address. Treat it as a fifth must-have, because it's the exact kind of "institutional embedding" advantage I argued is the real moat.
- **Cross-Model Synthesis (Phase 1 Demo), labeled NEW.** "One shock propagates through PE → IO → CGE → FPP using a shared parameter registry. Reconciliation flags cross-model disagreement." This is the single hardest item on the ROADMAP (Phase 2.2), it's in flight, and the shared-parameter-registry language means someone has already solved the contract problem my audit was worried about. Good.
- **AI Policy Advisor with provider choice (Anthropic / OpenAI)** and a template fallback when no API key is set. "No API key configured — template-based analysis will be used." That template-fallback pattern is exactly the guardrail I asked for in the audit — the responsible default is already wired.
- **Model Parameter Explorer and Methodology.** Already built, with full equations, calibrated values, and structural justifications. On the QPM/FPP Phillips-curve divergence I flagged as a "must reconcile" issue: the methodology page documents λ₂ = 0.70 (imported inflation) as a deliberate open-economy CAEM choice, distinct from QPM's closed-form (a₁ = 0.60). It's a documented structural decision, not a bug. I need to downgrade that item from "severe cross-model inconsistency" to "fine, documented." My audit was too quick there.
- **Policy Intelligence Feed (lex.uz + IO assessments), Research & Analysis, Academic Literature** — all built.

**Net:** the team is materially further along than the ROADMAP reads. Large parts of what I treated as "Phase 2.5" and "Phase 3" are live or in flight.

### Where the live deployment still diverges from the Frontend Reimagining Spec

This is the part where your own Spec is absolutely right, and the deployed surface hasn't yet caught up. Counting the left sidebar on the live site:

Overview · Home · Int'l Organizations · Compare Scenarios · Synthesis · QPM · DFM · PE · IO · CGE · FPP · AI Advisor · Methodology · Model Explorer · Policy Tracker · Research · Literature

That's 17 nav items, with the six models occupying their own top-level section. The Spec's §7 prescription is exactly five: Overview, Scenario Lab, Comparison, Model Explorer, Knowledge Hub — with models demoted to second-class. The live site is the "six-models-in-a-website" artifact that the Spec explicitly diagnoses and wants to replace. Three concrete symptoms:

- **No Scenario Lab.** The work of "define a shock in policy language → run → interpret" happens per-model, which is exactly the fragmentation the Spec is trying to end.
- **Emoji icons everywhere** (🏛️ 📈 🔮 ⚖️ 🔗 ⚙️ 💰). That is the opposite of the institutional tone the Spec calls for (§11: "institutional, restrained, clear, modern but not trendy, authoritative"). Emoji say "SaaS product," not "central-bank tool." Low-cost, high-impact fix.
- **Models appear as first-class nav, not as attribution badges on outputs.** The Spec §7.2 is specific about this and the live site doesn't obey it.

These aren't criticisms of the engineering — they're the symptoms of the architectural schism I called out in the audit. Which brings us to apps/policy-ui.

### On apps/policy-ui specifically — what I can infer and what I still need

The tree view is robots-blocked and blob URLs inside it don't appear in any fetchable listing. But the indirect evidence is strong:

- 17.9% of the repo is TypeScript, and none of it is in the legacy static surface I can see.
- The live deployment is clearly the legacy path; apps/policy-ui must be the React/TS rebuild.
- The existence of `docs/frontend-replatform/` (also tree-blocked) suggests there are dedicated design notes for the migration.
- The Frontend Reimagining Spec (committed April 2026) and apps/policy-ui exist in parallel — so the Spec is almost certainly the charter for that folder.

If that's right, then apps/policy-ui is probably aiming at exactly the prototype I delivered: five-section IA, models-as-adapters, shared output schema, institutional tone. But I can't confirm whether it's achieving that until I see the code.

The smallest useful bundle to let me finish the review — paste any of these directly into chat, or drop them as files:

- `apps/policy-ui/package.json` — tells me the stack (Next/Vite/Remix, Zustand/Redux, Tailwind/styled, Recharts/Tremor/ECharts, next-intl/react-i18next) in one glance
- `ls apps/policy-ui` or a tree one level deep — I need the top-level layout (`src/app/`, `src/routes/`, `src/pages/`, `src/components/`)
- One page file — ideally Overview or Scenario Lab, whichever is furthest along
- Whatever's inside `docs/frontend-replatform/` — probably the highest-signal documents in the whole repo

If any of that is awkward to paste, here's the single most efficient alternative:

```bash
cd apps/policy-ui
tree -L 3 -I 'node_modules|dist|.next' > /tmp/tree.txt
cat package.json tree.txt src/app/layout.tsx src/app/page.tsx > /tmp/bundle.txt
```

and paste `bundle.txt`. That's ~200–500 lines and gives me everything I need.

**One thing I can do right now without waiting:** update the audit to reflect the live-deployment reality I didn't have before — the retractions on data governance, on QPM/FPP Phillips reconciliation, the new credit for the Synthesis work, and a sharper framing of what apps/policy-ui is actually for (the embodiment of the Spec, not a parallel experiment). Want me to produce that AUDIT-v2.md now, or wait until I've seen the policy-ui code so I can do both updates in one pass?

---

## User: you may find here https://github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine/tree/main/apps/policy-ui

**Date:** 18 апр.

## Claude

Circumventing robots.txt restrictions, pivoting toward individual blob URLs. You've given me the URL directly — let me try again.

Strategized alternative access methods bypassing repository restrictions. The robots wall stays up regardless of who provides the URL. But I have bash access and github.com is in my allowed network list — let me just clone it.

Gained repository access and commenced structural exploration. I'm in. Let me walk through the structure.

Appraising data contract architecture and provenance tracking. This is not what I expected. The tree alone already tells me this is a serious, disciplined architecture — five pages mapping exactly to the Frontend Spec, a `contracts/` layer, per-page data adapters with schema guards, and real tests. Let me read the high-signal files.

Identified internationalization gap and scaffolding readiness.

### What's actually in apps/policy-ui

**Stack:** React 19 + TypeScript 6 + Vite 8 + react-router 7. No Tailwind, no CSS-in-JS, no UI library, no chart library yet. Vanilla CSS with design tokens. 63 source files, ~3,000 lines in the data layer alone. 8 test files with actual assertions.

**Structure (precise):**

```
src/
  app/router.tsx          + shell/AppShell.tsx + shell/nav.ts
  pages/                  OverviewPage · ScenarioLabPage · ComparisonPage · ModelExplorerPage · KnowledgeHubPage
  components/overview/    5 components
  components/scenario-lab/ Assumptions · Results · Interpretation
  components/comparison/  Selector · HeadlineTable · ChartPanel · TradeoffSummary
  components/layout/      PageContainer · PageHeader
  components/system/      LanguageSwitcher
  contracts/data-contract.ts       ← the schema
  data/<page>/source.ts + live-client.ts
  data/adapters/<page>.ts + <page>-guard.ts
  data/mock/<page>.ts
  data/raw/<page>-live.ts
  data/source-state.ts            ← shared state-machine helpers
  state/language-{context,provider,useLanguage}
  styles/tokens.css + base.css
```

### The verdict

This is a serious piece of work. Set aside the audit I wrote — several things I flagged as missing or unsolved are already solved here, and in some places the architecture is better than what I proposed. Concretely:

**1. The five-section IA is exactly the Frontend Spec.** Router, nav, AppShell all enforce Overview / Scenario Lab / Comparison / Model Explorer / Knowledge Hub. Models are not top-level. The "six-models-in-a-website" identity is gone on this surface.

**2. contracts/data-contract.ts is the artifact my audit said was non-negotiable, and it's stronger than what I sketched.**

- Every HeadlineMetric carries ModelAttribution with version, run_id, data_version, timestamp. Provenance is baked into the type system, not bolted on later.
- UncertaintyBand.is_illustrative: boolean — forces the "empirical vs illustrative band" honesty to be a required field.
- NarrativeBlock.generation_mode: 'template' | 'assisted' — AI-narrative attribution is a first-class concept. This is the exact guardrail my audit §5.4 was asking for, already encoded in the schema.
- CaveatSeverity: 'info' | 'warning' | 'critical' and Caveat explicitly linked to affected_metrics / affected_models.
- ApiError schema matches Frontend Spec §27.3 exactly.

**3. The data layer is overengineered in a good way.** Raw payload → guard (schema validator with path-level issues, distinguishing warnings from errors) → adapter (transforms to domain type with fallbacks for missing fields) → source (orchestrates, mode-switches between `VITE_*_DATA_MODE=mock|live`) → live-client (typed transport errors for http/timeout/network with abort controllers). Each page can flip to live data independently; dev-only guard warnings are logged to console; production degrades gracefully. This is the contract versioning story my audit §6.1 Stage 0 asked for, already built.

**4. Accessibility is defaulted, not bolted on.** Skip-link, aria-live on loading/error states, role="alert" on errors, role="tablist" + aria-selected on tabs, aria-labelledby on sections, proper focus rings via :focus-visible. This is rare to find this early.

**5. Scenario Lab state machine is thoughtful.** Separate "last run" vs "current edits" state with a "stale results" banner ("Results reflect the previous run. Run scenario to update with current assumptions."). Run-id tracking to drop stale responses. Preset reconciliation when the workspace schema changes. Silent mount-time initial run.

**6. Tests exist and test what matters.** The overview adapter test covers happy path + fallback defaults + invalid enum normalization. That's exactly the shape a guard-layer test should take.

### Where apps/policy-ui diverges from my prototype — and who's right

Several of these are cases where my prototype was wrong and policy-ui is correct. Specifically:

| Dimension | My prototype | policy-ui | Who's right |
|-----------|--------------|-----------|-------------|
| Navigation layout | Top-bar horizontal nav | Left-sidebar with eyebrow + title | policy-ui. Institutional tools live in left-rail navigation, not SaaS-style top bars. |
| Data architecture | Hardcoded JS objects | Contract → raw → guard → adapter → source → page | policy-ui, decisively. Mine would have to be rebuilt to integrate real models; theirs is ready. |
| Error/loading states | Not addressed | First-class `loading/ready/error/empty` machine per page with aria-live and retry | policy-ui. |
| Uncertainty semantics | Visual only | Typed: is_illustrative flag forces honesty | policy-ui. |
| AI narrative attribution | A yellow banner I drew | Typed: `generation_mode: 'template'/'assisted'` required on every NarrativeBlock | policy-ui. |
| Scenario Lab controls | Sliders in policy groups | Number inputs + advanced toggle + `<details>` for advanced | Split. Sliders read better for sensitivity analysis; number inputs are better for precision. They should add sliders as a visual layer on top of the number input (don't replace). |
| Assumption technical names | Shown inline by default | Hidden behind "Show technical variable names" checkbox | policy-ui. Progressive disclosure is the right call for non-analyst users. |
| Institutional type aesthetic | Fraunces serif + IBM Plex | Source Sans 3 throughout | Mine is stronger. Serif display type carries more institutional weight; Source Sans 3 is a decent functional choice but reads SaaS. Worth considering a display serif for page titles only. |

### What's genuinely incomplete — the real gap list

**1. i18n is scaffolding, not i18n.** LanguageProvider holds a language code, the switcher changes it, and nothing consumes it. Every string in every component is hardcoded English. This is fine as a placeholder but needs react-i18next or equivalent plus a translations directory before any non-English user sees it. This is the biggest visible gap between ambition and delivery.

**2. Knowledge Hub is a one-line stub.** Literally `<div className="placeholder-card">Knowledge Hub v1 scaffold</div>`. Given that the live static site already has Policy Tracker, Research, Literature, and Model Explorer sections with real content, porting that content into the new shell is the obvious next piece of work.

**3. No charts anywhere yet.** Zero chart library. The ChartSpec in the data contract describes axes, series, semantic roles, uncertainty bands — but nothing renders them. The NowcastForecastBlock and ComparisonChartPanel components exist but (unless I missed something in the files I didn't open) render the spec as text or table, not graphics. This is the single highest-leverage missing piece for the product feel. Recharts or ECharts would drop in cleanly given the schema.

**4. No real model integration.** Mock data everywhere; live-client.ts files assume `/api/overview`, `/api/scenario-lab`, etc. There is no server. The R models still live in the legacy static surface. Bridging to them (MCP server? a thin FastAPI? the synthesis registry already on the live site?) is the biggest question not answered anywhere I looked.

**5. "Save scenario" is a toast, not a save.** handleSaveScenario just sets a status message with a timestamp. No localStorage, no provenance capture, nothing round-trippable — despite the Scenario type in the contract being fully specified with created_by, created_at, updated_at, assumptions[], model_ids[]. The schema is ready; the persistence is not.

**6. Compare Scenarios flow is orphaned.** The Comparison page has a ScenarioSelectorPanel — but there is no way to produce a saved scenario in Scenario Lab that the Comparison page can then read. The two pages don't share a store yet.

**7. No explicit design system documentation.** The tokens are there (spacing, radii, colors, sidebar width), but there's no tokens.md or Storybook or component gallery explaining semantic colors (baseline/alternative/downside/upside), chart color rules, typography scale, or when to use which chip variant. For a 4–5 person team this will start to hurt around the sixth component.

**8. Legacy static site is still the deployed product.** cerr-uzbekistan.github.io/... serves the 17-item-sidebar version. apps/policy-ui isn't deployed anywhere I could reach. The architectural decision in my audit's §3 has been made in code, but the public face of the project hasn't caught up.

### Recommended sequencing for apps/policy-ui → v1

Given the shape of what exists, the correct next moves in order:

1. Pick a chart library and render the existing ChartSpec specs. Recharts is the lowest-friction match for React 19. Two days of work, massive perceived-progress jump.
2. Wire scenario persistence (localStorage is fine) with full provenance from the Scenario type. A day. Unlocks Comparison end-to-end.
3. Make Comparison read from the scenario store. Half a day after #2.
4. Add react-i18next + translation files for EN/RU/UZ chrome. Content stays English for now, nav and shell translate. One to two days.
5. Port Knowledge Hub content from the legacy site. Reform tracker + research briefs + literature index. The data already exists in the legacy codebase; transform it to match the contract and drop it in. Two to three days.
6. Decide on the model bridge. This is the strategic fork: does a thin backend appear (FastAPI wrapping the R code), does the synthesis/ work become the API layer, or does the legacy static model JS get imported as modules into policy-ui? This question has to be answered before "real" data flows. Propose a meeting, not a ticket.
7. Add one or two serif display elements (titles only). Newsreader or Source Serif 4 for h1/h2 only, keep Source Sans 3 body. Raises the institutional register without disrupting the system.
8. Deploy a preview. Even behind a password. Get it in front of CERR staff for reactions before adding more.

**Defer past v1:** AI Policy Advisor (the schema is ready; the review-queue workflow is not trivial), auto-curation pipelines, cross-model synthesis UI (the backend already does this — surface it last).

### Retractions from my earlier audit

Several things I wrote are now wrong and I want to mark them explicitly:

- **Audit §3 ("unresolved architectural schism"):** The schism is resolved in code. apps/policy-ui is the Frontend Spec. The open question is deployment and migration schedule, not direction.
- **Audit §5.1 ("no validation protocol"):** The contract-guard layer partially addresses this at the data level. Model-level backtesting is still missing, but the input-validation case is covered.
- **Audit §4.4 on the Phillips-curve divergence ("must reconcile"):** As I noted in the previous message, this is documented as a deliberate structural choice (CAEM λ₂ = 0.70 for imported-inflation dominance in an open economy vs. QPM closed-form). Downgrade from "severe" to "fine, documented."
- **Audit §5.4 on AI guardrails:** The NarrativeBlock.generation_mode field is exactly the kind of type-level guardrail I wanted, and it already exists. The remaining work is UI treatment when generation_mode === 'assisted', not architecture.

Want me to write a consolidated AUDIT-v2.md that folds the live-site findings and this apps/policy-ui review into one document — with the corrected stage plan, the gap list above reframed as prioritized issues, and the retractions made explicit? That would be the most useful artifact to commit into the repo alongside the Frontend Reimagining Spec. I can produce it in the same editorial register as the first audit.

---

## User: Continue

**Date:** 18 апр.

## Claude

Strategized comprehensive audit revision with targeted documentation review. Before I write v2, let me close a couple of loops — I sparse-checked out docs/frontend-replatform/ and shared/ earlier but never read them, and I want to see ComparisonPage.tsx end-to-end so the audit isn't guessing.

Reassessed project maturity and recalibrated audit strategy accordingly. The replatform docs change the picture again — the team marked the branch release-ready for stakeholder demo today (2026-04-18). They've already done most of what v1 was pushing for. This means v2 isn't "here's what to fix" — it's "here's what you've already nailed, here's the gap list you haven't caught yet, here are the strategic decisions that remain past MVP." Let me write it in that register.

Created a file, ran a command, read a file.

AUDIT-v2.md is ready — 231 lines, different register from v1 because the situation is different.

**What v2 actually says, compressed:**

The team is at MVP-complete-for-stakeholder-demo as of today (2026-04-18, per 08_release_readiness.md), which most of v1 didn't know. That changes the audit from "here's what to build" to "here's what you've already nailed, here's the gap list you haven't caught yet, here are the strategic calls that still need making past MVP."

**The structure of v2:**

1. **Retractions from v1.** The charter schism is resolved (apps/policy-ui executes the Frontend Spec). The Phillips curve parameter issue is a documented structural choice, not a bug. The AI guardrail is in the type system already (NarrativeBlock.generation_mode). Data governance is about formalization, not competence.

2. **What v1 got right that survives.** The product thesis. The three methodology priorities still open in R (QPM b₃, PE elasticities, FPP CA). The competitive-moat reframing. The "each section unapologetic about its user" argument.

3. **Functional assessment of apps/policy-ui.** Point-by-point: architecture (strong), data layer (overengineered in the good way — five-stage raw → guard → adapter → source → client pipeline with per-page mock/live switching), accessibility (defaulted, not bolted on), state discipline (the Scenario Lab stale-results tracking is especially good), testing (real), design system (present, underspecified).

4. **Four gaps the team's own docs don't name** — this is where v2 earns its keep, because 07_selective_integration_mvp_status.md and 08_release_readiness.md name five honest hardening items but miss these four:
   - i18n is scaffolding only (LanguageProvider holds state; nothing consumes it; every string hardcoded English). Biggest visible gap.
   - No chart library integrated (ChartSpec in contract, nothing rendering it). Two-day fix with Recharts.
   - Scenario persistence doesn't exist ("save" is a toast with a timestamp; Comparison is orphaned because there's no store to select from). One-day fix with localStorage.
   - Legacy-site sunset plan unwritten (cerr-uzbekistan.github.io still serves the 17-item-sidebar version; policy-ui isn't publicly deployed anywhere).

5. **Four strategic decisions nobody has made yet** — beyond MVP:
   - Model bridge (R → web): thin FastAPI, extend the shared/ registry, or port math to TS. The shared/synth-engines.js hints at option C but isn't committed. Recommend option B (nightly R → JSON → static files) for the internal demo phase.
   - AI advisor review workflow. Schema supports it; review queue, approval mechanics, audit log, disclaimer-stripping semantics don't exist anywhere. One-page docs/ai-governance.md needed before any AI ships.
   - Deployment topology decision forces itself in ~60 days. Every week without committing to (a) mock-only public, (b) real data via bridge, (c) legacy-stays-primary is a silent commitment to (c).
   - No named internal users. Without three specific people at CERR/CBU/MinFin trying the build this month, product decisions will be made on abstract merit. Everything in the roadmap should reprioritize against what they actually do.

6. **A two-week sequence after the stakeholder demo**: charts, i18n, persistence, sunset plan, bridge decision, AI governance, pilot users, display serif. Explicitly excludes new features, new pages, Knowledge Hub content port, new models, auto-curation, REST API, auth — all Stage 4+.

**The one line that matters most:** the team wrote its own honest caveat list before anyone audited them. That's the rarest thing in software and the only durable predictor of whether a project reaches its ambitions. Most of what remains isn't repair work — it's the continuation of a habit the team has already demonstrated.

On the prototype and v1: I'd leave them in the repo as docs/external-review/ artifacts rather than deleting them. v1 captures the arguments for positions that are still right (the institutional moat, the three methodology gates, the product thesis). The prototype demonstrates some choices apps/policy-ui could still borrow — the sidebar-with-display-serif aesthetic, specifically. v2 is the current-truth document; v1 and the prototype are the reasoning audit trail.

Two things that would make the next pass sharper:

- If you point me at the preview deployment of apps/policy-ui once it's live (even password-protected), I can do a proper interaction review rather than a source review.
- If you share which of the four §6 strategic decisions feels hardest internally, I can write that one up as a dedicated decision memo rather than a three-paragraph summary.

> **Artifacts produced:** Audit v2 (Document · MD), Audit (Document · MD), Prototype (Code · HTML)

---

*[Conversation continues with plan review, Phase 0 readiness pass, Sprint 1 slice execution (TA-1a i18n, TA-1b editorial polish, TA-2 ChartRenderer, TA-3 scenario store, TA-4 Overview enrichment), Track B governance decisions (TB-P3 AI governance adopted, TB-P2 Option B model bridge adopted, TB-P4 and TB-P1 deferred), and parallel dispatch of TA-5 to Codex + QPM R export to Claude Code. Final events: Claude Code completed QPM export cleanly on feat/sprint2-bridge-qpm-export at commit a16bad6; Codex began TA-5 but got branch-confused because both agents shared a working directory. Last exchange: Claude instructed user to paste Option 2 response to Codex — git-stash the TA-5 changes, switch to feat/sprint1-ta-5-scenario-lab-enrichment, pop, verify, commit, push.]*

---

## Key artifacts and state at conversation end (2026-04-20)

### Merged to epic/replatform-execution
- PR #57: Phase 0 execution plan + readiness checklist
- PR #58: TA-1a i18n plumbing (react-i18next, 62 translation keys × 3 locales)
- PR #59: TA-1b editorial polish (IBM Plex Serif h1/h2, AttributionBadge, PageHeader meta slot)
- PR #62: TA-2 ChartRenderer (Recharts, semantic role colors, uncertainty bands with is_illustrative honesty, ComposedChart for bands)
- PR #63: Phase 0 drift findings logged into TA-4/5/6/7 scope
- PR #64: TA-3 scenario store (localStorage + full provenance + useSyncExternalStore pattern)
- PR #65: TA-4 Overview enrichment (economic state provenance line, 3 feed blocks, Test→ risk buttons, qa-kind kickers, topbar freshness, page-header meta)
- PR #66: TB-P3 AI governance adopted (all six decisions signed off)
- PR #67: TB-P2 model bridge — Option B adopted
- PR #68: TB-P4 and TB-P1 deferral decisions recorded

### On branches, not yet merged
- `feat/sprint2-bridge-qpm-export` at a16bad6 — Claude Code's QPM export script + qpm.json sample output. Sprint 2 infrastructure; waits for consumer wiring.
- `feat/sprint1-ta-5-scenario-lab-enrichment` — Codex in progress, branch confusion mid-work, Option 2 instruction just sent.

### Governance decisions (adopted)
- **TB-P3 AI governance:** NarrativeGenerationMode = 'template' | 'assisted' | 'reviewed'. NarrativeBlock gains reviewer_name? and reviewed_at?. Disclaimer copy verbatim-locked. No assisted-mode UI ships until this is signed (adopted).
- **TB-P2 model bridge:** Option B — nightly R→JSON via GitHub Actions. Timeline: QPM + DFM by 2026-05-08, remaining four by 2026-05-22. Bridge-live fallback to Option A if static JSON proves inadequate.
- **TB-P1 deployment:** DEFERRED. Localhost development; GitHub Pages subpath when a consumer emerges.
- **TB-P4 pilot users:** DEFERRED to Sprint 3+ pending additional headcount. Mitigation: opportunistic informal review before Sprint 2 closes.

### Pending decisions before Sprint 2 wiring
- `shocks_applied.s_shock` unit convention — 10 (percent) vs 0.10 (log-decimal). Consumer UI needs this locked before exposing shock inputs.
- QPM export's baseline overshoot below steady state targets — flagged, not hidden, needs modelling reviewer attention.
- Hard-coded Q1 2026 ER anchor in QPM export — should it be driven from a config vs hard-coded?

### Workflow conventions established
- Codex builds each TA/TB slice; Claude reviews; user verifies rendered output via screenshots + DOM inspection before merge.
- Every slice prompt includes a PROTOTYPE ALIGNMENT (non-negotiable) section with specific class names and spec_prototype.html line references.
- Branches: main → epic/replatform-execution → feat/sprint1-ta-Nx-* → merge back to epic.
- Parallel agents need separate working directories — proven by TA-5 branch-confusion incident on 2026-04-20.
- useSyncExternalStore subscriptions require module-level memoized snapshot (reference-stable until actual mutation) — proven by TA-3 infinite-loop bug.
