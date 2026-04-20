import type {
  ComparisonScenario,
  ScenarioLabAssumptionState,
  ScenarioLabAssumptionInput,
} from '../contracts/data-contract.js'
import { buildScenarioLabResults, scenarioLabWorkspaceMock } from '../data/mock/scenario-lab.js'
import type { SavedScenarioRecord } from './scenarioStore.js'

function toAssumptionState(
  assumptions: SavedScenarioRecord['assumptions'],
  assumptionInputs: ScenarioLabAssumptionInput[],
): ScenarioLabAssumptionState {
  const base = assumptionInputs.reduce<ScenarioLabAssumptionState>((acc, assumption) => {
    acc[assumption.key] = assumption.default_value
    return acc
  }, {})

  for (const item of assumptions) {
    if (typeof item.value === 'number') {
      base[item.key] = item.value
    }
  }
  return base
}

function inferRiskIndex(assumptionState: ScenarioLabAssumptionState): number {
  const values = Object.values(assumptionState).filter((value) => Number.isFinite(value))
  if (values.length === 0) {
    return 30
  }
  const normalizedShock = values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length
  return Math.max(5, Math.min(95, Math.round(30 + normalizedShock * 8)))
}

function toInitialTag(
  scenarioType: SavedScenarioRecord['scenario_type'],
): ComparisonScenario['initial_tag'] {
  if (scenarioType === 'stress') {
    return 'downside_stress'
  }
  return 'balanced'
}

export function toComparisonScenario(saved: SavedScenarioRecord): ComparisonScenario {
  const assumptions = toAssumptionState(saved.assumptions, scenarioLabWorkspaceMock.assumptions)
  const results = buildScenarioLabResults(assumptions)
  const values = results.headline_metrics.reduce<Record<string, number>>((acc, metric) => {
    acc[metric.metric_id] = metric.value
    return acc
  }, {})

  const summaryText =
    saved.description.trim().length > 0
      ? saved.description
      : saved.tags.length > 0
        ? saved.tags.join(', ')
        : saved.data_version

  return {
    scenario_id: saved.scenario_id,
    scenario_name: saved.scenario_name,
    scenario_type: saved.scenario_type,
    summary: summaryText,
    initial_tag: toInitialTag(saved.scenario_type),
    values,
    risk_index: inferRiskIndex(assumptions),
  }
}
