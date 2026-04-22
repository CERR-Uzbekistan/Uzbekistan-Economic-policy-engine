import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  QPM_HEADLINE_HORIZON_INDEX,
  toComparisonScenariosFromQpm,
  toComparisonWorkspaceFromQpm,
} from '../../../src/data/bridge/qpm-adapter.js'
import { buildValidQpmPayload } from './qpm-fixture.js'

describe('qpm adapter', () => {
  it('maps all five canonical scenarios and derives scalar values at the authorized horizon', () => {
    const payload = buildValidQpmPayload()
    const scenarios = toComparisonScenariosFromQpm(payload)

    assert.equal(scenarios.length, 5)
    assert.equal(QPM_HEADLINE_HORIZON_INDEX, 3)

    const baseline = scenarios.find((scenario) => scenario.scenario_id === 'baseline')
    const rateCut = scenarios.find((scenario) => scenario.scenario_id === 'rate-cut-100bp')
    const remittance = scenarios.find((scenario) => scenario.scenario_id === 'remittance-downside')

    assert.ok(baseline)
    assert.ok(rateCut)
    assert.ok(remittance)

    assert.equal(baseline.values.gdp_growth, payload.scenarios[0].paths.gdp_growth[3])
    assert.equal(baseline.values.inflation, payload.scenarios[0].paths.inflation[3])
    assert.equal(rateCut.values.policy_rate, payload.scenarios[1].paths.policy_rate[3])
    assert.equal(remittance.values.exchange_rate, payload.scenarios[4].paths.exchange_rate[3])
  })

  it('builds workspace defaults with baseline + symmetric policy alternatives in three slots', () => {
    const payload = buildValidQpmPayload()
    const workspace = toComparisonWorkspaceFromQpm(payload)

    assert.equal(workspace.default_baseline_id, 'baseline')
    assert.deepEqual(workspace.default_selected_ids, ['baseline', 'rate-cut-100bp', 'rate-hike-100bp'])
    assert.equal(workspace.metric_definitions.length, 4)
  })
})
