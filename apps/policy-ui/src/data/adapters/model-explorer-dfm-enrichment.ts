import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
} from '../../contracts/data-contract.js'
import type { DfmBridgePayload } from '../bridge/dfm-types.js'

const DFM_MODEL_ID = 'dfm-nowcast'
const DFM_SOURCE_ARTIFACT = 'apps/policy-ui/public/data/dfm.json'

const DFM_CAVEAT_TITLES: Record<string, string> = {
  'dfm-single-factor': 'Single-factor nowcast',
  'dfm-fan-chart-rmse-constant': 'RMSE fan-chart convention',
  'dfm-quarterly-aggregation': 'Quarterly GDP aggregation',
  'dfm-statoffice-latency': 'Official GDP publication lag',
  'dfm-parameters-frozen-at-refit': 'Parameters frozen at refit',
  'dfm-vintage-backtest-blocked': 'Vintage backtest blocked',
  'dfm-contribution-guardrail': 'Contribution guardrail',
}

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatNumber(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

function forecastHorizonLabel(payload: DfmBridgePayload): string {
  const count = payload.nowcast.forecast_horizon.length
  return count === 1 ? '1 quarter' : `${count} quarters`
}

function dfmRowSummary(payload: DfmBridgePayload) {
  const targetRows = payload.indicators.filter(
    (indicator) => indicator.frequency === 'quarterly' || indicator.category === 'Target variable',
  ).length
  const highFrequencyRows = Math.max(0, payload.indicators.length - targetRows)

  return {
    highFrequencyRows,
    targetRows,
    publishedRows: payload.indicators.length,
    label: `${highFrequencyRows} high-frequency inputs + ${targetRows} quarterly GDP target`,
  }
}

export function toModelExplorerDfmBridgeEvidence(payload: DfmBridgePayload): ModelBridgeEvidence {
  const rows = dfmRowSummary(payload)

  return {
    status_label: 'Validated',
    source_artifact: DFM_SOURCE_ARTIFACT,
    data_version: payload.attribution.data_version,
    exported_at: toIsoDateLabel(payload.metadata.exported_at),
    solver_version: payload.metadata.solver_version,
    framework: 'Mixed-frequency dynamic factor model',
    units: 'GDP growth in percent; indicator latest values remain in native units',
    evidence_metrics: [
      { label: 'Current quarter', value: payload.nowcast.current_quarter.period },
      { label: 'Published rows', value: String(rows.publishedRows) },
      { label: 'Input rows', value: String(rows.highFrequencyRows) },
      { label: 'Latent factors', value: String(payload.factor.n_factors) },
      { label: 'Forward horizon', value: forecastHorizonLabel(payload) },
      { label: 'Export mode', value: payload.metadata.export_mode },
      { label: 'Public status', value: payload.metadata.readiness_status.public_status },
      { label: 'Source data status', value: payload.metadata.source_audit.workbook_status },
      { label: 'Transform coverage', value: payload.metadata.transformation_map.public_indicator_coverage },
      { label: 'Refit status', value: payload.metadata.refit_status.status },
      { label: 'Backtest status', value: payload.metadata.backtest_status.status },
      {
        label: 'Uncertainty range',
        value: `${payload.metadata.uncertainty_range.status} (${formatNumber(payload.metadata.uncertainty_range.sigma_base_pp, 2)} pp)`,
      },
    ],
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}

function withDfmBridge(entry: ModelCatalogEntry, payload: DfmBridgePayload): ModelCatalogEntry {
  const current = payload.nowcast.current_quarter
  const uncertaintyBands = current.uncertainty.bands.length
  const rows = dfmRowSummary(payload)

  return {
    ...entry,
    description: `GDP nowcast bridge artifact for ${current.period}; ${rows.label}, ${payload.factor.n_factors} latent factor, ${forecastHorizonLabel(payload)} forward horizon.`,
    stats: [
      { value: String(rows.highFrequencyRows), label: 'Inputs' },
      { value: String(payload.factor.n_factors), label: 'Factor' },
      { value: current.period, label: 'Quarter' },
    ],
    purpose:
      'Mixed-frequency DFM that maps high-frequency indicators into a quarterly GDP growth nowcast. The public artifact carries one current-quarter nowcast, standardized factor-contribution diagnostics, and uncertainty bands; it does not claim an official GDP forecast.',
    parameters: [
      {
        symbol: 'N',
        name: 'Published DFM rows',
        value: String(rows.publishedRows),
        range: rows.label,
      },
      {
        symbol: 'f',
        name: 'Latent factors',
        value: String(payload.factor.n_factors),
        range: 'artifact count',
      },
      {
        symbol: 'h',
        name: 'Published forward horizon',
        value: forecastHorizonLabel(payload),
        range: 'from dfm.json',
      },
      {
        symbol: 'loglik',
        name: 'Kalman filter log likelihood',
        value: formatNumber(payload.factor.loglik, 1),
        range: 'diagnostic',
      },
      {
        symbol: 'bands',
        name: 'Uncertainty bands',
        value: String(uncertaintyBands),
        range: current.uncertainty.methodology_label,
      },
      {
        symbol: 'sigma',
        name: 'Uncertainty sigma',
        value: `${formatNumber(payload.metadata.uncertainty_range.sigma_base_pp, 2)} pp`,
        range: payload.metadata.uncertainty_range.method,
      },
    ],
    caveats: payload.caveats.map((caveat, index) => ({
      id: caveat.caveat_id,
      number: String(index + 1).padStart(2, '0'),
      severity: caveat.severity,
      title: DFM_CAVEAT_TITLES[caveat.caveat_id] ?? caveat.caveat_id.replace(/^dfm-/, '').replace(/-/g, ' '),
      body: caveat.message,
    })),
    data_sources: [
      {
        institution: 'DFM public bridge artifact',
        description: `${rows.label}; factor path, current nowcast, standardized contribution rows, and caveats`,
        vintage_label: payload.attribution.data_version,
      },
      {
        institution: 'DFM source artifact',
        description: `${payload.metadata.source_artifact} (md5 ${payload.metadata.source_artifact_md5 ?? 'not recorded'})`,
        vintage_label: toIsoDateLabel(payload.metadata.source_artifact_exported_at),
      },
      {
        institution: 'DFM export script',
        description: `${payload.metadata.export_script}; mode ${payload.metadata.export_mode}`,
        vintage_label: toIsoDateLabel(payload.metadata.exported_at),
      },
      {
        institution: 'DFM source-model bundle',
        description: `${payload.metadata.source_model_reference.path}; source workbook is reference-only until a reviewed refit path is wired`,
        vintage_label: payload.metadata.source_model_reference.status,
      },
      {
        institution: 'DFM transformation map',
        description: `${payload.metadata.transformation_map.json_artifact}; coverage ${payload.metadata.transformation_map.public_indicator_coverage}`,
        vintage_label: payload.metadata.transformation_map.status,
      },
      {
        institution: 'DFM validation report',
        description: `${payload.metadata.backtest_status.validation_report}; benchmark ${payload.metadata.backtest_status.benchmark}`,
        vintage_label: payload.metadata.backtest_status.vintage_backtest,
      },
    ],
    validation_summary: [
      `Public dfm.json validates against the DFM bridge schema and exposes ${rows.label}, ${payload.factor.n_factors} latent factor, and current quarter ${current.period}.`,
      `The artifact carries ${forecastHorizonLabel(payload)} forward horizon; Overview only uses the DFM chart when its current quarter is ahead of the accepted actual and not older than the Overview nowcast period.`,
      'Frontend validation checks shape, units, periods, factor state, rows, caveats, and metadata; it does not validate model economics or official GDP publication status.',
      'Indicator contribution values are standardized DFM factor signals, not percentage-point GDP-growth effects.',
      `Source workbook status is ${payload.metadata.source_audit.workbook_status}; transform coverage is ${payload.metadata.transformation_map.public_indicator_coverage}, with economist-review blockers retained in the map.`,
      `Refit status is ${payload.metadata.refit_status.status}; ${payload.metadata.refit_status.blocker}`,
      `Validation/backtest status is ${payload.metadata.backtest_status.status}; true DFM vintage backtesting remains ${payload.metadata.backtest_status.vintage_backtest}.`,
      `Uncertainty range is ${payload.metadata.uncertainty_range.status}; it is not an official forecast interval.`,
      'Economist/model-owner sign-off remains unavailable.',
    ],
    bridge_evidence: toModelExplorerDfmBridgeEvidence(payload),
  }
}

export function enrichModelExplorerWorkspaceWithDfmBridge(
  workspace: ModelExplorerWorkspace,
  payload: DfmBridgePayload,
): ModelExplorerWorkspace {
  const catalogEntries = workspace.catalog_entries_by_model_id
  const dfmEntry = catalogEntries?.[DFM_MODEL_ID]
  if (!catalogEntries || !dfmEntry) return workspace

  return {
    ...workspace,
    catalog_entries_by_model_id: {
      ...catalogEntries,
      [DFM_MODEL_ID]: withDfmBridge(dfmEntry, payload),
    },
  }
}
