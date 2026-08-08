# Uzbekistan Economic Policy Engine — Frontend Reimagining Spec

## 1. Purpose

Rebuild the frontend from first principles so the platform feels like a coherent, institutional-grade **policy analysis workspace**, not a collection of disconnected model demos.

The new frontend must serve three realities at once:

1. **Decision-makers** need a fast answer: what is happening, what changed, and what it means.
2. **Analysts** need a structured place to build, test, compare, and explain scenarios.
3. **Technical users** need access to model assumptions, equations, parameter logic, and methodological detail.

The current frontend over-indexes on the third reality and under-serves the first two.

---

## 2. Product Positioning

### What the platform is
A web-based macro-policy analysis workspace for Uzbekistan that helps users:
- monitor the economy,
- build policy scenarios,
- compare their consequences across models,
- and communicate findings in decision-ready form.

### What the platform is not
- Not a static dashboard site.
- Not a model museum.
- Not a documentation portal with charts.
- Not an AI gimmick layer over disconnected pages.

### Core product idea
The platform should be organized around the job:

**"Help me move from economic question → scenario → quantified impact → explanation."**

Not around:

**"Choose which model page to open first."**

---

## 3. Users

## 3.1 Primary users

### A. Policy analyst at CERR / government unit
Needs to:
- test structured policy shocks,
- compare scenarios,
- understand trade-offs,
- export clean charts and policy notes,
- explain outputs to non-technical superiors.

### B. Senior policymaker / manager
Needs to:
- get the latest macro picture quickly,
- understand key risks and revisions,
- see headline scenario implications,
- avoid technical overload.

### C. Research / technical user
Needs to:
- inspect assumptions,
- review methodology,
- access model-specific logic,
- verify what drives the outputs.

## 3.2 Secondary users
- international organizations,
- academic collaborators,
- internal trainees / junior researchers,
- external observers if public version is later launched.

---

## 4. Jobs To Be Done

The frontend should be optimized for these top jobs:

1. **Understand the current macroeconomic situation.**
2. **Create a scenario in plain policy terms.**
3. **See which indicators move, by how much, and why.**
4. **Compare multiple scenarios side by side.**
5. **Translate model outputs into a clear policy message.**
6. **Drill down into model mechanics only when needed.**

Everything in the frontend should support one of these jobs.

---

## 5. Product Principles

### Principle 1: Task-first, not model-first
Users start with a question, not a model tab.

### Principle 2: One platform, one visual language
All model outputs should feel like parts of the same system.

### Principle 3: Progressive disclosure
Show the minimum needed first. Let expert depth appear only when requested.

### Principle 4: Executive clarity over technical performance
The first screen should answer “what does this mean?” before “how was it calculated?”

### Principle 5: Comparison is the center of value
Single-model simulation is useful. Cross-scenario comparison is what makes the platform strategically important.

### Principle 6: Interpretation is part of the product
Charts without explanation are incomplete.

### Principle 7: Institutional trust matters
The UI should feel serious, calm, transparent, and precise.

---

## 6. Product Architecture

The new frontend should be reorganized into five main sections.

## 6.1 Overview
Purpose: give the user a fast, coherent picture of where the economy stands right now.

Core questions answered:
- What is happening now?
- What changed recently?
- Where are the main risks?
- What should I explore next?

## 6.2 Scenario Lab
Purpose: main working area for defining assumptions and running scenarios.

Core questions answered:
- What policy or shock do I want to test?
- Which channels matter?
- What changes under this scenario?

## 6.3 Comparison
Purpose: side-by-side comparison of baseline and alternative scenarios.

Core questions answered:
- Which scenario performs better on which metrics?
- What are the trade-offs?
- Which results are robust and which are uncertain?

## 6.4 Model Explorer
Purpose: expert zone for assumptions, equations, calibration, methodology, and model-specific detail.

Core questions answered:
- What is inside each model?
- Which parameters drive the result?
- What is the methodological caveat?

## 6.5 Knowledge Hub
Purpose: connect scenarios to reforms, briefs, literature, and research context.

Core questions answered:
- Which reforms are relevant?
- What does the literature say?
- What prior analysis already exists?

---

## 7. Navigation System

## 7.1 Primary navigation
Top or left navigation should show only:
- Overview
- Scenario Lab
- Comparison
- Model Explorer
- Knowledge Hub

Not the six models.

## 7.2 Secondary access to models
Model names should appear only:
- inside Model Explorer,
- as filters,
- as badges attached to outputs,
- as “used in this scenario” metadata.

This keeps models visible without making them the main organizing principle.

## 7.3 Global utilities
Persistent global controls:
- language switcher (EN / RU / UZ)
- saved scenarios
- export / share
- search
- help / methodology
- user / environment status if later needed

---

## 8. Core User Flows

## 8.1 Flow A — Monitor
1. Open Overview
2. See macro snapshot
3. Identify a risk or revision
4. Click “Explore scenario”
5. Enter Scenario Lab with relevant assumptions preloaded

## 8.2 Flow B — Build a scenario
1. Open Scenario Lab
2. Choose or describe scenario
3. Adjust assumptions
4. Run simulation
5. Review headline results
6. Save scenario
7. Move to Comparison or export briefing

## 8.3 Flow C — Compare policy options
1. Open Comparison
2. Select 2–4 saved scenarios
3. Compare KPI cards, charts, trade-offs, narrative differences
4. Mark preferred scenario
5. Export comparison brief

## 8.4 Flow D — Validate methodology
1. Open Model Explorer
2. Choose model
3. Review assumptions, equations, calibration, data sources
4. Inspect sensitivity and caveats
5. Return to Scenario Lab

## 8.5 Flow E — Build narrative for decision-makers
1. Run or load scenario
2. Read machine-generated explanation draft
3. Edit / refine message
4. Export executive note, chart pack, or slide-ready visuals

---

## 9. Page Specifications

# 9.1 Overview

## Goal
Present the current macro picture in a way that is immediately understandable to senior users.

## Structure

### A. Economic state header
Single sentence:
- “Growth remains solid, inflation is easing but still above target, and external vulnerability has narrowed modestly.”

This should be dynamic and generated from the latest data state.

### B. Core KPI strip
Show only the most important indicators:
- GDP growth
- inflation
- policy rate
- exchange rate
- current account
- fiscal balance
- reserves
- debt

Each KPI should show:
- current value,
- change vs previous period,
- direction,
- confidence / freshness indicator if relevant.

### C. Nowcast / forecast block
Visual strip showing:
- latest estimate,
- prior estimate,
- revision,
- short explanation of what drove the change.

### D. Risk panel
Top 3 macro risks only.
Each card should answer:
- what the risk is,
- why it matters,
- what part of the economy it hits,
- suggested scenario to test.

### E. Quick actions
Prominent action cards:
- Run exchange-rate shock
- Test tariff change
- Compare fiscal scenarios
- Open inflation risk scenario
- Export snapshot brief

### F. Recent updates
Compact feed:
- latest reforms,
- latest model/data refresh,
- latest saved scenarios,
- latest research note.

## Design notes
- This page should feel calm and sparse.
- No giant dashboard wall.
- No more than 6–8 visible blocks before scrolling.

---

# 9.2 Scenario Lab

## Goal
Make scenario construction the center of the platform.

## Layout
Three-column structure on desktop.

### Left panel — Assumptions
This is where users define shocks.

Sections:
- macro shocks
- external shocks
- fiscal shocks
- trade shocks
- optional advanced assumptions

Controls should be grouped by policy meaning, not by model variable names.

For example:
- Policy rate change
- Exchange-rate depreciation
- Tariff reduction
- Government spending increase
- Remittance decline
- Commodity price shock

Each control should include:
- label in plain language,
- small help text,
- optional advanced toggle showing technical variable name.

### Center panel — Results
Tabbed output area:
- Headline impact
- Macro path
- Sector effects
- External balance
- Fiscal effects
- Distribution / employment later if available

The first visible state should show:
- 4–6 headline result cards,
- one main chart,
- short explanation of the key mechanism.

### Right panel — Interpretation
Narrative block with sections:
- What changed
- Why it changed
- Key risks
- Policy implications
- Suggested next scenarios

This panel is crucial. It turns a simulator into a policy tool.

## Additional features

### Scenario presets
Examples:
- WTO accession shock
- External slowdown
- Inflation persistence stress
- Fiscal consolidation
- Exchange-rate shock

### Save scenario
Users should be able to:
- name it,
- tag it,
- add note,
- save as baseline / alternative / stress.

### Plain-language scenario builder
Later phase:
A prompt box like:
- “What if remittances fall 15% and the exchange rate weakens 10%?”

The system should then map this into structured assumptions.

---

# 9.3 Comparison

## Goal
Make trade-offs visible.

## Structure

### A. Scenario selector
Choose 2–4 saved scenarios.

### B. Headline comparison cards
For each scenario show:
- GDP
- inflation
- current account
- fiscal balance
- exchange rate
- one or two scenario-specific metrics

### C. Delta table
A clean matrix with:
- baseline,
- alternative,
- absolute change,
- directional marker.

### D. Comparative charts
Users should toggle between:
- level view,
- delta view,
- risk view.

### E. Trade-off summary
Text block answering:
- which scenario performs best on growth,
- which is strongest on stability,
- where the compromise lies.

### F. Recommendation mode
Allow user to mark one scenario as:
- preferred,
- balanced,
- aggressive,
- downside stress.

## Design notes
This page should look analytical, not decorative.
Tables matter more than flashy cards here.

---

# 9.4 Model Explorer

## Goal
Give technical users deep transparency without overwhelming ordinary users.

## Structure

### A. Model catalog
Cards for each model with:
- model name,
- type,
- purpose,
- frequency,
- key outputs,
- current status.

### B. Model detail page
Tabs:
- Overview
- Assumptions
- Equations
- Parameters
- Data sources
- Caveats
- Sensitivity / uncertainty

### C. Parameter explorer
Searchable table with:
- name,
- symbol,
- current value,
- range,
- meaning,
- linked equation.

### D. Flow diagram
Simple visual map of how the model works.

### E. Model caveats block
This should be prominent and honest.
Examples:
- no labor market block,
- current account exogenous,
- simplified pass-through,
- static multipliers,
- limited uncertainty.

This increases trust.

---

# 9.5 Knowledge Hub

## Goal
Tie analysis to real policy context.

## Sections

### A. Reform Tracker
A clean, filterable feed of reforms and policy actions.

### B. Research Briefs
Short policy articles, internal notes, scenario writeups.

### C. Literature
Foundational and recent papers linked to each model.

### D. Model-linked references
For each scenario or output, show relevant:
- reforms,
- papers,
- earlier analysis.

## Design principle
This should feel like support context, not like a second product competing for attention.

---

## 10. Interaction Design Rules

### Rule 1
Every simulation result must answer three layers:
- number,
- mechanism,
- implication.

### Rule 2
Every advanced option should be hidden behind “Advanced assumptions” or “Technical detail.”

### Rule 3
Charts should never appear without a subtitle or takeaway.

### Rule 4
If multiple models are used, the UI must clearly say which model generated which output.

### Rule 5
Warnings and caveats must be visible when important.

### Rule 6
The app should default to the last meaningful user state, not reset constantly.

### Rule 7
Comparison should be available from anywhere.

---

## 11. Design System Principles

## 11.1 Tone
- institutional
- restrained
- clear
- modern but not trendy
- authoritative without looking bureaucratic

## 11.2 Visual language
- white / off-white background
- dark navy / slate structure
- muted accent colors
- sparing use of strong color
- large, calm typography
- clean spacing
- minimal ornament

## 11.3 Components
Standardized components only:
- KPI card
- assumption control block
- chart card
- delta table
- risk card
- narrative panel
- methodology box
- status badge
- scenario tag

No page should invent its own UI grammar.

## 11.4 Chart standards
All charts should follow common rules:
- same title hierarchy,
- same axis styling,
- same legend behavior,
- same export behavior,
- same tooltip logic,
- same color semantics.

### Suggested semantic colors
- baseline = slate/navy
- alternative = blue/teal
- downside = muted red
- upside = muted green
- uncertainty = gray band

---

## 12. Content Strategy

The frontend needs clearer writing standards.

### Executive layer language
Should answer:
- what happened,
- why it matters,
- what to do next.

### Analyst layer language
Should answer:
- which variable moved,
- what drove it,
- what the sensitivity is.

### Technical layer language
Should answer:
- equation,
- calibration,
- assumptions,
- data source,
- known limitation.

Do not mix these voices on the same screen.

---

## 13. Information Density Rules

### High-density zones
Allowed in:
- Comparison tables
- Parameter explorer
- methodology tabs

### Low-density zones
Required in:
- Overview
- top of Scenario Lab
- executive narrative panels

The mistake in the old frontend is too much medium-density content everywhere.

---

## 14. Technical Frontend Recommendation

## Recommendation
Do not continue the major redesign in the current many-page static HTML pattern.

### Preferred stack
- React
- TypeScript
- component-driven architecture
- centralized state management
- shared schema for scenarios, outputs, caveats, and metadata
- reusable chart wrapper components
- i18n at framework level

### Why
The product now has too many repeated patterns and cross-page state needs:
- shared assumptions,
- saved scenarios,
- comparison state,
- language state,
- common export logic,
- reusable explanation blocks,
- model metadata linking.

This should not keep being hand-wired per page.

### Architectural approach
Use a shell-based application structure:
- one app shell,
- page routes,
- shared layout,
- model adapters underneath.

Keep the economic model engines modular, but standardize how the frontend consumes them.

---

## 15. Suggested Data / UI Contract

The frontend should define one common output schema for all model results:

- `scenario_id`
- `scenario_name`
- `model_id`
- `headline_metrics[]`
- `charts[]`
- `tables[]`
- `narrative.summary`
- `narrative.key_findings[]`
- `narrative.risks[]`
- `narrative.recommendations[]`
- `caveats[]`
- `confidence / uncertainty metadata`
- `source / methodology references`

Without this, the UI will keep fragmenting.

---

## 16. MVP for the Reimagined Frontend

A realistic first release of the redesign should include only:

1. **Overview**
2. **Scenario Lab**
3. **Comparison**
4. **Basic Model Explorer**

Not everything else.

### MVP must deliver
- coherent navigation
- one visual system
- saved scenarios
- side-by-side comparison
- common output cards and charts
- basic narrative generation
- clear model attribution

### MVP should defer
- full research hub polish
- advanced collaboration
- natural language scenario builder
- heavy automation features
- public-facing platform complexity

---

## 17. Success Criteria

The redesign succeeds if:

### For policymakers
They can understand the state of the economy and the result of one scenario in under 3 minutes.

### For analysts
They can create, save, compare, and export a scenario without jumping across multiple disconnected pages.

### For technical users
They can verify assumptions and methodology without digging through code.

### For the institution
The platform looks and behaves like a serious internal policy product, not a prototype collection.

---

## 18. Immediate Next Deliverables

The next design phase should produce three outputs before any high-fidelity UI work:

### Deliverable 1 — Information Architecture
A page map and navigation diagram for the five-section product.

### Deliverable 2 — Wireframes
Low-fidelity wireframes for:
- Overview
- Scenario Lab
- Comparison
- Model Explorer

### Deliverable 3 — Design System Draft
Core components, spacing, typography, color logic, chart rules, and card types.

Only after these three are approved should the team move to visual mockups and implementation.

---

## 19. Final Product Thesis

The platform should no longer feel like:

**“six economic models in a website.”**

It should feel like:

**“one policy intelligence and scenario-analysis system powered by several models.”**

That is the conceptual shift the frontend must make.


---

## 20. Prioritization Matrix

The redesign should explicitly separate what is essential for launch from what is desirable later.

### 20.1 Must / Should / Could framework

#### Overview
**Must**
- Economic state header
- Core KPI strip
- Nowcast / forecast block
- Risk panel
- Quick actions

**Should**
- Recent updates feed
- Linked scenario suggestions
- Data freshness markers on all KPI cards

**Could**
- Personalized homepage state by user role
- Configurable KPI ordering
- Embedded comparative historical context

#### Scenario Lab
**Must**
- Structured assumptions panel
- Headline results cards
- Main results chart
- Interpretation panel
- Save scenario
- Scenario presets

**Should**
- Advanced assumptions toggle
- Multi-model routing visibility
- Suggested next scenarios

**Could**
- Natural-language scenario builder
- Collaborative comments on scenario assumptions
- Assisted scenario tuning

#### Comparison
**Must**
- Scenario selector
- Headline comparison cards
- Delta table
- Comparative charts
- Export comparison brief

**Should**
- Trade-off summary
- Preferred-scenario tagging
- Level vs delta toggle

**Could**
- Auto-ranked scenario scoring
- Scenario recommendation assistant
- Cross-model disagreement heatmap

#### Model Explorer
**Must**
- Model catalog
- Parameter explorer
- Equations tab
- Caveats block
- Data sources block

**Should**
- Flow diagrams
- Sensitivity summary
- Model status badges

**Could**
- Parameter history / version timeline
- Calibration comparison views
- Interactive methodological explainers

#### Knowledge Hub
**Must**
- Reform tracker
- Research briefs index
- Literature index

**Should**
- Model-linked references
- Search and filter system

**Could**
- Auto-generated article drafts
- Research recommendation engine
- Personal reading lists

### 20.2 Scope discipline rule
If a feature does not improve one of the top six jobs-to-be-done and is not required for institutional trust, it does not enter MVP.

---

## 21. Success Metrics and Baselines

The redesign should be measured with concrete behavioral outcomes, not aesthetic satisfaction alone.

## 21.1 MVP success metrics

### Workflow efficiency
- Median time to understand macro status on Overview
- Median time to create and run first scenario
- Median time to compare two saved scenarios
- Median time to export a briefing

### Usage quality
- Scenario save rate
- Scenario comparison usage rate
- Export rate per active analyst
- Return usage of saved scenarios

### Comprehension
- Policymaker comprehension score after using Overview or a scenario brief
- Analyst confidence score in interpretation layer
- Technical user trust score in methodology transparency

### Adoption
- Weekly active internal users
- Share of sessions that reach Scenario Lab
- Share of sessions that reach Comparison

## 21.2 Initial baseline assumptions
Because the new frontend does not yet exist, baseline values should be established during current-state testing.

Suggested baseline study using current frontend:
- Time to find and run a relevant scenario
- Time to produce a comparison manually
- User-reported confusion points
- Completion rate for first-time users

## 21.3 Target values for MVP
Suggested initial targets:
- First scenario completion time: under 5 minutes for analysts
- Overview comprehension time: under 3 minutes for senior users
- Comparison task completion: under 4 minutes once two scenarios exist
- Export usage: at least 40% of analyst sessions that run a scenario
- Policymaker comprehension score: at least 8/10 on structured recall questions

---

## 22. Non-Functional Requirements

The frontend must be treated as an institutional product, not only as a feature surface.

## 22.1 Performance
- Initial page load target: under 3 seconds on standard office broadband
- Time to interactive for Overview: under 4 seconds
- Scenario rerun after parameter adjustment: ideally under 2 seconds for common cases
- Comparison rendering for 2–4 scenarios: under 2 seconds once data is available
- Avoid oversized bundles and uncontrolled chart/data payloads

## 22.2 Accessibility
- Target: WCAG 2.1 AA minimum
- Full keyboard navigation for all controls
- Screen-reader labeling for interactive inputs
- Sufficient contrast across all themes and charts
- Touch targets at least 44px where relevant
- Language changes must update semantic document language

## 22.3 Reliability
- Target availability for internal hosted version: 99.5% or institutionally agreed equivalent
- Graceful degradation when one model fails
- User-visible error states instead of silent failure
- Saved scenarios must not disappear due to recoverable UI errors

## 22.4 Auditability
- Every saved scenario should retain timestamp, author, key assumptions, model set used, and export history
- Every generated narrative should retain source scenario and model metadata
- Data refreshes should be time-stamped and visible

## 22.5 Security and privacy
- No secret keys exposed in browser for production deployment
- Clear separation between public-facing content and internal scenario state
- Role-aware access if institutional deployment adds sensitive analysis later

---

## 23. Data Governance and Source Control

The redesign should specify who owns truth, how freshness is defined, and what happens when sources conflict.

## 23.1 Source-of-truth ownership
Each major data family must have a named owner:
- Macro snapshot series
- Forecast / nowcast series
- Model calibration inputs
- Reform tracker data
- Research and literature metadata

Ownership should be institutional, not implicit in code.

## 23.2 Freshness windows
Suggested freshness classes:
- Daily / near-real-time: market-sensitive indicators if used
- Monthly: inflation, production, trade, business indicators
- Quarterly: GDP, model recalibration outputs where relevant
- Annual / ad hoc: structural tables, IO, SAM, some CGE inputs

Every surfaced number should display freshness class or last update timestamp where relevant.

## 23.3 Revision policy
When data is revised:
- previous values should not disappear without trace
- revised series should be flagged
- scenario outputs based on old data should be version-labeled
- exported outputs should retain the data/version stamp used at time of export

## 23.4 Conflict resolution
When sources disagree:
- define source priority rules in advance
- surface a visible warning where conflict affects interpretation
- preserve both values in the data layer if necessary
- log who resolved the conflict and when

## 23.5 Missing or stale data policy
If freshness thresholds are breached:
- show stale-data warning
- downgrade confidence messaging
- disable claims that imply current precision if underlying data is outdated

---

## 24. Delivery Plan

The redesign should be phased deliberately rather than treated as one giant rewrite.

## 24.1 Phase structure

### MVP v1 — Coherent policy workspace
Scope:
- App shell and new navigation
- Overview
- Scenario Lab
- Comparison
- Basic Model Explorer
- Shared design system
- Shared output schema
- Saved scenarios
- Basic export flows

Goal:
Deliver a coherent end-to-end analyst workflow.

### v1.1 — Trust and operating quality
Scope:
- Accessibility hardening
- Performance optimization
- Audit logging improvements
- Data freshness indicators
- Better caveat visibility
- Better scenario metadata and search
- Expanded export polish

Goal:
Make the platform reliable enough for institutional daily use.

### v2 — Intelligence and scaling layer
Scope:
- Knowledge Hub refinement
- Natural-language scenario builder
- stronger cross-model linking
- deeper explanation logic
- user roles and collaboration if needed
- backend-backed persistence if internal adoption justifies it

Goal:
Move from solid internal tool to durable institutional platform.

## 24.2 Dependencies
Critical dependencies include:
- common scenario/output schema
- model adapter layer
- shared design system
- i18n framework
- decision on persistence architecture
- confirmed data ownership and update process

## 24.3 Resourcing assumptions
Minimum practical team for redesign execution:
- 1 product/design lead
- 1 frontend engineer with strong component/system discipline
- 1 engineer bridging model outputs to UI contracts
- 1 analyst / domain reviewer for validation
- part-time QA / accessibility support

This can be leaner temporarily, but not without quality trade-offs.

---

## 25. Validation Loop

The redesign should be tested with real users before and after MVP release.

## 25.1 Pre-MVP validation
Test low-fidelity wireframes with:
- senior policymaker / manager
- analyst user
- technical/research user

Questions to validate:
- Can they find the right starting point?
- Do they understand the difference between Overview, Scenario Lab, and Comparison?
- Do they know where to go for methodology?
- Do they trust the interpretation layer?

## 25.2 MVP usability testing
Tasks to test:
- understand current macro position
- run a pre-defined shock
- create and save a new scenario
- compare two scenarios
- export a briefing
- find a model caveat

Collect:
- completion time
- completion rate
- observed confusion
- confidence score
- comprehension accuracy

## 25.3 Post-launch validation cadence
- 2-week early usage review
- 6-week workflow review with analysts
- quarterly product review with institutional stakeholders

---

## 26. Risk Register

## 26.1 Product risks

### Risk: task-first ambition collapses back into model-first screens
**Impact:** high
**Mitigation:** enforce navigation and page-goal discipline; review every page against jobs-to-be-done.

### Risk: frontend becomes overloaded again
**Impact:** high
**Mitigation:** Must/Should/Could governance; MVP scope freeze once core workflows are set.

### Risk: senior users do not trust the interpretation layer
**Impact:** high
**Mitigation:** make caveats, model attribution, timestamps, and source logic explicit; avoid overclaiming certainty.

## 26.2 Technical risks

### Risk: state complexity becomes unmanageable
**Impact:** high
**Mitigation:** central state design, shared schema, strict page contracts, no ad hoc per-page state islands.

### Risk: model inconsistency confuses users
**Impact:** high
**Mitigation:** common output schema, visible model attribution, explicit caveats, reconciliation notes where models differ.

### Risk: i18n drift across components
**Impact:** medium-high
**Mitigation:** single translation system, translation QA checklist, automated missing-key checks where possible.

### Risk: narrative generation hallucinates or overstates claims
**Impact:** high
**Mitigation:** structured narrative templates, model-linked fact injection, explicit uncertainty language, manual review option before export.

### Risk: performance degrades as models and charts accumulate
**Impact:** medium-high
**Mitigation:** performance budgets, lazy loading, code splitting, standardized chart rendering.

---

## 27. API and Data Contract Requirements

The frontend should not depend on informal or unstable model payloads.

## 27.1 Versioning
- All shared output schemas should be versioned
- Model adapter layer should specify contract version used
- Breaking changes should require explicit migration handling

## 27.2 Backward compatibility
- Saved scenarios created on older schema versions should remain readable
- At minimum, a migration strategy should exist for scenario metadata and headline metrics

## 27.3 Error schema
All model and data-service responses should use a common error structure:
- error code
- human-readable message
- severity
- recoverability
- affected model / module
- suggested user action where relevant

## 27.4 Uncertainty representation standard
If uncertainty is shown, it should be standardized across models where possible.

Suggested metadata:
- point estimate
- lower / upper bound
- confidence level
- methodology label
- freshness / version stamp
- caveat note if bands are illustrative rather than empirically estimated

## 27.5 Narrative contract
Generated interpretation blocks should receive structured inputs, not raw prose-only generation.

Minimum narrative input contract:
- scenario metadata
- model outputs
- deltas vs baseline
- risk flags
- caveats
- uncertainty summary

This reduces narrative drift and improves trust.

---

## 28. Execution Readiness Checklist

Before implementation begins, the redesign should have explicit sign-off on:
- product scope for MVP
- page map and navigation
- shared component inventory
- scenario/output schema
- design system draft
- data ownership map
- validation plan
- success metrics baseline plan
- delivery sequencing and resourcing assumptions

Only after that should engineering begin full implementation.

