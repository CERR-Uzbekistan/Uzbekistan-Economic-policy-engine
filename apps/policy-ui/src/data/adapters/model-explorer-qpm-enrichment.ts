import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
} from '../../contracts/data-contract.js'
import type { QpmBridgePayload } from '../bridge/qpm-types.js'

const QPM_MODEL_ID = 'qpm-uzbekistan'
const QPM_SOURCE_ARTIFACT = 'apps/policy-ui/public/data/qpm.json'

const QPM_CAVEAT_TITLES: Record<string, string> = {
  'qpm-external-demand-ar1': 'External demand AR(1)',
  'qpm-baseline-irf-reconciliation': 'Baseline solver reconciliation',
  'qpm-uip-no-risk-premium': 'UIP has no persistent risk premium',
  'qpm-direct-import-passthrough': 'Direct import-price pass-through',
  'qpm-no-uncertainty-bands': 'No uncertainty bands in public artifact',
  'qpm-baseline-disinflation-overshoot': 'Baseline disinflation overshoot',
}

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatNumber(value: number): string {
  return String(value)
}

function formatParameterRange(rangeMin: number, rangeMax: number): string {
  return `${formatNumber(rangeMin)} - ${formatNumber(rangeMax)}`
}

export function toModelExplorerQpmBridgeEvidence(payload: QpmBridgePayload): ModelBridgeEvidence {
  const scenario = payload.scenarios[0]
  return {
    status_label: 'Validated',
    source_artifact: QPM_SOURCE_ARTIFACT,
    data_version: payload.attribution.data_version,
    exported_at: toIsoDateLabel(payload.metadata.exported_at),
    solver_version: payload.metadata.solver_version,
    framework: 'Semi-structural QPM',
    units: 'Percent, percentage points, and UZS/USD levels',
    evidence_metrics: [
      { label: 'Scenarios', value: String(payload.scenarios.length) },
      { label: 'Public parameters', value: String(payload.parameters.length) },
      { label: 'Horizon', value: `${scenario?.horizon_quarters ?? 0} quarters` },
    ],
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}

function withQpmBridge(entry: ModelCatalogEntry, payload: QpmBridgePayload): ModelCatalogEntry {
  return {
    ...entry,
    stats: [
      { value: String(payload.parameters.length), label: 'Params' },
      { value: String(payload.scenarios.length), label: 'Scenarios' },
      { value: 'Q', label: 'Freq.' },
    ],
    parameters: payload.parameters.map((parameter) => ({
      symbol: parameter.symbol,
      name: parameter.label,
      value: formatNumber(parameter.value),
      range: formatParameterRange(parameter.range_min, parameter.range_max),
    })),
    caveats: payload.caveats.map((caveat, index) => ({
      id: caveat.caveat_id,
      number: String(index + 1).padStart(2, '0'),
      severity: caveat.severity,
      title: QPM_CAVEAT_TITLES[caveat.caveat_id] ?? caveat.caveat_id.replace(/^qpm-/, '').replace(/-/g, ' '),
      body: caveat.message,
    })),
    data_sources: [
      {
        institution: 'QPM public bridge artifact',
        description: `${payload.scenarios.length} canonical scenarios and ${payload.parameters.length} public parameters`,
        vintage_label: payload.attribution.data_version,
      },
      {
        institution: 'QPM export solver',
        description: 'Deterministic scenario export from the checked-in QPM solver path',
        vintage_label: toIsoDateLabel(payload.metadata.exported_at),
      },
      {
        institution: 'Model calibration',
        description: 'Initial conditions and parameters documented in the QPM artifact caveats',
        vintage_label: payload.metadata.solver_version,
      },
    ],
    validation_summary: [
      'Public qpm.json validates against the QPM bridge schema and contains the canonical baseline, rate-cut, rate-hike, exchange-rate, and external-demand scenarios.',
      'No formal estimation, real-time forecast evaluation, or parameter-uncertainty bands are claimed in the public artifact.',
    ],
    bridge_evidence: toModelExplorerQpmBridgeEvidence(payload),
  }
}

export function enrichModelExplorerWorkspaceWithQpmBridge(
  workspace: ModelExplorerWorkspace,
  payload: QpmBridgePayload,
): ModelExplorerWorkspace {
  const catalogEntries = workspace.catalog_entries_by_model_id
  const qpmEntry = catalogEntries?.[QPM_MODEL_ID]
  if (!catalogEntries || !qpmEntry) return workspace

  return {
    ...workspace,
    catalog_entries_by_model_id: {
      ...catalogEntries,
      [QPM_MODEL_ID]: withQpmBridge(qpmEntry, payload),
    },
  }
}
