import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveQpmDefaultDataUrl } from '../../../src/data/bridge/qpm-client.js'
import { validateQpmBridgePayload } from '../../../src/data/bridge/qpm-guard.js'
import { buildValidQpmPayload } from './qpm-fixture.js'

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
