import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { scenarioLabWorkspaceMock } from '../../src/data/mock/scenario-lab.js'
import { resolvePresetHydration } from '../../src/pages/scenario-lab-preset.js'

describe('ScenarioLabPage preset hydration', () => {
  it('hydrates external-slowdown preset from URL query', () => {
    const result = resolvePresetHydration(scenarioLabWorkspaceMock, 'external-slowdown')

    assert.equal(result.selectedPresetId, 'external-slowdown')
    assert.equal(result.scenarioName, 'External slowdown')
    assert.equal(result.assumptionValues.export_demand_change, -8)
    assert.equal(result.warningMessage, null)
  })

  it('falls back to balanced-baseline for unknown preset ids without throwing', () => {
    const result = resolvePresetHydration(scenarioLabWorkspaceMock, 'nonsense')

    assert.equal(result.selectedPresetId, 'balanced-baseline')
    assert.equal(result.scenarioName, 'Balanced baseline')
    assert.ok(result.warningMessage?.includes('nonsense'))
  })
})
