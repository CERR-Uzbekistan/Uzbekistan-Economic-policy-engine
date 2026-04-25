import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { composeComparisonContent } from '../../src/data/adapters/comparison.js'
import { comparisonWorkspaceMock } from '../../src/data/mock/comparison.js'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import {
  addSavedScenarioIdsToSelection,
  mergeSavedScenariosIntoWorkspace,
} from '../../src/state/comparisonSavedScenarios.js'
import type { SavedScenarioRecord } from '../../src/state/scenarioStore.js'

function buildSavedScenario(): SavedScenarioRecord {
  return {
    scenario_id: 'saved-comparison-1',
    scenario_name: 'Saved comparison scenario',
    scenario_type: 'alternative',
    tags: ['fiscal'],
    description: 'Saved run for comparison.',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
    created_by: 'session-test',
    assumptions: scenarioLabWorkspaceMock.assumptions.slice(0, 3).map((assumption, index) => ({
      key: assumption.key,
      label: assumption.label,
      value: index === 0 ? 1.5 : assumption.default_value,
      unit: assumption.unit,
      category: assumption.category,
      technical_variable: assumption.technical_variable,
    })),
    model_ids: ['scenario-lab-mock-engine'],
    data_version: 'mock-v1',
    stored_at: '2026-04-22T10:15:00Z',
  }
}

describe('comparison saved-scenario helpers', () => {
  it('adds a selected saved run through the existing scenario-to-comparison adapter path', () => {
    const savedScenario = buildSavedScenario()
    const workspace = mergeSavedScenariosIntoWorkspace(
      comparisonWorkspaceMock,
      [savedScenario],
      [savedScenario.scenario_id],
    )
    const selectedIds = addSavedScenarioIdsToSelection({
      currentSelectedIds: comparisonWorkspaceMock.default_selected_ids,
      baselineId: comparisonWorkspaceMock.default_baseline_id,
      savedScenarioIds: [savedScenario.scenario_id],
    })
    const content = composeComparisonContent(
      workspace,
      selectedIds,
      comparisonWorkspaceMock.default_baseline_id,
    )

    assert.ok(workspace.scenarios.some((scenario) => scenario.scenario_id === savedScenario.scenario_id))
    assert.ok(content.scenarios.some((scenario) => scenario.id === savedScenario.scenario_id))
    assert.match(
      content.scenarios.map((scenario) => scenario.name).join(' '),
      /Saved comparison scenario/,
    )
  })

  it('preserves existing baseline mock Comparison behavior when no saved runs are added', () => {
    const workspace = mergeSavedScenariosIntoWorkspace(comparisonWorkspaceMock, [buildSavedScenario()], [])
    const content = composeComparisonContent(
      workspace,
      comparisonWorkspaceMock.default_selected_ids,
      comparisonWorkspaceMock.default_baseline_id,
    )

    assert.equal(workspace, comparisonWorkspaceMock)
    assert.equal(content.scenarios.length, comparisonWorkspaceMock.default_selected_ids.length)
    assert.equal(content.baseline_scenario_id, comparisonWorkspaceMock.default_baseline_id)
  })
})
