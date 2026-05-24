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
        description: payload.metadata.source_artifact,
        vintage_label: toIsoDateLabel(payload.metadata.source_artifact_exported_at),
      },
      {
        institution: 'DFM export script',
        description: 'Deterministic JSON export from the checked-in DFM bridge path',
        vintage_label: toIsoDateLabel(payload.metadata.exported_at),
      },
    ],
    validation_summary: [
      `Public dfm.json validates against the DFM bridge schema and exposes ${rows.label}, ${payload.factor.n_factors} latent factor, and current quarter ${current.period}.`,
      `The artifact carries ${forecastHorizonLabel(payload)} forward horizon; Overview only uses the DFM chart when its current quarter is ahead of the accepted actual and not older than the Overview nowcast period.`,
      'Frontend validation checks shape, units, periods, factor state, rows, caveats, and metadata; it does not validate model economics or official GDP publication status.',
      'Indicator contribution values are standardized DFM factor signals, not percentage-point GDP-growth effects.',
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
