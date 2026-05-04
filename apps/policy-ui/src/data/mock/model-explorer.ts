import type { ModelExplorerWorkspace } from '../../contracts/data-contract'
import { modelCatalogEntries, modelCatalogMeta } from './model-catalog.js'

const modelCatalogEntriesById = Object.fromEntries(
  modelCatalogEntries.map((entry) => [entry.id, entry]),
)

export const modelExplorerWorkspaceMock: ModelExplorerWorkspace = {
  workspace_id: 'model-explorer-v1',
  generated_at: '2026-04-18T09:20:00+05:00',
  default_model_id: 'qpm-uzbekistan',
  models: [
    {
      model_id: 'qpm-uzbekistan',
      model_name: 'QPM Uzbekistan',
      model_type: 'Semi-structural macro',
      frequency: 'Quarterly',
      status: 'active',
      summary:
        'Semi-structural quarterly model used for policy-rate transmission and inflation path scenarios.',
    },
    {
      model_id: 'dfm-nowcast',
      model_name: 'DFM Nowcast',
      model_type: 'Dynamic factor nowcast',
      frequency: 'Monthly',
      status: 'active',
      summary:
        'Dynamic-factor nowcast that combines high-frequency indicators to update current-quarter growth.',
    },
    {
      model_id: 'fpp-fiscal',
      model_name: 'FPP Fiscal Block',
      model_type: 'Fiscal projection block',
      frequency: 'Quarterly',
      status: 'staging',
      summary:
        'Accounting-style fiscal projection block linking spending, revenue effort, and deficit dynamics.',
    },
  ],
  details_by_model_id: {
    'qpm-uzbekistan': {
      model_id: 'qpm-uzbekistan',
      overview:
        'QPM Uzbekistan is the anchor policy model for medium-term inflation and output-gap trade-offs.',
      assumptions: [
        {
          assumption_id: 'qpm-a1',
          label: 'Neutral policy rate',
          value: '13.0%',
          rationale: 'Anchors medium-term inflation convergence under baseline expectations.',
        },
        {
          assumption_id: 'qpm-a2',
          label: 'Pass-through scaler',
          value: '0.45',
          rationale: 'Controls strength of exchange-rate transmission into core inflation.',
        },
        {
          assumption_id: 'qpm-a3',
          label: 'Inflation target corridor',
          value: '5% ± 1pp',
          rationale: 'Defines policy reaction threshold for persistent inflation deviations.',
        },
      ],
      equations: [
        {
          equation_id: 'qpm-e1',
          title: 'Output gap dynamics',
          expression: 'x_t = 0.7 * x_(t-1) - 0.2 * (r_t - r*) + eps_x_t',
          explanation: 'Output gap narrows with restrictive real rate settings.',
        },
        {
          equation_id: 'qpm-e2',
          title: 'Inflation block',
          expression: 'pi_t = 0.6 * pi_(t-1) + 0.3 * E_t(pi_(t+1)) + 0.1 * x_t + eps_pi_t',
          explanation: 'Inflation depends on persistence, expectations, and domestic demand pressure.',
        },
      ],
      caveats: [
        {
          caveat_id: 'qpm-c1',
          severity: 'warning',
          message: 'Expectation channels are calibrated, not directly estimated on micro survey panels.',
          implication: 'Forward-guidance shocks can be over- or under-sensitive in edge cases.',
        },
        {
          caveat_id: 'qpm-c2',
          severity: 'critical',
          message: 'Large structural breaks require manual re-estimation before policy use.',
          implication: 'Out-of-regime forecasts should be treated as directional only.',
        },
      ],
      data_sources: [
        {
          source_id: 'qpm-d1',
          name: 'Policy rate history',
          provider: 'Central Bank internal',
          frequency: 'Monthly',
          vintage: '2026-04',
          note: 'Mapped to quarterly frequency for model state updates.',
        },
        {
          source_id: 'qpm-d2',
          name: 'CPI and core CPI',
          provider: 'Statistics Agency',
          frequency: 'Monthly',
          vintage: '2026-03',
          note: 'Seasonally adjusted before model ingestion.',
        },
      ],
    },
    'dfm-nowcast': {
      model_id: 'dfm-nowcast',
      overview:
        'DFM Nowcast supports short-horizon monitoring by extracting latent activity factors from mixed-frequency data.',
      assumptions: [
        {
          assumption_id: 'dfm-a1',
          label: 'Indicator panel completeness threshold',
          value: '75%',
          rationale: 'Prevents nowcast updates from sparse publication windows.',
        },
        {
          assumption_id: 'dfm-a2',
          label: 'Publication lag treatment',
          value: 'Kalman backfill',
          rationale: 'Maintains continuity when latest indicators are not yet released.',
        },
      ],
      equations: [
        {
          equation_id: 'dfm-e1',
          title: 'Latent factor transition',
          expression: 'f_t = A * f_(t-1) + u_t',
          explanation: 'Common factor evolves as autoregressive latent state.',
        },
      ],
      caveats: [
        {
          caveat_id: 'dfm-c1',
          severity: 'warning',
          message: 'Signal quality weakens when survey indicators diverge from hard data.',
          implication: 'Nowcast revisions may be larger around turning points.',
        },
      ],
      data_sources: [
        {
          source_id: 'dfm-d1',
          name: 'Industrial production index',
          provider: 'Statistics Agency',
          frequency: 'Monthly',
          vintage: '2026-03',
          note: 'Primary hard activity indicator.',
        },
        {
          source_id: 'dfm-d2',
          name: 'Payments and tax receipts proxy',
          provider: 'Treasury + internal systems',
          frequency: 'Weekly',
          vintage: '2026-04 W2',
          note: 'Used as high-frequency bridge signal.',
        },
      ],
    },
    'fpp-fiscal': {
      model_id: 'fpp-fiscal',
      overview:
        'FPP Fiscal Block projects deficit and financing pressure under alternative spending and revenue assumptions.',
      assumptions: [
        {
          assumption_id: 'fpp-a1',
          label: 'Revenue elasticity to growth',
          value: '1.1',
          rationale: 'Converts real activity changes into tax intake dynamics.',
        },
        {
          assumption_id: 'fpp-a2',
          label: 'Primary spending rule',
          value: 'Baseline + policy adjustments',
          rationale: 'Keeps policy experiments separable from baseline administration path.',
        },
      ],
      equations: [
        {
          equation_id: 'fpp-e1',
          title: 'Fiscal balance identity',
          expression: 'fb_t = rev_t - exp_t - int_t',
          explanation: 'Balance is determined by revenues, primary expenditures, and interest costs.',
        },
      ],
      caveats: [
        {
          caveat_id: 'fpp-c1',
          severity: 'info',
          message: 'Off-budget operations are represented through adjustment coefficients.',
          implication: 'Detailed public-sector coverage still requires reconciliation tables.',
        },
      ],
      data_sources: [
        {
          source_id: 'fpp-d1',
          name: 'Treasury execution dataset',
          provider: 'Ministry of Finance',
          frequency: 'Monthly',
          vintage: '2026-03',
          note: 'Main fiscal-flow source.',
        },
      ],
    },
  },
  catalog_entries_by_model_id: modelCatalogEntriesById,
  meta: modelCatalogMeta,
}
