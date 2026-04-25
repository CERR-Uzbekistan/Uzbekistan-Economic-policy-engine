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

function buildSavedIoScenario(): SavedScenarioRecord {
  return {
    ...buildSavedScenario(),
    scenario_id: 'saved-io-1',
    scenario_name: 'Saved I-O export shock',
    assumptions: [
      {
        key: 'io_demand_bucket',
        label: 'Demand shock type',
        value: 'export',
        unit: 'category',
        category: 'trade',
        technical_variable: null,
      },
    ],
    model_ids: ['io-sector-shock'],
    io_sector_shock: {
      model_type: 'io_sector_shock',
      title: 'Saved I-O export shock',
      data_vintage: '2022',
      source_artifact: 'io_model/io_data.json',
      saved_at: '2026-04-22T10:15:00Z',
      request: {
        demand_bucket: 'export',
        amount: 1000,
        currency: 'bln_uzs',
        distribution: 'output',
      },
      totals: {
        input_shock: 1000,
        input_currency: 'bln_uzs',
        demand_shock_bln_uzs: 1000,
        output_effect_bln_uzs: 1600,
        value_added_effect_bln_uzs: 650,
        gdp_accounting_contribution_bln_uzs: 650,
        employment_effect_persons: 2400,
        aggregate_output_multiplier: 1.6,
      },
      top_sectors: [
        {
          sector_code: 'A01',
          sector_name: 'Agriculture',
          output_effect_bln_uzs: 200,
          value_added_effect_bln_uzs: 80,
          output_multiplier: 1.4,
          value_added_multiplier: 0.6,
          backward_linkage: 1.1,
          forward_linkage: 0.9,
          linkage_classification: 'backward',
          employment_effect_persons: 900,
        },
      ],
      caveats: ['Sector transmission only.'],
    },
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

  it('keeps I-O saved runs out of the macro comparison rows', () => {
    const ioScenario = buildSavedIoScenario()
    const workspace = mergeSavedScenariosIntoWorkspace(
      comparisonWorkspaceMock,
      [ioScenario],
      [ioScenario.scenario_id],
    )
    const content = composeComparisonContent(
      workspace,
      comparisonWorkspaceMock.default_selected_ids,
      comparisonWorkspaceMock.default_baseline_id,
    )

    assert.equal(workspace.scenarios.some((scenario) => scenario.scenario_id === ioScenario.scenario_id), false)
    assert.equal(content.metrics.length, 7)
    assert.equal(content.scenarios.length, comparisonWorkspaceMock.default_selected_ids.length)
  })
})
