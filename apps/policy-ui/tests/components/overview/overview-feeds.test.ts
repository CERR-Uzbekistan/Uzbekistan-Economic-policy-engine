import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { buildSavedScenarioFeedRows } from '../../../src/components/overview/overview-feed-utils.js'
import { scenarioLabWorkspaceMock } from '../../../src/data/mock/scenario-lab.js'
import { clearAllScenarios, listScenarios, saveScenario } from '../../../src/state/scenarioStore.js'
import { installMemoryStorage } from '../../helpers/memory-storage.js'

function buildScenarioInput(scenarioId: string, scenarioName: string) {
  return {
    scenario_id: scenarioId,
    scenario_name: scenarioName,
    scenario_type: 'alternative' as const,
    tags: ['fiscal'],
    description: 'Feed appearance regression test.',
    assumptions: scenarioLabWorkspaceMock.assumptions.slice(0, 2).map((assumption, index) => ({
      key: assumption.key,
      label: assumption.label,
      value: index + 1,
      unit: assumption.unit,
      category: assumption.category,
      technical_variable: assumption.technical_variable,
    })),
    model_ids: ['dfm', 'qpm'],
    data_version: '2026Q1',
    created_at: '',
    updated_at: '',
    created_by: '',
  }
}

describe('OverviewFeeds saved-scenario feed rows', () => {
  let storageHandle: ReturnType<typeof installMemoryStorage> | null = null

  beforeEach(() => {
    storageHandle = installMemoryStorage()
    storageHandle.storage.clear()
    clearAllScenarios()
  })

  afterEach(() => {
    clearAllScenarios()
    storageHandle?.restore()
    storageHandle = null
  })

  it('reflects store changes after save (save -> appears in feed rows)', () => {
    const beforeRows = buildSavedScenarioFeedRows(listScenarios(), 'en', null, 'YOU')
    assert.equal(beforeRows.length, 0)

    const saved = saveScenario(buildScenarioInput('scenario-feed-1', 'Feed Scenario 1'))
    const sessionId = localStorage.getItem('policy-ui:session-id')
    const afterRows = buildSavedScenarioFeedRows(listScenarios(), 'en', sessionId, 'YOU')

    assert.equal(afterRows.length, 1)
    assert.equal(afterRows[0].scenario_id, saved.scenario_id)
    assert.equal(afterRows[0].scenario_name, 'Feed Scenario 1')
    assert.equal(afterRows[0].model_ids.includes('dfm'), true)
    assert.equal(afterRows[0].model_ids.includes('qpm'), true)
    assert.match(afterRows[0].dateLabel, /YOU/)
  })
})
