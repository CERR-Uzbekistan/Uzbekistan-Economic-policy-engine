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
    assert.ok(typeof savedInComparison.values.gdp_growth === 'number')
    assert.ok(typeof savedInComparison.values.inflation === 'number')

    assert.equal(deleteScenario(savedRecord.scenario_id), true)
    const mergedAfterDelete = mergeScenariosForComparison()
    assert.equal(
      mergedAfterDelete.some((scenario) => scenario.scenario_id === savedRecord.scenario_id),
      false,
    )
  })
})
