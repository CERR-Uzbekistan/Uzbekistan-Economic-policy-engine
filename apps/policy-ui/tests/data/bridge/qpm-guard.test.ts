import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolveQpmDefaultDataUrl } from '../../../src/data/bridge/qpm-client.js'
import { validateQpmBridgePayload } from '../../../src/data/bridge/qpm-guard.js'
import { buildValidQpmPayload } from './qpm-fixture.js'

const QPM_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/qpm.json', import.meta.url))

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

describe('qpm bridge guard', () => {
  it('resolves the default public artifact URL against the Vite base path', () => {
    assert.equal(resolveQpmDefaultDataUrl(undefined), '/data/qpm.json')
    assert.equal(
      resolveQpmDefaultDataUrl('/Uzbekistan-Economic-policy-engine/policy-ui/'),
      '/Uzbekistan-Economic-policy-engine/policy-ui/data/qpm.json',
    )
  })

  it('accepts a valid payload', () => {
    const payload = buildValidQpmPayload()
    const validation = validateQpmBridgePayload(payload)

    assert.equal(validation.ok, true)
    assert.ok(validation.value)
    assert.equal(validation.issues.length, 0)
  })

  it('accepts the checked-in public QPM artifact without stale inactive-b3 caveats', () => {
    const payload = JSON.parse(readFileSync(QPM_PUBLIC_ARTIFACT_PATH, 'utf8'))
    const validation = validateQpmBridgePayload(payload)

    assert.equal(validation.ok, true)
    const serialized = JSON.stringify(validation.value)
    assert.doesNotMatch(serialized, /b3.*inactive|inactive.*b3|qpm-b3-inactive/i)
    const externalDemand = validation.value?.scenarios.find((scenario) => scenario.scenario_id === 'remittance-downside')
    assert.equal(externalDemand?.shocks_applied.external_demand_shock, -0.5)
    assert.equal(externalDemand?.shocks_applied.gap_shock, 0)
  })

  it('rejects required top-level fields with path-scoped issues', () => {
    const requiredTopLevelFields = ['attribution', 'parameters', 'scenarios', 'caveats', 'metadata'] as const

    for (const field of requiredTopLevelFields) {
      const payload = clonePayload(buildValidQpmPayload()) as Record<string, unknown>
      delete payload[field]
      const validation = validateQpmBridgePayload(payload)

      assert.equal(validation.ok, false, `expected payload without "${field}" to fail`)
      assert.equal(
        validation.issues.some((issue) => issue.path === field),
        true,
        `expected path-level issue for "${field}"`,
      )
    }
  })

  it('rejects scenarios that miss required path arrays', () => {
    const payload = clonePayload(buildValidQpmPayload())
    delete (payload.scenarios[0] as { paths?: Record<string, number[]> }).paths?.policy_rate

    const validation = validateQpmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'scenarios[0].paths.policy_rate'),
      true,
    )
  })

  it('flags unit-convention violations for policy_rate and exchange_rate', () => {
    const payload = clonePayload(buildValidQpmPayload())
    payload.scenarios[1].paths.policy_rate[2] = 250
    payload.scenarios[1].paths.exchange_rate[2] = 14.2

    const validation = validateQpmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) =>
        issue.path === 'scenarios[1].paths.exchange_rate[2]' || issue.path === 'scenarios[1].paths.policy_rate[2]',
      ),
      true,
    )
  })
})
