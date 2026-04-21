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
      .filter((key) => key.startsWith('policy-ui:scenario.v2:'))
    assert.equal(keys?.length, 2)
    assert.equal(keys?.includes('policy-ui:scenario.v2:scenario-c1'), true)
    assert.equal(keys?.includes('policy-ui:scenario.v2:scenario-c2'), true)

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
      .filter((key) => key.startsWith('policy-ui:scenario.v2:'))
    assert.equal(scenarioKeys?.length, 0)
  })

  it('returns null and warns when a saved record does not match schema', () => {
    localStorage.setItem('policy-ui:scenario.v2:bad-schema', JSON.stringify({ scenario_id: 'bad-schema' }))
    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = ((message: unknown) => warnings.push(String(message))) as typeof console.warn

    const loaded = loadScenario('bad-schema')

    console.warn = originalWarn
    assert.equal(loaded, null)
    assert.equal(warnings.length > 0, true)
  })

  it('round-trips governance metadata on run_interpretation bit-for-bit', () => {
    saveScenario({
      ...buildScenarioInput('scenario-gov-1', 'Scenario Governance'),
      run_interpretation: {
        what_changed: ['policy rate lifted 50bps'],
        why_it_changed: ['inflation persistence elevated'],
        key_risks: ['wage-price spiral'],
        policy_implications: ['tighten for longer'],
        suggested_next_scenarios: ['fx pass-through stress'],
        generation_mode: 'assisted',
        reviewer_name: 'X. Reviewer',
        reviewed_at: '2026-03-15T09:00:00Z',
      },
    })

    const loaded = loadScenario('scenario-gov-1')
    assert.ok(loaded)
    assert.ok(loaded.run_interpretation)
    assert.equal(loaded.run_interpretation.generation_mode, 'assisted')
    assert.equal(loaded.run_interpretation.reviewer_name, 'X. Reviewer')
    assert.equal(loaded.run_interpretation.reviewed_at, '2026-03-15T09:00:00Z')
    assert.deepEqual(loaded.run_interpretation.what_changed, ['policy rate lifted 50bps'])
    assert.deepEqual(loaded.run_interpretation.why_it_changed, ['inflation persistence elevated'])
  })

  it('round-trips run_id, run_saved_at, run_results and run_attribution', () => {
    const runAttribution = {
      model_id: 'qpm-mock',
      model_name: 'QPM Mock',
      module: 'qpm',
      version: '1.0.0',
      run_id: 'run-abc',
      data_version: '2025Q4',
      timestamp: '2026-04-01T12:00:00Z',
    }
    const headlineMetric = {
      metric_id: 'gdp_growth',
      label: 'GDP growth',
      value: 42,
      unit: '%',
      period: '2026',
      baseline_value: 4,
      delta_abs: 38,
      delta_pct: null,
      direction: 'up' as const,
      confidence: 'medium' as const,
      last_updated: '2026-04-01T12:00:00Z',
      model_attribution: [runAttribution],
    }
    const chartSpec = {
      chart_id: 'headline-impact-chart',
      title: 'Headline impact',
      subtitle: 'Sentinel',
      chart_type: 'line' as const,
      x: { label: 'Year', unit: '', values: ['2026'] },
      y: { label: '%', unit: '%', values: [] },
      series: [{ series_id: 's1', label: 'Alt', semantic_role: 'alternative' as const, values: [42] }],
      view_mode: 'level' as const,
      uncertainty: [],
      takeaway: 'Sentinel',
      model_attribution: [runAttribution],
    }

    saveScenario({
      ...buildScenarioInput('scenario-output-1', 'Scenario Outputs'),
      run_id: 'run-abc',
      run_saved_at: '2026-04-01T12:00:00Z',
      run_results: {
        headline_metrics: [headlineMetric],
        charts_by_tab: {
          headline_impact: chartSpec,
          macro_path: chartSpec,
          external_balance: chartSpec,
          fiscal_effects: chartSpec,
        },
      },
      run_attribution: [runAttribution],
    })

    const loaded = loadScenario('scenario-output-1')
    assert.ok(loaded)
    assert.equal(loaded.run_id, 'run-abc')
    assert.equal(loaded.run_saved_at, '2026-04-01T12:00:00Z')
    assert.ok(loaded.run_results)
    assert.deepEqual(loaded.run_results.headline_metrics, [headlineMetric])
    assert.deepEqual(loaded.run_results.charts_by_tab.headline_impact, chartSpec)
    assert.ok(loaded.run_attribution)
    assert.deepEqual(loaded.run_attribution, [runAttribution])
  })

  it('ignores legacy v1 entries and leaves them byte-identical in storage', () => {
    const legacyPayload = JSON.stringify({
      scenario_id: 'legacy-entry',
      scenario_name: 'Legacy',
      scenario_type: 'alternative',
      tags: [],
      description: '',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      created_by: 'legacy-session',
      assumptions: [],
      model_ids: ['legacy-model'],
      data_version: '2024Q4',
      stored_at: '2025-01-01T00:00:00Z',
    })
    localStorage.setItem('policy-ui:scenario:legacy-entry', legacyPayload)

    const listed = listScenarios()
    assert.deepEqual(listed, [])
    assert.equal(localStorage.getItem('policy-ui:scenario:legacy-entry'), legacyPayload)
  })

  it('rejects persisted run_results missing a required tab', () => {
    const runAttribution = {
      model_id: 'qpm-mock',
      model_name: 'QPM Mock',
      module: 'qpm',
      version: '1.0.0',
      run_id: 'run-tab',
      data_version: '2025Q4',
      timestamp: '2026-04-01T12:00:00Z',
    }
    const headlineMetric = {
      metric_id: 'gdp_growth',
      label: 'GDP growth',
      value: 42,
      unit: '%',
      period: '2026',
      baseline_value: 4,
      delta_abs: 38,
      delta_pct: null,
      direction: 'up' as const,
      confidence: 'medium' as const,
      last_updated: '2026-04-01T12:00:00Z',
      model_attribution: [runAttribution],
    }
    const chartSpec = {
      chart_id: 'headline-impact-chart',
      title: 'Headline impact',
      subtitle: 'Sentinel',
      chart_type: 'line' as const,
      x: { label: 'Year', unit: '', values: ['2026'] },
      y: { label: '%', unit: '%', values: [] },
      series: [{ series_id: 's1', label: 'Alt', semantic_role: 'alternative' as const, values: [42] }],
      view_mode: 'level' as const,
      uncertainty: [],
      takeaway: 'Sentinel',
      model_attribution: [runAttribution],
    }

    const brokenRecord = {
      scenario_id: 'scenario-missing-tab',
      scenario_name: 'Missing Tab',
      scenario_type: 'alternative',
      tags: [],
      description: '',
      created_at: '2026-04-01T12:00:00Z',
      updated_at: '2026-04-01T12:00:00Z',
      created_by: 'test-session',
      assumptions,
      model_ids: ['scenario-lab-mock-engine'],
      data_version: '2025Q4',
      stored_at: '2026-04-01T12:00:00Z',
      run_id: 'run-tab',
      run_saved_at: '2026-04-01T12:00:00Z',
      run_results: {
        headline_metrics: [headlineMetric],
        charts_by_tab: {
          headline_impact: chartSpec,
          macro_path: chartSpec,
          external_balance: chartSpec,
          // fiscal_effects deliberately missing — renderer would crash on navigation.
        },
      },
      run_attribution: [runAttribution],
    }
    localStorage.setItem(
      `policy-ui:scenario.v2:${brokenRecord.scenario_id}`,
      JSON.stringify(brokenRecord),
    )

    const originalWarn = console.warn
    console.warn = (() => {}) as typeof console.warn
    const listed = listScenarios()
    console.warn = originalWarn

    assert.equal(
      listed.find((entry) => entry.scenario_id === brokenRecord.scenario_id),
      undefined,
      'expected broken record (missing required tab) to be filtered out',
    )
  })

  it('rejects persisted run_results with a chart missing required axis', () => {
    const runAttribution = {
      model_id: 'qpm-mock',
      model_name: 'QPM Mock',
      module: 'qpm',
      version: '1.0.0',
      run_id: 'run-axis',
      data_version: '2025Q4',
      timestamp: '2026-04-01T12:00:00Z',
    }
    const headlineMetric = {
      metric_id: 'gdp_growth',
      label: 'GDP growth',
      value: 42,
      unit: '%',
      period: '2026',
      baseline_value: 4,
      delta_abs: 38,
      delta_pct: null,
      direction: 'up' as const,
      confidence: 'medium' as const,
      last_updated: '2026-04-01T12:00:00Z',
      model_attribution: [runAttribution],
    }
    const validChart = {
      chart_id: 'headline-impact-chart',
      title: 'Headline impact',
      subtitle: 'Sentinel',
      chart_type: 'line' as const,
      x: { label: 'Year', unit: '', values: ['2026'] },
      y: { label: '%', unit: '%', values: [] },
      series: [{ series_id: 's1', label: 'Alt', semantic_role: 'alternative' as const, values: [42] }],
      view_mode: 'level' as const,
      uncertainty: [],
      takeaway: 'Sentinel',
      model_attribution: [runAttribution],
    }
    // Chart with x axis dropped — renderer would dereference chart.x and crash.
    const malformedChart = {
      ...validChart,
      x: null as unknown,
    }

    const brokenRecord = {
      scenario_id: 'scenario-missing-axis',
      scenario_name: 'Missing Axis',
      scenario_type: 'alternative',
      tags: [],
      description: '',
      created_at: '2026-04-01T12:00:00Z',
      updated_at: '2026-04-01T12:00:00Z',
      created_by: 'test-session',
      assumptions,
      model_ids: ['scenario-lab-mock-engine'],
      data_version: '2025Q4',
      stored_at: '2026-04-01T12:00:00Z',
      run_id: 'run-axis',
      run_saved_at: '2026-04-01T12:00:00Z',
      run_results: {
        headline_metrics: [headlineMetric],
        charts_by_tab: {
          headline_impact: malformedChart,
          macro_path: validChart,
          external_balance: validChart,
          fiscal_effects: validChart,
        },
      },
      run_attribution: [runAttribution],
    }
    localStorage.setItem(
      `policy-ui:scenario.v2:${brokenRecord.scenario_id}`,
      JSON.stringify(brokenRecord),
    )

    const originalWarn = console.warn
    console.warn = (() => {}) as typeof console.warn
    const listed = listScenarios()
    console.warn = originalWarn

    assert.equal(
      listed.find((entry) => entry.scenario_id === brokenRecord.scenario_id),
      undefined,
      'expected broken record (chart missing required axis) to be filtered out',
    )
  })

  it('tolerates records saved without optional output fields', () => {
    const saved = saveScenario(buildScenarioInput('scenario-no-outputs', 'No Outputs'))
    assert.equal(saved.run_id, undefined)
    assert.equal(saved.run_saved_at, undefined)
    assert.equal(saved.run_results, undefined)
    assert.equal(saved.run_interpretation, undefined)
    assert.equal(saved.run_attribution, undefined)

    const loaded = loadScenario('scenario-no-outputs')
    assert.ok(loaded)
    assert.equal(loaded.run_id, undefined)
    assert.equal(loaded.run_saved_at, undefined)
    assert.equal(loaded.run_results, undefined)
    assert.equal(loaded.run_interpretation, undefined)
    assert.equal(loaded.run_attribution, undefined)
  })
})
