#!/bin/bash
# =============================================================================
# Create GitHub Issues from ROADMAP.md
# Prerequisites: Install GitHub CLI (https://cli.github.com) and run `gh auth login`
# Usage: bash scripts/create-github-issues.sh
# =============================================================================

REPO="CERR-Uzbekistan/Uzbekistan-Economic-policy-engine"

echo "Creating labels..."
# Model labels
gh label create "model:qpm"  --repo "$REPO" --color "1d76db" --description "QPM DSGE model" 2>/dev/null
gh label create "model:dfm"  --repo "$REPO" --color "0e8a16" --description "DFM Nowcast model" 2>/dev/null
gh label create "model:pe"   --repo "$REPO" --color "d93f0b" --description "Partial Equilibrium model" 2>/dev/null
gh label create "model:io"   --repo "$REPO" --color "e4e669" --description "Input-Output model" 2>/dev/null
gh label create "model:cge"  --repo "$REPO" --color "c5def5" --description "CGE 1-2-3 model" 2>/dev/null
gh label create "model:fpp"  --repo "$REPO" --color "bfdadc" --description "Financial Programming model" 2>/dev/null

# Area labels
gh label create "hub"        --repo "$REPO" --color "5319e7" --description "Main hub / landing page" 2>/dev/null
gh label create "shared"     --repo "$REPO" --color "f9d0c4" --description "Shared modules (report-engine, scenario-engine, etc.)" 2>/dev/null
gh label create "i18n"       --repo "$REPO" --color "fbca04" --description "Translation / internationalization" 2>/dev/null
gh label create "a11y"       --repo "$REPO" --color "d4c5f9" --description "Accessibility" 2>/dev/null

# Phase labels
gh label create "phase:1"    --repo "$REPO" --color "b60205" --description "Phase 1: Foundation Hardening" 2>/dev/null
gh label create "phase:2"    --repo "$REPO" --color "ff9f1c" --description "Phase 2: Scenario Engine & Integration" 2>/dev/null
gh label create "phase:3"    --repo "$REPO" --color "2ec4b6" --description "Phase 3: AI Integration" 2>/dev/null
gh label create "phase:4"    --repo "$REPO" --color "6f42c1" --description "Phase 4: Platform & Scale" 2>/dev/null

# Priority labels
gh label create "priority:high"   --repo "$REPO" --color "b60205" --description "High priority" 2>/dev/null
gh label create "priority:medium" --repo "$REPO" --color "fbca04" --description "Medium priority" 2>/dev/null
gh label create "priority:low"    --repo "$REPO" --color "0e8a16" --description "Low priority" 2>/dev/null

echo ""
echo "Creating Phase 1 issues..."

# --- PHASE 1: Foundation Hardening ---

gh issue create --repo "$REPO" \
  --title "Add ARIA labels to all interactive elements" \
  --label "phase:1,a11y,priority:high" \
  --body "Add \`aria-label\` to all interactive elements (sliders, buttons, dropdowns) across all 6 models and the hub page.

**Acceptance Criteria:**
- [ ] All sliders have \`aria-label\` with parameter name
- [ ] All buttons have \`aria-label\` describing action
- [ ] All dropdowns have \`aria-label\`
- [ ] Screen reader can navigate all controls

**Ref:** ROADMAP.md Phase 1.1"

gh issue create --repo "$REPO" \
  --title "Add role attributes and keyboard navigation" \
  --label "phase:1,a11y,priority:high" \
  --body "Add \`role\` attributes to custom controls. Implement keyboard navigation (Tab, Enter, Arrow keys) for all controls. Enlarge slider thumbs to 44px touch targets.

**Acceptance Criteria:**
- [ ] Tab through all controls in each model
- [ ] Enter/Space activates buttons
- [ ] Arrow keys adjust sliders
- [ ] Touch targets >= 44px
- [ ] WCAG 2.1 AA color contrast

**Ref:** ROADMAP.md Phase 1.1"

gh issue create --repo "$REPO" \
  --title "Add input validation and error handling across all models" \
  --label "phase:1,shared,priority:high" \
  --body "Validate parameter bounds and add user-facing error handling:

- [ ] No negative growth rates in FPP
- [ ] No >100% tariffs in PE
- [ ] Division-by-zero guards in CGE/FPP calculations
- [ ] Toast notifications for all errors (replace silent fallbacks)
- [ ] Solver convergence warnings shown to user (not just console)

**Ref:** ROADMAP.md Phase 1.2"

gh issue create --repo "$REPO" \
  --title "Complete i18n for PE model (RU/UZ)" \
  --label "phase:1,i18n,model:pe,priority:high" \
  --body "Translate all user-visible text in the Partial Equilibrium model:

- [ ] Control labels and descriptions
- [ ] Chart titles, axis labels, legends
- [ ] Sector and commodity names
- [ ] Search placeholders
- [ ] Error/warning messages
- [ ] Export button labels

**Ref:** ROADMAP.md Phase 1.3"

gh issue create --repo "$REPO" \
  --title "Complete i18n for IO model (RU/UZ)" \
  --label "phase:1,i18n,model:io,priority:high" \
  --body "Translate all user-visible text in the Input-Output model:

- [ ] Table headers and column names
- [ ] All 136 sector names (EN/RU/UZ)
- [ ] Search placeholder
- [ ] Chart titles and axis labels
- [ ] KPI card labels
- [ ] Badge labels (key sector, backward/forward linkage)

**Ref:** ROADMAP.md Phase 1.3"

gh issue create --repo "$REPO" \
  --title "Complete i18n for CGE model (RU/UZ)" \
  --label "phase:1,i18n,model:cge,priority:high" \
  --body "Translate all user-visible text in the CGE 1-2-3 model:

- [ ] Shock type labels and slider descriptions
- [ ] Chart titles, axis labels, legends
- [ ] Scenario preset names and descriptions
- [ ] Calibration table headers
- [ ] KPI card labels
- [ ] Documentation tab content

**Ref:** ROADMAP.md Phase 1.3"

gh issue create --repo "$REPO" \
  --title "Externalize hardcoded English strings in chart configs" \
  --label "phase:1,i18n,shared,priority:medium" \
  --body "Find and externalize all hardcoded English strings in Chart.js configuration objects across all models. Translate error and warning messages.

- [ ] Audit all Chart.js configs for hardcoded strings
- [ ] Move strings to i18n translation objects
- [ ] Verify charts update on language switch

**Ref:** ROADMAP.md Phase 1.3"

gh issue create --repo "$REPO" \
  --title "Mobile responsive polish" \
  --label "phase:1,hub,priority:medium" \
  --body "Polish mobile layouts across the platform:

- [ ] Horizontal scroll wrappers for data tables (IO, PE)
- [ ] Touch-friendly slider controls (larger hit areas)
- [ ] Test on 375px (iPhone SE) through 1920px
- [ ] Sidebar swipe-to-close on mobile

**Ref:** ROADMAP.md Phase 1.4"

echo ""
echo "Creating Phase 2 issues..."

# --- PHASE 2: Scenario Engine & Integration ---

gh issue create --repo "$REPO" \
  --title "Build scenario comparison dashboard" \
  --label "phase:2,shared,priority:high" \
  --body "Transform the scenario engine into a full comparison dashboard:

- [ ] Save simulation snapshots (parameters + results) to localStorage
- [ ] Name and tag scenarios (e.g., 'WTO Baseline', 'Aggressive Fiscal')
- [ ] Side-by-side chart comparison (2-4 scenarios)
- [ ] Difference tables (Scenario A vs B: delta values)
- [ ] Export comparison as PDF report
- [ ] Scenario library with pre-built policy packages:
  - WTO accession (PE + CGE combined)
  - Fiscal consolidation (FPP + QPM)
  - External shock (commodity price drop across all models)

**Ref:** ROADMAP.md Phase 2.1"

gh issue create --repo "$REPO" \
  --title "Implement cross-model data linkages" \
  --label "phase:2,shared,priority:high" \
  --body "Connect model outputs to other models' inputs:

- [ ] QPM output (GDP gap, inflation) feeds into FPP baseline
- [ ] PE tariff changes feed into CGE import prices
- [ ] IO sector multipliers inform CGE calibration
- [ ] DFM nowcast feeds QPM initial conditions
- [ ] Visual 'model flow' diagram showing data dependencies

**Ref:** ROADMAP.md Phase 2.2"

gh issue create --repo "$REPO" \
  --title "Add uncertainty quantification (fan charts, Monte Carlo)" \
  --label "phase:2,shared,priority:medium" \
  --body "Add uncertainty visualization to all forecast outputs:

- [ ] Fan charts on all forecasts (70%/90% confidence bands)
- [ ] Monte Carlo simulation option for QPM (parameter uncertainty)
- [ ] Sensitivity analysis: tornado diagrams showing which parameters matter most
- [ ] Risk balance indicators (upside vs downside risks)

**Note:** Fan charts already added to DFM nowcast (PR #1). Extend to other models.

**Ref:** ROADMAP.md Phase 2.3"

gh issue create --repo "$REPO" \
  --title "Build live data pipeline (World Bank, IMF, CBU APIs)" \
  --label "phase:2,shared,priority:medium" \
  --body "Auto-fetch data from external APIs to keep models current:

- [ ] Auto-fetch from World Bank API (GDP, inflation, trade)
- [ ] Auto-fetch from IMF WEO API (forecasts)
- [ ] Auto-fetch from CBU API (policy rate, monetary aggregates)
- [ ] Data freshness indicator ('Last updated: 2 days ago')
- [ ] Versioned data snapshots for reproducibility

**Ref:** ROADMAP.md Phase 2.4"

echo ""
echo "Creating Phase 3 issues..."

# --- PHASE 3: AI Integration ---

gh issue create --repo "$REPO" \
  --title "AI Policy Advisor: post-simulation briefs" \
  --label "phase:3,shared,priority:high" \
  --body "Generate plain-language policy briefs after simulation runs:

- [ ] After any simulation, generate contextual policy analysis
- [ ] Include risk flags (e.g., 'CA deficit exceeds IMF threshold')
- [ ] Contextual recommendations based on results
- [ ] Available in EN/RU/UZ
- [ ] Works with template fallback when no API key configured

**Note:** Foundation already exists in shared/ai-advisor.js. Enhance and integrate with all models.

**Ref:** ROADMAP.md Phase 3.1"

gh issue create --repo "$REPO" \
  --title "Natural language scenario builder" \
  --label "phase:3,shared,priority:medium" \
  --body "Allow users to describe scenarios in plain text and have AI map them to model parameters:

- [ ] Text input: 'What happens if oil drops to \$50 and remittances fall 20%?'
- [ ] AI maps text to model parameters and runs simulation
- [ ] Conversational interface for iterating on scenarios
- [ ] AI suggests relevant follow-up scenarios

**Ref:** ROADMAP.md Phase 3.2"

gh issue create --repo "$REPO" \
  --title "Automated DFM nowcast narratives" \
  --label "phase:3,model:dfm,priority:medium" \
  --body "Auto-generate monthly economic briefings from DFM nowcast:

- [ ] Plain-language summary of GDP tracking and key drivers
- [ ] Indicator contribution decomposition in plain language
- [ ] Anomaly detection: flag unusual indicator movements
- [ ] Change tracking vs previous month

**Ref:** ROADMAP.md Phase 3.3"

echo ""
echo "Creating Phase 4 issues..."

# --- PHASE 4: Platform & Scale ---

gh issue create --repo "$REPO" \
  --title "Add user accounts and collaboration features" \
  --label "phase:4,priority:low" \
  --body "Transform from single-user tool to collaborative platform:

- [ ] User accounts (view-only vs analyst roles)
- [ ] Shared scenario library across team
- [ ] Comments/annotations on scenarios
- [ ] Audit trail: who changed what assumption, when
- [ ] Quarterly forecasting round workflow (FPAS-style)

**Ref:** ROADMAP.md Phase 4.1"

gh issue create --repo "$REPO" \
  --title "New models: DSA, BVAR, Agent-Based, Climate-Macro, Labor" \
  --label "phase:4,priority:low" \
  --body "Expand model portfolio:

- [ ] **Debt Sustainability Analysis (DSA)** — IMF framework, stress tests
- [ ] **BVAR Forecasting** — Bayesian VAR with Minnesota/Litterman priors
- [ ] **Agent-Based Model** — Heterogeneous firms/households, distributional effects
- [ ] **Climate-Macro Module** — Carbon pricing, green transition costs
- [ ] **Labor Market Model** — Unemployment, wage dynamics, migration

**Ref:** ROADMAP.md Phase 4.2"

gh issue create --repo "$REPO" \
  --title "REST API and SDK for programmatic access" \
  --label "phase:4,priority:low" \
  --body "Add API layer for external integration:

- [ ] REST API for programmatic access to model outputs
- [ ] Embeddable widgets (iframe charts for reports/presentations)
- [ ] Excel add-in for pulling simulation results
- [ ] R/Python SDK for researchers

**Ref:** ROADMAP.md Phase 4.3"

gh issue create --repo "$REPO" \
  --title "Backend migration (Node.js/FastAPI + PostgreSQL)" \
  --label "phase:4,priority:low" \
  --body "Move from static HTML to proper backend:

- [ ] Backend framework (Node.js or Python/FastAPI)
- [ ] Database for scenario storage (PostgreSQL)
- [ ] Authentication (OAuth2 / institutional SSO)
- [ ] CDN deployment
- [ ] Monitoring and usage analytics

**Ref:** ROADMAP.md Phase 4.4"

echo ""
echo "Done! All issues created."
echo "Next steps:"
echo "  1. Go to https://github.com/$REPO/issues and verify"
echo "  2. Set up a Project Board: https://github.com/$REPO/projects"
echo "  3. Enable branch protection: Settings > Branches > Add rule for 'main'"
