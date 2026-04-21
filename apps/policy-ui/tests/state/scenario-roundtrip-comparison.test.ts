import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { comparisonWorkspaceMock } from '../../src/data/mock/comparison.js'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import { toComparisonScenario } from '../../src/state/scenarioComparisonAdapter.js'
import {
  clearAllScenarios,
  deleteScenario,
  listScenarios,
  saveScenario,
} from '../../src/state/scenarioStore.js'
import { installMemoryStorage } from '../helpers/memory-storage.js'

const sentinelAttribution = {
  model_id: 'scenario-lab-mock-engine',
  model_name: 'Scenario Lab Mock',
  module: 'scenario-lab',
  version: '1.0.0',
  run_id: 'run-sentinel',
  data_version: '2025Q4',
  timestamp: '2026-04-01T12:00:00Z',
}

function buildSentinelChart() {
  return {
    chart_id: 'sentinel-chart',
    title: 'Sentinel',
    subtitle: '',
    chart_type: 'line' as const,
    x: { label: 'Year', unit: '', values: ['2026'] },
    y: { label: '%', unit: '%', values: [] },
    series: [{ series_id: 's1', label: 'Alt', semantic_role: 'alternative' as const, values: [42] }],
    view_mode: 'level' as const,
    uncertainty: [],
    takeaway: 'Sentinel',
    model_attribution: [sentinelAttribution],
  }
}

function buildSentinelHeadlineMetric(metricId: string, value: number) {
  return {
    metric_id: metricId,
    label: metricId,
    value,
    unit: '%',
    period: '2026',
    baseline_value: 0,
    delta_abs: value,
    delta_pct: null,
    direction: 'up' as const,
    confidence: 'medium' as const,
    last_updated: '2026-04-01T12:00:00Z',
    model_attribution: [sentinelAttribution],
  }
}

function buildIntegrationScenario() {
  return {
    scenario_id: 'scenario-integration-1',
    scenario_name: 'Integration Scenario',
    scenario_type: 'alternative' as const,
    tags: ['fiscal', 'trade'],
    description: 'Round-trip scenario for comparison listing.',
    assumptions: scenarioLabWorkspaceMock.assumptions.slice(0, 4).map((assumption, index) => ({
      key: assumption.key,
      label: assumption.label,
      value: index % 2 === 0 ? 1.25 : -1.5,
      unit: assumption.unit,
      category: assumption.category,
      technical_variable: assumption.technical_variable,
    })),
    model_ids: ['scenario-lab-mock-engine'],
    data_version: '2025Q4',
    created_at: '',
    updated_at: '',
    created_by: '',
    run_id: 'run-sentinel',
    run_saved_at: '2026-04-01T12:00:00Z',
    run_results: {
      headline_metrics: [
        buildSentinelHeadlineMetric('gdp_growth', 42),
        buildSentinelHeadlineMetric('inflation', -7),
      ],
      charts_by_tab: {
        headline_impact: buildSentinelChart(),
        macro_path: buildSentinelChart(),
        external_balance: buildSentinelChart(),
        fiscal_effects: buildSentinelChart(),
      },
    },
    run_attribution: [sentinelAttribution],
  }
}

function mergeScenariosForComparison() {
  const merged = new Map<string, (typeof comparisonWorkspaceMock.scenarios)[number]>()
  for (const scenario of comparisonWorkspaceMock.scenarios) {
    merged.set(scenario.scenario_id, scenario)
  }
  for (const savedScenario of listScenarios()) {
    const mappedScenario = toComparisonScenario(savedScenario)
    merged.set(mappedScenario.scenario_id, mappedScenario)
  }
  return Array.from(merged.values())
}

describe('scenario store to comparison round trip', () => {
  let localStorageHandle: ReturnType<typeof installMemoryStorage> | null = null

  beforeEach(() => {
    localStorageHandle = installMemoryStorage()
    localStorageHandle.storage.clear()
    clearAllScenarios()
  })

  afterEach(() => {
    clearAllScenarios()
    localStorageHandle?.restore()
    localStorageHandle = null
  })

  it('surfaces a saved scenario in merged comparison scenarios and removes it on delete', () => {
    const savedRecord = saveScenario(buildIntegrationScenario())
    const mergedAfterSave = mergeScenariosForComparison()
    const savedInComparison = mergedAfterSave.find(
      (scenario) => scenario.scenario_id === savedRecord.scenario_id,
    )

    assert.ok(savedInComparison)
    assert.equal(savedInComparison.scenario_name, savedRecord.scenario_name)
    assert.equal(savedInComparison.scenario_type, savedRecord.scenario_type)
    // Sentinel values from the persisted snapshot — the re-run path would never produce these,
    // so their presence confirms the adapter reads from persisted run_results, not assumptions.
    assert.equal(savedInComparison.values.gdp_growth, 42)
    assert.equal(savedInComparison.values.inflation, -7)

    assert.equal(deleteScenario(savedRecord.scenario_id), true)
    const mergedAfterDelete = mergeScenariosForComparison()
    assert.equal(
      mergedAfterDelete.some((scenario) => scenario.scenario_id === savedRecord.scenario_id),
      false,
    )
  })
})
