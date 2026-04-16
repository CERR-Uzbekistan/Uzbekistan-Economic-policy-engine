# Uzbekistan Economic Policy Engine — Roadmap

> From prototype to the first AI-enhanced macroeconomic simulation platform for Central Asia.

## Vision

No government or central bank in Central Asia has a **web-native, AI-enhanced, multilingual** macro policy simulation platform. The IMF uses MATLAB/Dynare (desktop-only). The World Bank uses GAMS (license-required). OECD dashboards show data but don't simulate. **We fill that gap.**

**Target users:** Central Bank of Uzbekistan, Ministry of Economy & Finance, CERR, international organization country desks, university economics departments.

---

## Competitive Landscape

| Feature | IMF (GIMF/GPM) | Dynare/IRIS | World Bank MAMS | OECD DataMapper | **This Platform** |
|---------|----------------|-------------|-----------------|-----------------|-------------------|
| Web-based | No | No | No | View only | **Full simulation** |
| Scenario comparison | Internal | Manual | Per-report | No | **Side-by-side** |
| AI integration | None | None | None | None | **Policy briefs** |
| Multilingual | No | No | No | No | **EN/RU/UZ** |
| No install needed | No | No | No | Yes | **Yes** |
| Country-calibrated | Per mission | User builds | Per project | N/A | **Uzbekistan-native** |
| Open access | Internal | Open source | Internal | Partial | **Open web** |

---

## Phase 1: Foundation Hardening (Current → Production-Ready)

**Goal:** Fix critical gaps so the platform can be shown to stakeholders with confidence.

### 1.1 Accessibility (P1)
- [ ] Add `aria-label` to all interactive elements (sliders, buttons, dropdowns)
- [ ] Add `role` attributes to custom controls
- [ ] Keyboard navigation (Tab, Enter, Arrow keys) for all controls
- [ ] Enlarge slider thumbs to 44px for touch targets
- [ ] Color contrast check (WCAG 2.1 AA)
- [ ] `lang` attribute updates when switching language

### 1.2 Input Validation & Error Handling (P1)
- [ ] Validate parameter bounds (no negative growth in FPP, no >100% tariffs in PE)
- [ ] Division-by-zero guards in CGE/FPP calculations
- [ ] User-facing toast notifications for network failures (replace silent fallbacks)
- [ ] Solver convergence warnings shown to user (not just console)

### 1.3 Complete i18n (P1)
- [ ] PE model: translate controls, chart labels, sector names
- [ ] IO model: translate table headers, sector names, search placeholders
- [ ] CGE model: translate controls, shock type labels, sector names
- [ ] Externalize all hardcoded English strings in chart configs
- [ ] Translate error/warning messages

### 1.4 Mobile Polish (P2)
- [ ] Horizontal scroll wrappers for data tables (IO, PE)
- [ ] Touch-friendly slider controls (larger hit areas)
- [ ] Test on 375px (iPhone SE) through 1920px
- [ ] Sidebar swipe-to-close on mobile

---

## Phase 1B: Model Methodology Improvements (April 2026 Audit)

**Goal:** Strengthen economic rigor of all 6 models based on professional audit findings.

### QPM — Monetary Policy Model
- [ ] **Activate external demand shock (b3)** — parameter exists but no UI button; cannot simulate Russia/China slowdown (Low effort, High impact)
- [ ] **Add direct import price pass-through to Phillips Curve** — current indirect channel (via RER gap) underestimates; add `a4·Δpm` term for import-dependent economy (Medium effort)
- [ ] **Reconcile baseline forecast with IRF solver** — `runBL()` uses ad-hoc `a2*rmc*3` scaling inconsistent with `solveIRF()`; should use same structural equations (Medium effort)
- [ ] **Add risk premium to UIP** — no country risk wedge; cannot simulate capital flight or sovereign risk shocks (Medium effort)

### PE — Trade Model
- [ ] **Replace uniform elasticity (ε=1.27) with sector-specific values** — food (ε≈0.3) responds differently than machinery (ε≈2.5); use WITS-provided product elasticities (Medium effort, High impact)
- [ ] **Remove ad-hoc 0.6 regime filter** — replace with actual trade share computation under each regime (Low effort)

### FPP — Financial Programming
- [ ] **Add inflation stress scenarios** — baseline projects 9.6%→3.0% in one year; unrealistic without NER cooperation; add persistent depreciation scenario (Low effort)
- [ ] **Make current account endogenous to real exchange rate** — currently CA/GDP is an input; should respond to competitiveness (High effort)

### I-O — Input-Output Model
- [ ] **Upgrade to Type II multipliers** — add induced consumption effects (household spending feedback); Type I underestimates services sector impact by 20-40% (Medium effort)

### CGE — General Equilibrium
- [ ] **Add simple labor market block** — no employment in current model; add wage-employment with formal/informal split for Uzbekistan labor policy analysis (High effort)

### DFM — Nowcasting
- [ ] **Expand to 2-3 factors** — single factor misses sectoral divergence (e.g., agriculture boom + industry contraction); consider real activity, external, financial factors (High effort)

### Cross-Model
- [ ] **Harmonize Phillips Curve parameters** — QPM uses (a1=0.6, a2=0.2) vs FPP (λ1=0.05, λ2=0.70); document structural differences or reconcile
- [ ] **Add uncertainty bands to all models** — only DFM has fan charts; QPM, CGE, FPP should show parameter uncertainty

---

## Phase 2: Scenario Engine & Cross-Model Integration

**Goal:** Transform from 6 isolated models into an integrated policy analysis platform.

### 2.1 Scenario Comparison Dashboard
- [ ] Save simulation snapshots (parameters + results) to localStorage
- [ ] Name and tag scenarios (e.g., "WTO Baseline", "Aggressive Fiscal")
- [ ] Side-by-side chart comparison (2-4 scenarios)
- [ ] Difference tables (Scenario A vs B: delta values)
- [ ] Export comparison as PDF report
- [ ] Scenario library with pre-built policy packages:
  - WTO accession (PE + CGE combined)
  - Fiscal consolidation (FPP + QPM)
  - External shock (commodity price drop across all models)

### 2.2 Cross-Model Linkages
- [ ] QPM output (GDP gap, inflation) feeds into FPP baseline
- [ ] PE tariff changes feed into CGE import prices
- [ ] IO sector multipliers inform CGE calibration
- [ ] DFM nowcast feeds QPM initial conditions
- [ ] Visual "model flow" diagram showing data dependencies

### 2.3 Uncertainty Quantification
- [ ] Fan charts on all forecasts (70%/90% confidence bands)
- [ ] Monte Carlo simulation option for QPM (parameter uncertainty)
- [ ] Sensitivity analysis: tornado diagrams showing which parameters matter most
- [ ] Risk balance indicators (upside vs downside risks)

### 2.4 Data Pipeline
- [ ] Auto-fetch from World Bank API (GDP, inflation, trade)
- [ ] Auto-fetch from IMF WEO API (forecasts)
- [ ] Auto-fetch from CBU API (policy rate, monetary aggregates)
- [ ] Data freshness indicator ("Last updated: 2 days ago")
- [ ] Versioned data snapshots for reproducibility

---

## Phase 3: AI Integration — The Differentiator

**Goal:** Make this the first macro platform where AI explains what the numbers mean.

### 3.1 AI Policy Advisor
- [ ] After any simulation run, generate a plain-language policy brief:
  - "A 5pp tariff reduction on HS 28-40 would increase imports by $X million,
    creating Y jobs in downstream manufacturing but reducing tariff revenue by Z."
- [ ] Contextual recommendations based on simulation results
- [ ] Risk flags: "This scenario implies a current account deficit of X% of GDP,
  which exceeds the IMF threshold for sustainability"
- [ ] Available in EN/RU/UZ

### 3.2 Natural Language Scenario Builder
- [ ] Users describe scenarios in plain text:
  - "What happens if oil drops to $50 and remittances fall 20%?"
  - AI maps this to model parameters and runs the simulation
- [ ] Conversational interface for iterating on scenarios
- [ ] AI suggests relevant follow-up scenarios

### 3.3 Automated Nowcast Narratives
- [ ] DFM nowcast auto-generates monthly economic briefing:
  - "GDP growth is tracking at 6.2% in Q1 2026, driven by strong industrial
    output (+8.1%) but weighed down by declining agricultural production (-1.3%).
    The nowcast has shifted up 0.4pp since last month."
- [ ] Indicator contribution decomposition in plain language
- [ ] Anomaly detection: flag unusual indicator movements

### 3.4 Comparative Intelligence
- [ ] "How does Uzbekistan's current account compare to peer countries at similar
  stages of WTO accession?" — AI retrieves and contextualizes
- [ ] Historical pattern matching: "The last time inflation was this high,
  the CBU raised rates by X and the effect was Y"
- [ ] International best practice suggestions based on simulation results

---

## Phase 4: Platform & Scale

**Goal:** From tool to platform — collaboration, API, and institutional adoption.

### 4.1 Collaboration Features
- [ ] User accounts (view-only vs analyst roles)
- [ ] Shared scenario library across team
- [ ] Comments/annotations on scenarios
- [ ] Audit trail: who changed what assumption, when
- [ ] Quarterly forecasting round workflow (FPAS-style)

### 4.2 New Models
- [ ] **Debt Sustainability Analysis (DSA)** — IMF framework, stress tests
- [ ] **BVAR Forecasting** — Bayesian VAR with Minnesota/Litterman priors
- [ ] **Agent-Based Model** — Heterogeneous firms/households, distributional effects
- [ ] **Climate-Macro Module** — Carbon pricing, green transition costs
- [ ] **Labor Market Model** — Unemployment, wage dynamics, migration

### 4.3 API & Integration
- [ ] REST API for programmatic access to model outputs
- [ ] Embeddable widgets (iframe charts for reports/presentations)
- [ ] Excel add-in for pulling simulation results into spreadsheets
- [ ] R/Python SDK for researchers

### 4.4 Deployment & Infrastructure
- [ ] Move from static HTML to proper backend (Node.js or Python/FastAPI)
- [ ] Database for scenario storage (PostgreSQL)
- [ ] Authentication (OAuth2 / institutional SSO)
- [ ] CDN deployment for performance
- [ ] Monitoring and usage analytics

---

## Implementation Priority Matrix

```
                    HIGH IMPACT
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │  AI Policy       │  Scenario        │
     │  Advisor         │  Comparison      │
     │  (Phase 3.1)     │  (Phase 2.1)     │
     │                  │                  │
LOW ─┼──────────────────┼──────────────────┼─ HIGH
EFFORT│                 │                  │  EFFORT
     │  i18n + A11y     │  Cross-Model     │
     │  Fixes           │  Linkages        │
     │  (Phase 1)       │  (Phase 2.2)     │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                    LOW IMPACT
```

**Do first:** Phase 1 fixes + Scenario Comparison + AI Policy Advisor
**Do next:** Cross-model linkages + Uncertainty quantification
**Do later:** Platform features, new models, API

---

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 3 Target |
|--------|---------|----------------|----------------|
| Models operational | 6 | 6 (hardened) | 8+ |
| i18n coverage | ~70% | 100% | 100% |
| WCAG compliance | None | AA | AA |
| Scenario save/compare | No | Yes | Yes + AI |
| AI features | None | None | 3 modules |
| Data auto-update | Partial | Full | Full + alerts |
| Cross-model links | None | 2 pairs | All connected |
| API access | None | None | REST + SDK |

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Stay static HTML (Phase 1-2) | Yes | No server needed, fast iteration, works offline |
| AI via client-side API calls | Yes | Claude/GPT API from browser, no backend needed initially |
| localStorage for scenarios | Yes | No database needed for Phase 2, upgrade later |
| Add backend at Phase 4 | Yes | Only when collaboration/auth features justify complexity |
| Keep vanilla JS | Yes | No framework tax, each model stays self-contained |
| Chart.js over D3 | Keep | Already invested, sufficient for current needs |

---

*Last updated: 2026-04-16*
