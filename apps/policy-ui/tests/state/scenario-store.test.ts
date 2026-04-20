import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import {
  clearAllScenarios,
  deleteScenario,
  listScenarios,
  loadScenario,
  saveScenario,
} from '../../src/state/scenarioStore.js'
import { installMemoryStorage } from '../helpers/memory-storage.js'

const assumptions = scenarioLabWorkspaceMock.assumptions.slice(0, 2).map((assumption, index) => ({
  key: assumption.key,
  label: assumption.label,
  value: index === 0 ? 1.5 : -2,
  unit: assumption.unit,
  category: assumption.category,
  technical_variable: assumption.technical_variable,
}))

function buildScenarioInput(scenarioId: string, scenarioName: string) {
  return {
    scenario_id: scenarioId,
    scenario_name: scenarioName,
    scenario_type: 'alternative' as const,
    tags: ['monetary'],
    description: 'Stored from test flow.',
    assumptions,
    model_ids: ['scenario-lab-mock-engine'],
    data_version: '2025Q4',
    created_at: '',
    updated_at: '',
    created_by: '',
  }
}

describe('scenarioStore', () => {
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

  it('saveScenario writes a record with full provenance fields', () => {
    const saved = saveScenario(buildScenarioInput('scenario-a', 'Scenario A'))

    assert.equal(saved.scenario_id, 'scenario-a')
    assert.equal(saved.scenario_name, 'Scenario A')
    assert.equal(saved.scenario_type, 'alternative')
    assert.deepEqual(saved.tags, ['monetary'])
    assert.equal(saved.description, 'Stored from test flow.')
    assert.ok(saved.created_by.length > 0)
    assert.ok(Number.isFinite(Date.parse(saved.created_at)))
    assert.ok(Number.isFinite(Date.parse(saved.updated_at)))
    assert.ok(Number.isFinite(Date.parse(saved.stored_at)))
    assert.ok(saved.model_ids.length > 0)
    assert.equal(saved.data_version, '2025Q4')
    assert.equal(saved.assumptions.length, 2)
    assert.ok(saved.assumptions.every((assumptionEntry) => assumptionEntry.technical_variable !== undefined))
  })

  it('populates required provenance fields with non-null values', () => {
    const saved = saveScenario(buildScenarioInput('scenario-provenance', 'Scenario Provenance'))
    const requiredFields: Array<keyof typeof saved> = [
      'scenario_id',
      'scenario_name',
      'scenario_type',
      'description',
      'assumptions',
      'model_ids',
      'created_by',
      'created_at',
      'updated_at',
      'data_version',
      'stored_at',
    ]

    for (const field of requiredFields) {
      const value = saved[field]
      assert.notEqual(value, null)
      if (typeof value === 'string') {
        assert.ok(value.length > 0)
      }
    }
    assert.ok(saved.tags.length >= 0)
  })

  it('loadScenario rehydrates saved records and preserves created_at on updates', async () => {
    const original = saveScenario(buildScenarioInput('scenario-b', 'Scenario B'))
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    const updated = saveScenario({
      ...buildScenarioInput('scenario-b', 'Scenario B updated'),
      created_at: original.created_at,
      updated_at: original.updated_at,
      created_by: original.created_by,
    })
    const loaded = loadScenario('scenario-b')

    assert.ok(loaded)
    assert.equal(updated.created_at, original.created_at)
    assert.equal(loaded.scenario_name, 'Scenario B updated')
    assert.equal(loaded.created_at, original.created_at)
    assert.equal(loaded.created_by, original.created_by)
    assert.ok(Date.parse(updated.updated_at) >= Date.parse(original.updated_at))
  })

  it('listScenarios and deleteScenario manage per-scenario keys', () => {
    saveScenario(buildScenarioInput('scenario-c1', 'Scenario C1'))
    saveScenario(buildScenarioInput('scenario-c2', 'Scenario C2'))

    const keys = localStorageHandle?.storage
      .snapshot()
      .map(([key]) => key)
      .filter((key) => key.startsWith('policy-ui:scenario:'))
    assert.equal(keys?.length, 2)
    assert.equal(keys?.includes('policy-ui:scenario:scenario-c1'), true)
    assert.equal(keys?.includes('policy-ui:scenario:scenario-c2'), true)

    const listed = listScenarios()
    assert.equal(listed.length, 2)
    assert.equal(deleteScenario('scenario-c1'), true)
    assert.equal(deleteScenario('scenario-c1'), false)
    assert.equal(listScenarios().length, 1)
  })

  it('listScenarios returns the same reference on repeated calls when store is unchanged', () => {
    saveScenario(buildScenarioInput('stable-ref-1', 'Stable Ref 1'))
    const first = listScenarios()
    const second = listScenarios()
    assert.equal(
      first,
      second,
      'listScenarios must return a stable reference when nothing changed',
    )
  })

  it('listScenarios returns a new reference after a mutation', () => {
    saveScenario(buildScenarioInput('stable-ref-a', 'Stable Ref A'))
    const before = listScenarios()
    saveScenario(buildScenarioInput('stable-ref-b', 'Stable Ref B'))
    const after = listScenarios()
    assert.notEqual(before, after, 'listScenarios must return a new reference after a save')
  })

  it('clearAllScenarios removes persisted scenario records', () => {
    saveScenario(buildScenarioInput('scenario-d1', 'Scenario D1'))
    saveScenario(buildScenarioInput('scenario-d2', 'Scenario D2'))
    assert.equal(listScenarios().length, 2)

    clearAllScenarios()

    assert.equal(listScenarios().length, 0)
    const scenarioKeys = localStorageHandle?.storage
      .snapshot()
      .map(([key]) => key)
      .filter((key) => key.startsWith('policy-ui:scenario:'))
    assert.equal(scenarioKeys?.length, 0)
  })

  it('returns null and warns when a saved record does not match schema', () => {
    localStorage.setItem('policy-ui:scenario:bad-schema', JSON.stringify({ scenario_id: 'bad-schema' }))
    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = ((message: unknown) => warnings.push(String(message))) as typeof console.warn

    const loaded = loadScenario('bad-schema')

    console.warn = originalWarn
    assert.equal(loaded, null)
    assert.equal(warnings.length > 0, true)
  })
})
