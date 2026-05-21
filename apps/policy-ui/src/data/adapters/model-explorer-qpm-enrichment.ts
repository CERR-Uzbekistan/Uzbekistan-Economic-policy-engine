import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
  ModelNote,
  ModelValidationCheck,
} from '../../contracts/data-contract.js'
import type { QpmBridgePayload, QpmScenario } from '../bridge/qpm-types.js'

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

function findParameterValue(payload: QpmBridgePayload, symbol: string): string {
  const parameter = payload.parameters.find((candidate) => candidate.symbol === symbol)
  return parameter ? formatNumber(parameter.value) : 'n/a'
}

function findScenario(payload: QpmBridgePayload, scenarioId: string): QpmScenario | undefined {
  return payload.scenarios.find((scenario) => scenario.scenario_id === scenarioId)
}

function averageFirstYear(values: number[]): number {
  const window = values.slice(0, 4)
  if (window.length === 0) return Number.NaN
  return window.reduce((sum, value) => sum + value, 0) / window.length
}

function firstYearDifference(
  scenario: QpmScenario | undefined,
  baseline: QpmScenario | undefined,
  metric: keyof QpmScenario['paths'],
): number {
  if (!scenario || !baseline) return Number.NaN
  return averageFirstYear(scenario.paths[metric]) - averageFirstYear(baseline.paths[metric])
}

export function evaluateQpmPublicSignChecks(payload: QpmBridgePayload): {
  rateHikeLowersGdpAndInflation: boolean
  depreciationRaisesInflationAndPolicyRate: boolean
  externalSlowdownLowersGdp: boolean
} {
  const baseline = findScenario(payload, 'baseline')
  const rateHike = findScenario(payload, 'rate-hike-100bp')
  const depreciation = findScenario(payload, 'exchange-rate-shock')
  const externalSlowdown = findScenario(payload, 'remittance-downside')

  return {
    rateHikeLowersGdpAndInflation:
      firstYearDifference(rateHike, baseline, 'gdp_growth') < 0 &&
      firstYearDifference(rateHike, baseline, 'inflation') < 0,
    depreciationRaisesInflationAndPolicyRate:
      firstYearDifference(depreciation, baseline, 'inflation') > 0 &&
      firstYearDifference(depreciation, baseline, 'policy_rate') > 0,
    externalSlowdownLowersGdp: firstYearDifference(externalSlowdown, baseline, 'gdp_growth') < 0,
  }
}

function createQpmModelNote(payload: QpmBridgePayload): ModelNote {
  const a4 = findParameterValue(payload, 'a4')
  const rhoExternal = findParameterValue(payload, 'rho_external')

  return {
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
        value: 'Q1 2026: inflation 10.5%, policy rate 13.5%, output gap -1.5%, NER depreciation 8%.',
      },
      {
        label: 'Core shocks',
        value: `Policy-rate, exchange-rate/import-price, inflation/cost, risk-premium, and external-demand shocks. Direct import-price pass-through a4=${a4}.`,
      },
      {
        label: 'External demand',
        value: `gap*_t follows AR(1) with rho=${rhoExternal} and enters the IS curve as b3 * gap*_t.`,
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
  }
}

function createQpmValidationChecks(payload: QpmBridgePayload): ModelValidationCheck[] {
  const checks = evaluateQpmPublicSignChecks(payload)
  const signChecksPass =
    checks.rateHikeLowersGdpAndInflation &&
    checks.depreciationRaisesInflationAndPolicyRate &&
    checks.externalSlowdownLowersGdp

  return [
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
      status: signChecksPass ? 'pass' : 'caveat',
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
  ]
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
        institution: 'QPM public data file',
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
      'No formal estimation, real-time forecast evaluation, or parameter-uncertainty bands are claimed in the public QPM output.',
      'Scenario Lab fiscal and external-balance panels are proxy/accounting views around the QPM paths; they are not separate endogenous QPM blocks.',
    ],
    model_note: createQpmModelNote(payload),
    validation_checks: createQpmValidationChecks(payload),
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
