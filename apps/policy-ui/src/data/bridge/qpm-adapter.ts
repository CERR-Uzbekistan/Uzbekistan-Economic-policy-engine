import type { ComparisonScenario, ComparisonWorkspace } from '../../contracts/data-contract.js'
import { QPM_CANONICAL_SCENARIO_ORDER, type QpmBridgePayload, type QpmScenario } from './qpm-types.js'

/**
 * QPM path index mapped to the headline horizon.
 * 2026 Q4 = index 3 in the 8-quarter path arrays (2026 Q1 through 2027 Q4).
 * Chosen to match Scenario Lab's mock headline metric keying so Comparison
 * and Scenario Lab agree on the same scenario's headline numbers. If this
 * ever changes, both pages must update together or the system becomes
 * visibly inconsistent.
 */
export const QPM_HEADLINE_HORIZON_INDEX = 3

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toSummary(scenario: QpmScenario): string {
  if (scenario.scenario_id === 'baseline') {
    return 'Reference path under baseline calibration and no added shocks.'
  }
  if (scenario.scenario_id === 'rate-cut-100bp') {
    return 'Easier policy stance lifts demand and inflation relative to baseline.'
  }
  if (scenario.scenario_id === 'rate-hike-100bp') {
    return 'Tighter policy stance cools inflation and activity versus baseline.'
  }
  if (scenario.scenario_id === 'exchange-rate-shock') {
    return 'Depreciation shock pushes inflation and policy-rate response upward.'
  }
  return 'External-demand downside proxy weakens activity and raises vulnerability.'
}

function toScenarioType(scenario: QpmScenario): ComparisonScenario['scenario_type'] {
  if (scenario.scenario_id === 'baseline') {
    return 'baseline'
  }
  if (scenario.scenario_id === 'exchange-rate-shock' || scenario.scenario_id === 'remittance-downside') {
    return 'stress'
  }
  return 'alternative'
}

function toInitialTag(scenario: QpmScenario): ComparisonScenario['initial_tag'] {
  if (scenario.scenario_id === 'baseline') {
    return 'balanced'
  }
  if (scenario.scenario_id === 'rate-cut-100bp') {
    return 'aggressive'
  }
  if (scenario.scenario_id === 'rate-hike-100bp') {
    return 'preferred'
  }
  if (scenario.scenario_id === 'exchange-rate-shock') {
    return 'downside_stress'
  }
  return 'downside_stress'
}

function toRiskIndex(scenario: QpmScenario): number {
  const shocks = scenario.shocks_applied
  const weightedMagnitude =
    Math.abs(shocks.rs_shock) * 8 +
    Math.abs(shocks.s_shock) * 2 +
    Math.abs(shocks.gap_shock) * 20 +
    Math.abs(shocks.pie_shock) * 12
  return Math.round(clamp(25 + weightedMagnitude, 5, 95))
}

function toPathValue(path: number[]): number {
  const valueAtHorizon = path[QPM_HEADLINE_HORIZON_INDEX]
  return Number.isFinite(valueAtHorizon) ? valueAtHorizon : path[path.length - 1] ?? 0
}

export function toComparisonScenariosFromQpm(payload: QpmBridgePayload): ComparisonScenario[] {
  const scenarioById = new Map(payload.scenarios.map((scenario) => [scenario.scenario_id, scenario]))
  const orderedScenarios = QPM_CANONICAL_SCENARIO_ORDER.map((scenarioId) => scenarioById.get(scenarioId)).filter(
    (scenario): scenario is QpmScenario => Boolean(scenario),
  )

  return orderedScenarios.map((scenario) => ({
    scenario_id: scenario.scenario_id,
    scenario_name: scenario.scenario_name,
    scenario_type: toScenarioType(scenario),
    summary: toSummary(scenario),
    initial_tag: toInitialTag(scenario),
    values: {
      gdp_growth: toPathValue(scenario.paths.gdp_growth),
      inflation: toPathValue(scenario.paths.inflation),
      policy_rate: toPathValue(scenario.paths.policy_rate),
      exchange_rate: toPathValue(scenario.paths.exchange_rate),
    },
    risk_index: toRiskIndex(scenario),
  }))
}

export function toComparisonWorkspaceFromQpm(payload: QpmBridgePayload): ComparisonWorkspace {
  const scenarios = toComparisonScenariosFromQpm(payload)

  return {
    workspace_id: `comparison-qpm-${payload.attribution.run_id}`,
    generated_at: payload.attribution.timestamp,
    metric_definitions: [
      { metric_id: 'gdp_growth', label: 'GDP growth', unit: '%' },
      { metric_id: 'inflation', label: 'Inflation', unit: '%' },
      { metric_id: 'policy_rate', label: 'Policy rate', unit: '%' },
      { metric_id: 'exchange_rate', label: 'Exchange rate', unit: 'UZS/USD' },
    ],
    scenarios,
    default_baseline_id: 'baseline',
    default_selected_ids: [
      // TA-6b default slots: baseline + symmetric policy alternatives for first render.
      'baseline',
      'rate-cut-100bp',
      'rate-hike-100bp',
    ],
  }
}
