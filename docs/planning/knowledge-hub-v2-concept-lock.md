# Knowledge Hub v2 Concept Lock

Date: 2026-05-07  
Last updated: 2026-05-10 after automated official-source intake was approved
Status: implemented product-shape guardrail; active constraints remain in force
Scope: Knowledge Hub product shape, with Reform Tracker as the first production subsection

## 1. Why This Reset Exists

At the time this reset was written, Knowledge Hub was technically functional but the
product shape had drifted toward a verified-source reform package table assembled from
official pages. That infrastructure was useful, but it was not yet the intended Knowledge
Hub experience.

The intended product is a policy intelligence section for economists and policy analysts:
it should explain what reforms are, where they stand, what official evidence supports them,
what institutions are responsible, what milestones matter next, and which parts of the
policy engine they may affect.

This document locks the v2 concept and remains the product guardrail after the v2 dossier
UI implementation.

## 2. Current-State Audit

Current deployed state after the v2 dossier UI and source/methodology polish:

- 13 configured official sources.
- Daily official-source intake workflow configured for automatic publication when all gates pass.
- 4 verified source-extracted candidates retained for internal traceability.
- 4 reform packages:
  - healthcare quality, licensing, and private-sector participation;
  - urbanization, construction permits, and housing delivery;
  - agriculture financing and subsidy delivery;
  - tax administration and investment incentives.
- 0 accepted reforms.
- User-facing Reform Tracker uses a dossier desk: filter/list rail plus selected reform
  detail pane.
- User-facing subsections include Reform Tracker, Source Library, and Methodology.
- Policy Briefs and Model Impact Map remain planned states.
- Review queue and raw candidates are hidden from the visible route.

What works:

- The page is no longer a generic news feed.
- Official source links are verified before publication.
- The tracker has package-level records and dated milestones.
- Weak reports, training, cooperation news, and unusable links are filtered.
- The default Reform Tracker now reads as a reform dossier desk, not a source-intake table.
- Source Library exposes configured sources and source-check posture from artifact metadata.
- Methodology exposes rulebook rules, evidence types, caveats, and source-language boundaries.
- EN/RU/UZ shell labels are present while source-language content remains caveated.
- Official-source refresh can run automatically, but only by regenerating the static artifact
  from configured sources and passing validation before commit.

What remains incomplete:

- Package content is still thin and should become more analytically useful before external
  demo use.
- Policy implications and model relevance are shallow labels, not a useful analytical map.
- Policy Briefs and Model Impact Map are still planned, not implemented.
- There are still 0 accepted-public reforms; all visible dossiers remain static preview
  content, not externally citeable reviewed records.
- Backend/API CRUD, live ingest, external citation, accepted-public citation workflow,
  reviewed research briefs, and model-output citation remain blocked by the source/citation
  contract.

## 3. Product Definition

Knowledge Hub is the curated policy intelligence layer of the Uzbekistan Economic Policy
Engine.

It is not:

- an RSS feed;
- a ministry news mirror;
- a legal registry;
- a search engine over all official websites;
- a review queue;
- a raw AI extraction surface.

It is:

- a structured, source-backed explanation layer;
- a place to understand reforms, sources, methods, briefs, and model relevance;
- a bridge between official policy events and analytical use inside the policy engine.

## 4. Knowledge Hub Subsections

The final Knowledge Hub should have multiple subsections. Reform Tracker is only the first.

### 4.1 Reform Tracker

Purpose: track major economic policy reforms as structured dossiers.

Primary question: "What changed, where is it in implementation, and why does it matter?"

Core objects:

- Reform dossier.
- Official source event.
- Implementation milestone.
- Policy area.
- Affected institution.
- Model/economic channel relevance.

### 4.2 Policy Briefs

Purpose: store reviewed analyst-ready notes that explain reform implications, scenarios,
and policy trade-offs.

Primary question: "What should an analyst read before discussing this reform or scenario?"

Not in v2 first rebuild unless content governance is ready. It must not show AI-drafted
or unreviewed prose as final analysis.

### 4.3 Source Library

Purpose: expose the official source basis behind Knowledge Hub records.

Primary question: "Which official sources does the system rely on, and when were they last
checked?"

This is implemented as a visible subsection from artifact metadata. It should stay readable
by users. Counts and source-check posture may be shown; rejected candidates and parser internals
should remain internal unless deliberately exposed as methodology.

### 4.4 Methodology Notes

Purpose: explain definitions, inclusion rules, caveats, and how automation is used.

Primary question: "How does the system decide what is in scope and what the labels mean?"

This is implemented as a visible subsection from artifact metadata. It should be visible
enough to build trust, but it should not dominate the main workflow.

### 4.5 Model Impact Map

Purpose: connect reforms to affected model domains without overclaiming quantified effects.

Primary question: "Which model or data surface might this reform affect, and what would
need to be reviewed before simulation?"

This is not a model-output citation surface. It is a routing map for analytical work.

## 5. Reform Tracker v2 Concept

The Reform Tracker should become a small number of high-quality reform dossiers, not a large
list of extracted items.

Each dossier should answer:

1. What is the reform?
2. What official act or source proves it?
3. Which institutions are responsible?
4. What is the current implementation stage?
5. What deadlines or next steps are visible?
6. What financing, subsidy, tax, tariff, or administrative parameter is involved?
7. Which policy areas and model domains may be affected?
8. What has changed since the previous event?
9. What is uncertain, stale, or not yet reviewed?

The default page should feel like a reform desk:

- compact but not cramped;
- source-backed but not source-obsessed;
- dossier-oriented rather than table-oriented;
- clear about current stage and next milestone;
- rigorous enough for an economist to trust.

## 6. Reform Dossier Shape

Each reform dossier should have these visible sections.

### Header

- Reform title.
- Current stage.
- Last official event date.
- Responsible institution.
- Policy area.
- Source confidence.

### Short Analytical Summary

Plain-language explanation of the reform in 2-4 sentences:

- what changed;
- implementation mechanism;
- why it matters for economic policy analysis.

This summary may be template-generated from structured fields in early v2, but it must not
claim reviewer approval unless reviewed.

### Legal And Source Basis

- Primary official source.
- Source institution.
- Publication date.
- Retrieval date or generated date.
- Source type: legal act, presidential announcement, ministry implementation update,
  financing/subsidy notice, tariff/tax measure, roadmap/program update.

### Implementation Timeline

Show events as dated official milestones.

Do not overcomplicate the visible stage vocabulary. Use:

- Adopted or announced.
- Implementation started.
- Next official deadline.
- Status update.
- Superseded or corrected, only when an official source says so.

Avoid showing "delayed" unless an official source or reviewer-of-record explicitly records
delay. Delay is an interpretation, not a default automated status.

### Measures And Parameters

Show concrete levers:

- tax incentive;
- subsidy amount;
- financing amount;
- licensing rule;
- construction permit workflow;
- medical service package;
- administrative process;
- responsible agency assignment.

If no concrete lever exists, the item probably should not be a reform dossier.

### Policy And Model Relevance

Show affected analytical channels, not fake precision:

- fiscal/tax;
- public investment;
- private investment;
- household welfare;
- sectoral productivity;
- trade/customs;
- monetary/financial conditions;
- public service delivery.

Model links must be cautious:

- "May affect DFM context" is acceptable.
- "Use this in CGE" is not acceptable unless CGE is cleared and mapping reviewed.
- No model-output evidence without reviewed model artifact/version.

### Caveats

Every dossier needs an item-level caveat:

- not a legal registry;
- not live legal advice;
- official source linked;
- status is static as of the recorded source date;
- content may be source-language only unless translation is reviewed.

## 7. Automation Rules

Automation should run under the surface. It should not define the product language.

Allowed:

- fetch configured official sources;
- validate stable item URLs;
- extract source events;
- classify hard reform signals;
- group events into reform dossiers;
- propose milestones;
- produce diagnostics;
- regenerate and publish the static artifact automatically from official configured sources
  when source fetch, link verification, tests, lint, and build all pass.

Not allowed:

- show "candidate", "review queue", or parser diagnostics in the main user flow;
- auto-claim legal currentness;
- infer delays without official evidence;
- auto-generate policy recommendations;
- auto-promote AI prose to reviewed analysis;
- expose weak news as reforms.

Automatic publication guardrails:

- The scheduled workflow may publish only from `main`.
- The workflow may commit only `apps/policy-ui/public/data/knowledge-hub.json`.
- Any configured-source fetch failure blocks publication.
- Invalid or synthetic item links are blocked before artifact output.
- Policy UI lint, tests, and build must pass before the workflow commits.
- After the workflow commits, it explicitly dispatches and waits for `Validate`,
  `Deploy Pages`, and `Policy UI Hosted Smoke`, because GitHub-token pushes and
  token-dispatched workflows do not reliably chain through the normal push/workflow-run
  triggers.
- The post-commit `Validate`, `Deploy Pages`, and hosted smoke runs remain the
  deployment evidence after publication.

## 8. UI Direction

The Reform Tracker has moved away from the earlier table-first layout. The implemented v2
baseline follows this layout:

1. Top: compact institutional header with package count, latest source date, sources monitored,
   and caveat.
2. Left or top filter rail: policy area, stage, institution, source type.
3. Main list: reform dossiers as dense editorial rows/cards, each with title, stage, source date,
   responsible institution, next milestone, and policy area.
4. Detail pane: selected dossier with narrative summary, source basis, measures, timeline,
   responsible agencies, and model relevance.
5. Timeline mode: a secondary view that groups milestones by quarter/month and links each event
   back to its dossier.
6. Source Library and Methodology subsections: visible, but secondary to the Reform Tracker.

Visual style:

- institutional, editorial, data-dense;
- light paper surface;
- restrained color;
- no decorative hero;
- no large empty panels;
- no raw enum labels;
- no visible candidate/review terminology in the main page.

## 9. Data Requirements

The current artifact is close but not final.

Reform package records should support:

- `package_id`;
- `title`;
- `short_summary`;
- `policy_area`;
- `responsible_institutions`;
- `current_stage`;
- `current_stage_date`;
- `primary_source_event_id`;
- `official_source_events`;
- `implementation_milestones`;
- `measure_tracks`;
- `parameters_or_amounts`;
- `policy_channels`;
- `model_relevance`;
- `source_confidence`;
- `generated_at`;
- `as_of_date`;
- `caveat`;
- `translation_state`.

Candidate records can remain in the artifact for internal traceability, but the main UI should
not render them.

## 10. Acceptance Criteria For v2 Rebuild

The v2 Reform Tracker rebuild is accepted as implemented when:

- the default page reads as reform intelligence, not source diagnostics;
- each displayed reform has a clear dossier;
- every dossier has official source, institution, date, current stage, next milestone or explicit
  no-published-next-milestone state;
- every dossier has a concise "what changed / why it matters" summary;
- timeline events are tied to official source events;
- weak news, meetings, reports, and training are not visible as reform records;
- candidate/review-queue language is not visible in the main user flow;
- EN/RU/UZ shell labels localize, while source-language content is clearly caveated;
- mobile layout remains usable without horizontal table dependence;
- model relevance is cautious and does not cite gated models as accepted evidence.

Implementation status: the UI/product-shape criteria above are implemented on `main`.
The content-depth and model-relevance criteria remain improvement lanes, not blockers to
the v2 page shape.

## 11. Next Implementation Slices

The next work should improve dossier quality, source coverage for genuinely high-value
reforms, and analytical usefulness. Automatic intake is allowed only for official configured
sources and must remain strict enough not to reopen a generic news/RSS lane.

Scope:

- keep the current official-source artifact and package assembly;
- improve or derive `short_summary`, `parameters_or_amounts`, `policy_channels`, and source type labels where they are still thin;
- add or repair official source parsers only when they support high-value hard-reform dossiers;
- allow scheduled official-source intake to accumulate new packages automatically when all
  workflow guardrails pass;
- strengthen package grouping, milestone chronology, and next-milestone/no-published-next-milestone handling;
- keep Source Library and Methodology as artifact-metadata views, not operational admin screens;
- preserve all existing guards and link validation;
- add tests for package quality, timeline linkage, no visible candidate/review queue, and source-language caveats.

Out of scope:

- adding non-official sources;
- backend CRUD;
- live user search over source sites;
- AI-generated recommendations;
- accepted-public citation workflow;
- model-output citations;
- Policy Briefs implementation.

## 12. Decision

Keep this concept locked as the current Knowledge Hub v2 product guardrail.

If a future request asks to add more sources as a generic expansion, treat that as lower
priority unless the source is necessary to support an already chosen high-value dossier.
