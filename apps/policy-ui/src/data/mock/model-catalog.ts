import type {
  ModelCatalogEntry,
  ModelExplorerMeta,
} from '../../contracts/data-contract.js'

// Prompt §4.2: 6-model catalog mapped against the prototype status taxonomy.
// QPM content is seeded verbatim from spec_prototype.html:2058–2303.
// Other 5 models carry structural seed (card + minimal detail). Shot 2 adds
// concise English/source validation prose without claiming unsupported results.

export const modelCatalogEntries: ModelCatalogEntry[] = [
  {
    id: 'qpm-uzbekistan',
    title: 'QPM',
    full_title: 'QPM — New-Keynesian Small Open Economy',
    lifecycle_label: 'Quarterly Projection Model · Active',
    status: { label: '2 Fixes', severity: 'warn' },
    model_type: 'DSGE',
    frequency: 'Quarterly',
    methodology_signature: 'DSGE · Quarterly · New-Keynesian SOE',
    description:
      'Monetary policy transmission, impulse responses, cost-push and demand shocks.',
    stats: [
      { value: '14', label: 'Params' },
      { value: '4', label: 'Equations' },
      { value: 'Q', label: 'Freq.' },
    ],
    purpose:
      'A gap-form New-Keynesian block capturing monetary transmission in a small, commodity-exporting, import-dependent economy. Used for impulse-response analysis of policy-rate, external-demand, and exchange-rate shocks.',
    equations: [
      { id: 'qpm_is', label: 'IS · Aggregate demand' },
      { id: 'qpm_phillips', label: 'Phillips · Inflation' },
      { id: 'qpm_taylor', label: 'Taylor · Policy reaction' },
      { id: 'qpm_uip', label: 'UIP · Exchange rate' },
    ],
    parameters: [
      { symbol: 'b_1', name: 'Output persistence', value: '0.60', range: '0.40 – 0.80' },
      { symbol: 'b_2', name: 'Real-rate sensitivity', value: '0.20', range: '0.10 – 0.35' },
      {
        symbol: 'b_3',
        name: 'External demand channel',
        value: '0.00 (inactive)',
        range: '0.00 – 0.45',
        inactive: true,
      },
      { symbol: 'a_1', name: 'Inflation persistence', value: '0.60', range: '0.40 – 0.85' },
      { symbol: 'γ_π', name: 'Inflation response weight', value: '1.50', range: '1.20 – 2.00' },
    ],
    caveats: [
      {
        id: 'qpm-cav-01',
        number: '01',
        severity: 'critical',
        title: 'b₃ external-demand shock is inactive in UI',
        body:
          'The equation term exists; no button routes to it. Russia/China slowdown cannot currently be simulated via QPM.',
        issue_refs: ['#23'],
        target_version: 'v1.1',
      },
      {
        id: 'qpm-cav-02',
        number: '02',
        severity: 'warning',
        title: 'No direct import-price pass-through in Phillips curve',
        body:
          'Pass-through currently only via the RER gap. For an import-dependent economy this underestimates the response to exchange-rate moves.',
      },
      {
        id: 'qpm-cav-03',
        number: '03',
        severity: 'warning',
        title: 'Phillips parameters diverge from FPP',
        body:
          'QPM uses (a₁=0.60, a₂=0.20). FPP uses (λ₁=0.05, λ₂=0.70). These reflect different horizons (quarterly vs annual); reconciliation is documented not reconciled.',
      },
      {
        id: 'qpm-cav-04',
        number: '04',
        severity: 'info',
        title: 'No country-risk premium in UIP',
        body:
          'Capital-flight and sovereign-risk scenarios cannot be tested via UIP as specified. Workaround: apply εˢ shock directly.',
      },
      {
        id: 'qpm-cav-05',
        number: '05',
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
      'Simulated inflation IRF vs. Uzbek SVAR (2015–2024): peak response within ±0.3 pp, timing consistent at 4–5 quarters.',
      'Calibrated from Berg et al. (2006) and regional analogues; no formal estimation.',
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
    description: 'GDP nowcasting via Kalman filter; 34 indicators, 3-month forecast horizon.',
    stats: [
      { value: '34', label: 'Indicators' },
      { value: '1', label: 'Factor' },
      { value: 'M', label: 'Freq.' },
    ],
    purpose:
      'Single-factor mixed-frequency DFM with a Kalman smoother. Produces a real-time GDP nowcast and a 3-month-ahead forecast from 34 monthly indicators.',
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
        description: '34 monthly activity indicators',
        vintage_label: 'Apr 2026',
      },
      {
        institution: 'Central Bank of Uzbekistan',
        description: 'Financial and monetary high-frequency series',
        vintage_label: 'Apr 2026',
      },
    ],
    validation_summary: [
      'Nowcast validation is limited to real-time monitoring of incoming monthly indicators and published empirical uncertainty bands.',
      'Single-factor loadings remain a caveat; sector-specific divergence is not yet validated in this UI.',
    ],
  },
  {
    id: 'pe-model',
    title: 'PE',
    full_title: 'PE — Partial Equilibrium, WITS-SMART',
    lifecycle_label: 'Partial Equilibrium · Action required',
    status: { label: 'Fix', severity: 'crit' },
    model_type: 'Partial equilibrium',
    frequency: 'Annual',
    methodology_signature: 'Partial Equilibrium · WITS-SMART',
    description:
      'WTO accession analysis · HS 28–40; trade creation, diversion, and welfare effects.',
    stats: [
      { value: '1.27', label: 'ε (uniform)' },
      { value: '8', label: 'HS chapters' },
      { value: 'Y', label: 'Freq.' },
    ],
    purpose:
      'WITS-SMART partial-equilibrium model covering HS 28–40 chapters for WTO tariff-schedule simulation. Outputs trade creation, diversion, tariff revenue, and consumer welfare estimates.',
    equations: [{ id: 'pe_smart', label: 'Trade creation · SMART elasticity form' }],
    parameters: [
      { symbol: 'ε', name: 'Import demand elasticity (uniform)', value: '1.27', range: '0.8 – 2.2' },
    ],
    caveats: [
      {
        id: 'pe-cav-01',
        number: '01',
        severity: 'critical',
        title: 'Uniform ε masks sectoral heterogeneity',
        body:
          'The uniform elasticity produces materially different welfare conclusions than WITS sector-specific elasticities. Switch to differentiated ε is tracked.',
      },
    ],
    data_sources: [
      {
        institution: 'WITS / UN Comtrade',
        description: 'Bilateral trade flows, applied tariffs',
        vintage_label: '2024',
      },
    ],
    validation_summary: [
      'Validation is limited to WITS/UN Comtrade tariff-flow reconciliation and WITS-SMART mechanics checks.',
      'No differentiated-elasticity validation is claimed while the uniform-elasticity caveat remains open.',
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
    lifecycle_label: 'Computable General Equilibrium · Gap',
    status: { label: 'Gap', severity: 'warn' },
    model_type: 'CGE',
    frequency: 'Annual',
    methodology_signature: 'CGE · 1-2-3 structure',
    description:
      'Computable General Equilibrium with CET/Armington; sectoral shocks, 2021 calibration.',
    stats: [
      { value: '12', label: 'Sliders' },
      { value: '—', label: 'Labor' },
      { value: 'Y', label: 'Freq.' },
    ],
    purpose:
      '1-2-3 CGE framework with CET output transformation and Armington import aggregation; used for sectoral policy shocks and welfare deltas.',
    equations: [
      { id: 'cge_armington', label: 'Armington · Import aggregation' },
      { id: 'cge_cet', label: 'CET · Output transformation' },
    ],
    parameters: [
      { symbol: 'σ_A', name: 'Armington elasticity', value: '2.0', range: '1.5 – 3.0' },
      { symbol: 'σ_T', name: 'CET elasticity', value: '2.0', range: '1.5 – 3.0' },
    ],
    caveats: [
      {
        id: 'cge-cav-01',
        number: '01',
        severity: 'warning',
        title: 'No labor market block',
        body: 'Employment deltas are not computed; treat welfare deltas as partial.',
      },
    ],
    data_sources: [
      {
        institution: 'Statistics Agency',
        description: '2021 SAM, sectoral production accounts',
        vintage_label: '2021',
      },
    ],
    validation_summary: [
      'Calibration is documented for the 1-2-3 Armington/CET structure and 2021 SAM inputs.',
      'Welfare outputs remain caveated, and employment effects are not validated until a labor block exists.',
    ],
  },
  {
    id: 'fpp-fiscal',
    title: 'FPP',
    full_title: 'FPP — Financial Programming & Policies',
    lifecycle_label: 'Financial Programming · IMF CAEM',
    status: { label: 'CA exog.', severity: 'warn' },
    model_type: 'Financial programming',
    frequency: 'Annual',
    methodology_signature: 'Financial Programming · IMF CAEM',
    description: 'Four-sector consistency framework; base 2024, projection 2025–2027.',
    stats: [
      { value: '4', label: 'Sectors' },
      { value: 'IMF', label: 'Framework' },
      { value: 'Y', label: 'Freq.' },
    ],
    purpose:
      'IMF CAEM 4-sector consistency framework (real, fiscal, monetary, external). Enforces balance-sheet identities across sectors; projects 2025–2027 from a 2024 base.',
    equations: [{ id: 'fpp_ca_identity', label: 'Current account · Identity' }],
    parameters: [
      { symbol: 'λ_1', name: 'Inflation persistence (annual)', value: '0.05', range: '—' },
      { symbol: 'λ_2', name: 'Output-gap loading (annual)', value: '0.70', range: '—' },
    ],
    caveats: [
      {
        id: 'fpp-cav-01',
        number: '01',
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
  },
]

export const modelCatalogMeta: ModelExplorerMeta = {
  models_total: modelCatalogEntries.length,
  models_live: modelCatalogEntries.length,
  last_calibration_audit_label: 'Apr 2026',
  open_methodology_issues: 8,
}
