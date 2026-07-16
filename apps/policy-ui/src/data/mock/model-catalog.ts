import type {
  ModelCatalogEntry,
  ModelExplorerMeta,
} from '../../contracts/data-contract.js'

// Six-model methodology catalog. QPM, DFM, PE, and I-O are active bridge-backed
// lanes; CGE is a bounded experimental reference, while FPP remains inactive.

export const modelCatalogEntries: ModelCatalogEntry[] = [
  {
    id: 'qpm-uzbekistan',
    title: 'QPM',
    full_title: 'QPM — New-Keynesian Small Open Economy',
    lifecycle_label: 'Quarterly Projection Model · Active',
    status: { label: 'Active', severity: 'ok' },
    model_type: 'Semi-structural',
    frequency: 'Quarterly',
    methodology_signature: 'Semi-structural · Quarterly · Small open economy',
    description:
      'Calibrated monetary-policy scenario block for demand, inflation, exchange-rate, and policy-rate paths.',
    stats: [
      { value: '16', label: 'Params' },
      { value: '4', label: 'Equations' },
      { value: 'Q', label: 'Freq.' },
    ],
    purpose:
      'A gap-form New-Keynesian block capturing monetary transmission in a small, commodity-exporting, import-dependent economy. Used for impulse-response analysis of policy-rate, external-demand, and exchange-rate shocks.',
    model_note: {
      title: 'QPM model note',
      summary:
        'Semi-structural monetary-policy model for GDP-gap, inflation, policy-rate, and exchange-rate scenario paths. It is calibrated, not formally estimated, and not an official forecast.',
      items: [
        {
          label: 'Scope',
          value: 'GDP gap/growth, inflation, policy rate, and exchange rate.',
        },
        {
          label: 'Initial state',
          value:
            'Q1 2026: inflation 10.5%, policy rate 13.5%, output gap -1.5%, NER depreciation 8%.',
        },
        {
          label: 'Core shocks',
          value:
            'Policy-rate, exchange-rate/import-price, inflation/cost, risk-premium, and external-demand shocks. Direct import-price pass-through a4=0.12.',
        },
        {
          label: 'External demand',
          value: 'gap*_t follows AR(1) with rho=0.75 and enters the IS curve as b3 * gap*_t.',
        },
        {
          label: 'Scenario Lab boundary',
          value:
            'Policy rate, exchange rate, risk premium, and external demand are direct QPM channels. Fiscal, tariff, commodity, and remittance controls are proxy mappings; fiscal and current-account panels are accounting views.',
        },
      ],
      boundaries: [
        'No formal estimation or historical forecast evaluation is claimed.',
        'No parameter-uncertainty bands are included in the public QPM output.',
        'Fiscal balance and current-account results should not be read as endogenous QPM blocks.',
      ],
    },
    equations: [
      { id: 'qpm_is', label: 'IS · Aggregate demand' },
      { id: 'qpm_phillips', label: 'Phillips · Inflation' },
      { id: 'qpm_taylor', label: 'Taylor · Policy reaction' },
      { id: 'qpm_uip', label: 'UIP · Exchange rate' },
    ],
    parameters: [
      { symbol: 'b1', name: 'Gap persistence', value: '0.7', range: '0.3 - 0.95' },
      { symbol: 'b2', name: 'MCI sensitivity', value: '0.2', range: '0.05 - 0.6' },
      { symbol: 'b3', name: 'External-demand channel', value: '0.3', range: '0.05 - 0.6' },
      { symbol: 'b4', name: 'Real-rate MCI weight', value: '0.6', range: '0 - 1' },
      { symbol: 'a1', name: 'Inflation persistence', value: '0.6', range: '0.3 - 0.9' },
      { symbol: 'a2', name: 'RMC inflation loading', value: '0.2', range: '0.05 - 0.5' },
      { symbol: 'a3', name: 'Output-gap RMC weight', value: '0.65', range: '0 - 1' },
      { symbol: 'a4', name: 'Import-price pass-through', value: '0.12', range: '0 - 0.5' },
      { symbol: 'g1', name: 'Policy-rate smoothing', value: '0.8', range: '0 - 0.95' },
      { symbol: 'g2', name: 'Taylor inflation response', value: '1.5', range: '1 - 3' },
      { symbol: 'g3', name: 'Taylor output-gap response', value: '0.5', range: '0 - 2' },
      { symbol: 'e1', name: 'UIP backward weight', value: '0.7', range: '0.1 - 0.9' },
      { symbol: 'pi_target', name: 'Inflation target pi*', value: '5', range: '3 - 12' },
      { symbol: 'rs_neutral', name: 'Neutral nominal policy rate', value: '8.5', range: '4 - 20' },
      { symbol: 'potential_growth', name: 'Potential GDP growth', value: '6', range: '2 - 10' },
      { symbol: 'rho_external', name: 'External-demand persistence', value: '0.75', range: '0 - 0.95' },
    ],
    caveats: [
      {
        id: 'qpm-cav-01',
        number: '01',
        severity: 'warning',
        title: 'Phillips parameters diverge from FPP',
        body:
          'QPM uses (a₁=0.60, a₂=0.20). FPP uses (λ₁=0.05, λ₂=0.70). These reflect different horizons (quarterly vs annual); reconciliation is documented not reconciled.',
      },
      {
        id: 'qpm-cav-02',
        number: '02',
        severity: 'info',
        title: 'No persistent country-risk premium',
        body:
          'Sovereign-risk or capital-flight episodes are approximated only by a one-period rho shock in the public scenario path.',
      },
      {
        id: 'qpm-cav-03',
        number: '03',
        severity: 'info',
        title: 'Adaptive expectations',
        body:
          'Forward-looking term πₜ₊₁ᵉ proxied by model forecast; no explicit expectations-formation block.',
      },
    ],
    data_sources: [
      {
        institution: 'Central Bank of Uzbekistan',
        description: 'Policy rate, inflation, monetary aggregates',
        vintage_label: 'Apr 2026',
      },
      {
        institution: 'Statistics Agency',
        description: 'GDP, sectoral output, CPI components',
        vintage_label: 'Q1 2026',
      },
      {
        institution: 'IMF WEO',
        description: 'External demand proxy, foreign rates',
        vintage_label: 'Apr 2026',
      },
      {
        institution: 'CERR calibration',
        description: 'Structural parameter priors, steady states',
        vintage_label: 'Feb 2026',
      },
    ],
    validation_summary: [
      'Public qpm.json validates against the QPM bridge schema and contains the canonical baseline, rate-cut, rate-hike, exchange-rate, and external-demand scenarios.',
      'No formal estimation, real-time forecast evaluation, or parameter-uncertainty bands are claimed in the public QPM output.',
      'Scenario Lab fiscal and external-balance panels are proxy/accounting views around the QPM paths; they are not separate endogenous QPM blocks.',
    ],
    validation_checks: [
      {
        label: 'Baseline initial state',
        status: 'pass',
        detail:
          'Public scenarios start from Q1 2026: inflation 10.5%, policy rate 13.5%, output gap -1.5%, and NER depreciation 8%.',
      },
      {
        label: 'Parameter source',
        status: 'caveat',
        detail:
          'Parameters are calibrated in the QPM export path and surfaced in qpm.json; they are not estimated from an econometric sample.',
      },
      {
        label: 'Impulse-response signs',
        status: 'pass',
        detail:
          'First-year public paths pass sign checks: a rate hike lowers the GDP path and inflation, depreciation raises inflation and the policy rate, and external-demand slowdown lowers the GDP path.',
      },
      {
        label: 'Not estimated',
        status: 'caveat',
        detail:
          'No real-time forecast evaluation, formal parameter estimation, or parameter-uncertainty bands are included.',
      },
      {
        label: 'Economist review needed',
        status: 'needs_review',
        detail:
          'Before official-use claims, review steady states, pass-through priors, risk-premium treatment, and Scenario Lab proxy mappings for fiscal, tariff, commodity, and remittance controls.',
      },
    ],
  },
  {
    id: 'dfm-nowcast',
    title: 'DFM',
    full_title: 'DFM — Dynamic Factor Model, Mixed-Frequency',
    lifecycle_label: 'Dynamic Factor Model · Active',
    status: { label: 'Active', severity: 'ok' },
    model_type: 'Dynamic factor',
    frequency: 'Monthly',
    methodology_signature: 'Dynamic Factor · Mixed-frequency',
    description: 'Current-quarter GDP nowcasting via Kalman filter; 35 high-frequency inputs plus quarterly GDP target.',
    stats: [
      { value: '35', label: 'Inputs' },
      { value: '1', label: 'Factor' },
      { value: 'M', label: 'Freq.' },
    ],
    purpose:
      'Single-factor mixed-frequency DFM with a Kalman smoother. Produces the current-quarter GDP nowcast from high-frequency activity, price, trade, financial, and survey inputs; the checked-in bridge artifact does not publish a forward forecast horizon.',
    model_note: {
      title: 'DFM model note',
      summary:
        'Mixed-frequency GDP nowcast lane backed by the checked-in DFM source bundle and public bridge artifact. It is a model nowcast, not an official GDP forecast.',
      items: [
        {
          label: 'Source bundle',
          value: 'model sources/Fore+Nowcast/DFM with R estimation scripts and data_uzbekistan.xlsx.',
        },
        {
          label: 'Public artifact',
          value: 'apps/policy-ui/public/data/dfm.json, exported from the legacy DFM bridge path.',
        },
        {
          label: 'Rows',
          value: '35 high-frequency input rows plus one quarterly GDP target row in the current source/artifact ledger.',
        },
        {
          label: 'Contribution units',
          value: 'Standardized DFM factor units, not percentage-point GDP effects.',
        },
      ],
      boundaries: [
        'The browser reads the static public artifact; it does not re-estimate the R model.',
        'No real-time vintage backtest or production-grade forecast evaluation is claimed yet.',
        'Single-factor loadings can miss sector-specific divergence during structural breaks.',
      ],
    },
    equations: [
      { id: 'dfm_factor', label: 'Factor · Latent state transition' },
      { id: 'dfm_obs', label: 'Observation · Loadings' },
    ],
    parameters: [
      { symbol: 'φ', name: 'Factor AR(1) persistence', value: '0.85', range: '0.70 – 0.95' },
      { symbol: 'λ̄', name: 'Mean loading', value: '0.52', range: '—' },
    ],
    caveats: [
      {
        id: 'dfm-cav-01',
        number: '01',
        severity: 'warning',
        title: 'Loadings are static',
        body:
          'No time-varying loading block; sectoral reweighting during shocks relies on manual review of factor sign.',
      },
    ],
    data_sources: [
      {
        institution: 'Statistics Agency',
        description: 'Quarterly GDP target plus high-frequency activity, trade, price, services, and construction indicators',
        vintage_label: 'Apr 2026',
      },
      {
        institution: 'Central Bank of Uzbekistan',
        description: 'Financial, monetary, and exchange-rate high-frequency series',
        vintage_label: 'Apr 2026',
      },
    ],
    validation_summary: [
      'Nowcast validation is limited to public bridge schema checks, convergence metadata, source-row coverage, and published empirical uncertainty bands.',
      'Indicator contribution values are standardized factor signals, not percentage-point effects on GDP growth.',
      'Single-factor loadings remain a caveat; sector-specific divergence is not yet validated in this UI.',
    ],
  },
  {
    id: 'pe-model',
    title: 'PE',
    full_title: 'PE — Partial Equilibrium, WITS-SMART',
    lifecycle_label: 'Partial Equilibrium · Active',
    status: { label: 'Active', severity: 'ok' },
    model_type: 'Partial equilibrium',
    frequency: 'Annual',
    methodology_signature: 'Partial Equilibrium · WITS-SMART',
    description:
      'Direct tariff-incidence lane using the public PE trade-flow artifact and section-specific elasticities.',
    stats: [
      { value: '19', label: 'HS sections' },
      { value: '2025', label: 'Base year' },
      { value: '60', label: 'Partners' },
    ],
    purpose:
      'WITS-SMART-style partial-equilibrium lane for direct tariff-cut incidence. It estimates trade creation, trade diversion, welfare, and tariff-revenue changes by HS section; it does not model macro feedback, I-O propagation, or general-equilibrium reallocation.',
    equations: [{ id: 'pe_smart', label: 'Trade creation · SMART elasticity form' }],
    parameters: [
      { symbol: 'Δt', name: 'Tariff reduction', value: '20%', range: '0-100%' },
      { symbol: 'ε_s', name: 'Section-specific elasticity', value: 'Differentiated', range: '0.38-2.8' },
    ],
    caveats: [
      {
        id: 'pe-cav-01',
        number: '01',
        severity: 'warning',
        title: 'Direct channel only',
        body:
          'PE outputs are direct tariff-incidence estimates. They are not macro forecasts, I-O propagation, or general-equilibrium results.',
      },
      {
        id: 'pe-cav-02',
        number: '02',
        severity: 'warning',
        title: 'Partner filters are share-scaled',
        body:
          'Partner and regime filters scale baseline effects by import shares; they do not rerun a partner-specific tariff schedule.',
      },
    ],
    data_sources: [
      {
        institution: 'WITS / UN Comtrade',
        description: 'Bilateral trade flows, applied tariffs',
        vintage_label: '2025',
      },
    ],
    validation_summary: [
      'Public pe.json validates against the PE bridge schema and exposes sections, chapters, partners, elasticities, and caveats.',
      'Scenario Lab keeps PE direct tariff-incidence results separate from QPM, DFM, I-O, and future CGE outputs.',
    ],
  },
  {
    id: 'io-model',
    title: 'I-O',
    full_title: 'I-O — Input-Output, Leontief',
    lifecycle_label: 'Input-Output · Active',
    status: { label: 'Active', severity: 'ok' },
    model_type: 'Input-output',
    frequency: 'Annual',
    methodology_signature: 'Input-Output · Leontief',
    description:
      '136-sector framework; multipliers, forward/backward linkages, 2022 SAM.',
    stats: [
      { value: '136', label: 'Sectors' },
      { value: 'Type I', label: 'Mult.' },
      { value: 'Y', label: 'Freq.' },
    ],
    purpose:
      '136-sector symmetric Leontief framework built from the 2022 SAM. Used for demand-shock propagation and sectoral linkage diagnostics.',
    equations: [{ id: 'io_leontief', label: 'Leontief · Total requirements' }],
    parameters: [
      { symbol: 'A', name: 'Technical coefficients matrix (136×136)', value: 'Calibrated', range: '—' },
    ],
    caveats: [
      {
        id: 'io-cav-01',
        number: '01',
        severity: 'info',
        title: 'No price block',
        body: 'Type-I Leontief; quantity-only. Price and cost-push shocks cannot be tested here.',
      },
    ],
    data_sources: [
      {
        institution: 'Statistics Agency',
        description: 'Supply and use tables (2022 SAM)',
        vintage_label: '2022',
      },
    ],
    validation_summary: [
      'Accounting checks focus on the 2022 SAM balance and Leontief identity consistency.',
      'No price or behavioral response validation is claimed for this quantity-only model.',
    ],
  },
  {
    id: 'cge-model',
    title: 'CGE',
    full_title: 'CGE — 1-2-3 Model',
    lifecycle_label: 'Computable General Equilibrium · Experimental reference',
    status: { label: 'Experimental reference', severity: 'warn' },
    model_type: 'CGE',
    frequency: 'Annual',
    methodology_signature: 'Aggregate 1-2-3 · CET/CES · 2021',
    description:
      'Formula-reconciled aggregate 1-2-3 solver with a bounded public reference lane. It is not model-owner approved or an official forecast.',
    stats: [
      { value: '2021', label: 'Source year' },
      { value: '<0.001%', label: 'Base gap' },
      { value: '2', label: 'Benchmarks' },
    ],
    purpose:
      'Aggregate comparative-static analysis of how import prices, trade taxes, government demand, transfers, remittances, and foreign saving change exports, imports, domestic sales, consumption, investment, tax revenue, and saving. This 1-2-3 model has no sector, labor, household-distribution, or time-path block.',
    model_note: {
      title: 'CGE readiness note',
      summary:
        'The public reference solver reproduces the formula-derived 2021 equilibrium, an energy-price experiment, and a documented gold-workbook calibration variant. It remains experimental and not model-owner approved.',
      items: [
        {
          label: 'Accepted source basis',
          value: 'CGE123(2021)_UZ_IMF_MAIN.xls; formula-derived equilibrium, with stale saved scenario cells excluded.',
        },
        {
          label: 'Closure',
          value: 'Foreign saving is fixed, government saving adjusts, investment is savings-driven, and total output is fixed.',
        },
        {
          label: 'Price normalization',
          value: 'The workbook fixes Er=1 and solves Pd; Python fixes Pd=1 and solves Er. Er is a normalized relative-price index, not UZS/USD.',
        },
        {
          label: 'Base reconciliation',
          value: 'Formula-derived base reproduced within 0.001%; domestic, composite, current-account, and government-budget residuals are below 1e-8.',
        },
        {
          label: 'Independent benchmark',
          value: 'The 21 Dec 2023 energy-price experiment is reproduced within 0.000002 for exports, imports, domestic and composite goods, consumption, and investment.',
        },
      ],
      boundaries: [
        'The public cge.json and bounded Scenario Lab lane are active as experimental reference calculations only.',
        'The model is aggregate: it cannot report sector reallocation, employment, household distribution, or detailed welfare effects.',
        'The 2021 source vintage, closure interpretation, transfer signs, and gold-workbook calibration variant still require model-owner approval.',
      ],
    },
    equations: [
      { id: 'cge_armington', label: 'Armington · Composite supply' },
      { id: 'cge_cet', label: 'CET · Output transformation' },
      { id: 'cge_current_account', label: 'External closure · Current account' },
      { id: 'cge_savings_investment', label: 'Savings closure · Investment' },
    ],
    parameters: [
      { symbol: 'σq', name: 'Armington elasticity', value: '0.70', range: '2021 workbook' },
      { symbol: 'σt', name: 'CET transformation elasticity', value: '0.70', range: '2021 workbook' },
      { symbol: 'bq', name: 'Armington import share', value: '0.320522', range: 'calibrated' },
      { symbol: 'bt', name: 'CET export share', value: '0.821236', range: 'calibrated' },
      { symbol: 'tm', name: 'Import tax rate', value: '1.6159%', range: '2021 workbook' },
      { symbol: 'ts', name: 'Sales tax rate', value: '6.4722%', range: '2021 workbook' },
      { symbol: 'ty', name: 'Income tax rate', value: '2.9781%', range: '2021 workbook' },
      { symbol: 'sy', name: 'Income saving rate', value: '37.8010%', range: '2021 workbook' },
      { symbol: 'B', name: 'Foreign saving', value: '0.038949', range: 'fixed closure' },
      { symbol: 'X', name: 'Aggregate output', value: '1.000000', range: 'fixed normalization' },
    ],
    caveats: [
      {
        id: 'cge-cav-01',
        number: '01',
        severity: 'warning',
        title: 'Source vintage awaits approval',
        body:
          'The solver is reconciled to the primary 2021 workbook, but the model owner has not accepted that vintage for public policy use.',
      },
      {
        id: 'cge-cav-02',
        number: '02',
        severity: 'warning',
        title: 'Closure requires owner sign-off',
        body: 'Fixed foreign saving, savings-driven investment, adjusting government saving, and the equivalent Python numeraire need explicit approval.',
      },
      {
        id: 'cge-cav-03',
        number: '03',
        severity: 'critical',
        title: 'Aggregate model boundary',
        body: 'The 1-2-3 model has no sector, labor, household, distributional, or dynamic forecast block. Do not infer those effects from aggregate results.',
      },
      {
        id: 'cge-cav-04',
        number: '04',
        severity: 'info',
        title: 'Relative-price index only',
        body: 'Er is the price that clears the external account under the chosen numeraire. It is not a nominal UZS/USD exchange-rate forecast.',
      },
    ],
    data_sources: [
      {
        institution: 'Primary CGE source workbook',
        description: 'CGE123(2021)_UZ_IMF_MAIN.xls; formula-derived base equations and calibration',
        vintage_label: '2021',
      },
      {
        institution: 'Independent workbook benchmark',
        description: 'CGE123_2021_21.12.2023.xls; saved world-import-price experiment',
        vintage_label: '21 Dec 2023',
      },      {
        institution: 'Calibration-variant workbook benchmark',
        description: 'CGE123_2021_gold_price.xls; exact only with its alternative Armington calibration',
        vintage_label: 'Source workbook variant',
      },
      {
        institution: 'Python calculation service',
        description: 'Workbook-reconciled CGE 1-2-3 solver with accounting residuals and closure metadata',
        vintage_label: 'Formula-reconciled v1',
      },
    ],
    validation_summary: [
      'The no-shock Python solution reproduces the formula-derived 2021 workbook base within 0.001%, with no material calibration gaps.',
      'Domestic-market, composite-market, current-account, and government-budget residuals are below 1e-8.',
      'Two source-workbook checks are reproduced within tolerance: the energy-price experiment and a gold-workbook alternative Armington calibration variant.',
      'The bounded public lane is experimental; official-use status remains gated on source-vintage, closure, transfer-sign, and calibration-variant decisions.',
    ],
    validation_checks: [
      {
        label: 'Formula-derived base equilibrium',
        status: 'pass',
        detail: 'Exports, imports, domestic and composite goods, income, consumption, saving, investment, taxes, and government saving reproduce the accepted workbook formulas within 0.001%.',
      },
      {
        label: 'Accounting identities',
        status: 'pass',
        detail: 'All four reported market and budget residuals are tested below 1e-8.',
      },
      {
        label: 'Energy-price benchmark',
        status: 'pass',
        detail: 'The independently saved 21 Dec 2023 import-price experiment is reproduced within 0.000002 for six real quantities.',
      },
      {
        label: 'Gold-workbook calibration variant',
        status: 'pass',
        detail: 'The gold workbook is reproduced only with its documented alternative Armington calibration and is not presented as a pure isolated gold-price shock.',
      },
      {
        label: 'Model-owner decisions',
        status: 'needs_review',
        detail: 'The 2021 vintage, closure, transfer sign, foreign inflow definitions, and public interpretation remain awaiting explicit approval.',
      },
    ],
    bridge_evidence: {
      status_label: 'Experimental reference · formula-reconciled',
      source_artifact: 'CGE123(2021)_UZ_IMF_MAIN.xls',
      data_version: '2021 formula-derived equilibrium',
      exported_at: '2026-07-16',
      solver_version: 'CGE 1-2-3 formula-reconciled v1',
      framework: 'Aggregate 1-2-3 · CET/CES',
      units: 'Normalized 2021 economy totals (X=1)',
      evidence_metrics: [
        { label: 'Maximum base gap', value: '<0.001%' },
        { label: 'Accounting residuals', value: '<1e-8' },
        { label: 'Benchmark tolerance', value: '0.000002' },
        { label: 'Exact benchmarks', value: '2' },
      ],
      caveats: [
        'The public cge.json powers a bounded experimental reference lane; it is not model-owner approved.',
        'Er is a normalized relative-price index, not a UZS/USD forecast.',
      ],
    },
    activation_requirements: [
      'Approve the 2021 source workbook, fixed-foreign-saving/savings-driven closure, transfer sign, and foreign inflow definitions.',
      'Review and accept the energy benchmark and gold-workbook calibration variant for official use.',
      'Approve public interpretation of the four bounded controls before promoting the lane beyond experimental reference status.',
    ],
  },
  {
    id: 'fpp-fiscal',
    title: 'FPP',
    full_title: 'FPP — Financial Programming & Policies',
    lifecycle_label: 'Financial Programming · Not active',
    status: { label: 'Not active', severity: 'warn' },
    model_type: 'Financial programming',
    frequency: 'Annual',
    methodology_signature: 'Financial Programming · IMF CAEM',
    description: 'Planned four-sector consistency lane. Not connected to public artifacts or runs yet.',
    stats: [
      { value: 'Missing', label: 'Artifact' },
      { value: 'Needed', label: 'Identity tests' },
      { value: 'Gated', label: 'Scenario UI' },
    ],
    purpose:
      'Planned financial-programming lane for real, fiscal, monetary, and external consistency checks. It remains reference-only until public inputs, identities, and projection outputs are accepted.',
    equations: [{ id: 'fpp_ca_identity', label: 'Current account · Identity' }],
    parameters: [
      { symbol: 'λ_1', name: 'Inflation persistence (annual)', value: '0.05', range: '—' },
      { symbol: 'λ_2', name: 'Output-gap loading (annual)', value: '0.70', range: '—' },
    ],
    caveats: [
      {
        id: 'fpp-cav-01',
        number: '01',
        severity: 'critical',
        title: 'No accepted public artifact',
        body:
          'The current app has methodology notes only. There is no checked-in FPP artifact, guard, adapter, or Scenario Lab result contract.',
      },
      {
        id: 'fpp-cav-02',
        number: '02',
        severity: 'warning',
        title: 'Current account exogenous',
        body:
          'CA is treated as an exogenous projection input rather than solved jointly with the monetary block; iteration with QPM is manual.',
      },
    ],
    data_sources: [
      {
        institution: 'IMF CAEM',
        description: 'Regional projections, consistency templates',
        vintage_label: '2025',
      },
      {
        institution: 'Ministry of Finance',
        description: 'Fiscal accounts, debt stock',
        vintage_label: '2024',
      },
    ],
    validation_summary: [
      'Consistency checks focus on four-sector accounting identities and IMF CAEM projection templates.',
      'Current-account behavior remains exogenous, so external adjustment should not be read as jointly solved.',
    ],
    activation_requirements: [
      'Accepted public FPP artifact with sector accounts, projection assumptions, and balance identities.',
      'Guard and adapter tests proving accounting identities hold across real, fiscal, monetary, and external blocks.',
      'Scenario Lab output lane that keeps FPP consistency checks separate from QPM forecasts and I-O multipliers.',
    ],
  },
]

export const modelCatalogMeta: ModelExplorerMeta = {
  models_total: modelCatalogEntries.length,
  models_live: 5,
  last_calibration_audit_label: 'Apr 2026',
  open_methodology_issues: 6,
}
