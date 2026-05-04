import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import { resolvePresetHydration } from '../../src/pages/scenario-lab-preset.js'

describe('ScenarioLabPage preset hydration', () => {
  it('hydrates remittance-downside preset from URL query', () => {
    const result = resolvePresetHydration(scenarioLabWorkspaceMock, 'remittance-downside')

    assert.equal(result.selectedPresetId, 'remittance-downside')
    assert.equal(result.scenarioName, 'Remittance downside (proxy)')
    assert.equal(result.assumptionValues.export_demand_change, -8)
    assert.equal(result.warningMessage, null)
  })

  it('falls back to baseline for unknown preset ids without throwing', () => {
    const result = resolvePresetHydration(scenarioLabWorkspaceMock, 'nonsense')

    assert.equal(result.selectedPresetId, 'baseline')
    assert.equal(result.scenarioName, 'Baseline')
    assert.ok(result.warningMessage?.includes('nonsense'))
  })
})
