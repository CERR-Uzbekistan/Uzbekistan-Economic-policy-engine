import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import { toComparisonScenario } from '../../src/state/scenarioComparisonAdapter.js'
import type { SavedScenarioRecord } from '../../src/state/scenarioStore.js'

function buildSavedScenarioWithoutRunResults(): SavedScenarioRecord {
  return {
    scenario_id: 'saved-no-results-1',
    scenario_name: 'Saved Without Results',
    scenario_type: 'alternative',
    tags: ['fiscal'],
    description: 'Saved before run-results persistence',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
    created_by: 'session-test',
    assumptions: scenarioLabWorkspaceMock.assumptions.slice(0, 3).map((assumption, index) => ({
      key: assumption.key,
      label: assumption.label,
      value: index === 0 ? 0.5 : -0.5,
      unit: assumption.unit,
      category: assumption.category,
      technical_variable: assumption.technical_variable,
    })),
    model_ids: ['scenario-lab-mock-engine'],
    data_version: 'mock-v1',
    stored_at: '2026-04-22T00:00:00Z',
  }
}

describe('scenarioComparisonAdapter', () => {
  it('synthesizes a ComparisonScenario when persisted baseline/run_results are missing', () => {
    const mapped = toComparisonScenario(buildSavedScenarioWithoutRunResults())

    assert.equal(mapped.scenario_id, 'saved-no-results-1')
    assert.equal(mapped.scenario_name, 'Saved Without Results')
    assert.equal(mapped.scenario_type, 'alternative')
    assert.equal(typeof mapped.values.gdp_growth, 'number')
    assert.equal(typeof mapped.values.inflation, 'number')
    assert.equal(typeof mapped.risk_index, 'number')
  })
})
