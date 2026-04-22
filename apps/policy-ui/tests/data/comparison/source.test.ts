import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadComparisonSourceState } from '../../../src/data/comparison/source.js'
import { buildValidQpmPayload } from '../bridge/qpm-fixture.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_COMPARISON_DATA_MODE

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalMode === undefined) {
    delete process.env.VITE_COMPARISON_DATA_MODE
  } else {
    process.env.VITE_COMPARISON_DATA_MODE = originalMode
  }
})

describe('comparison source QPM bridge flow', () => {
  it('uses QPM as primary and falls back to mock for transport/guard failures', async () => {
    process.env.VITE_COMPARISON_DATA_MODE = 'live'
    const calls: string[] = []
    const queuedResponses: Array<() => Promise<Response>> = [
      () =>
        Promise.resolve(
          new Response(JSON.stringify(buildValidQpmPayload()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 404 })),
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ scenarios: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.reject(new TypeError('Failed to fetch')),
    ]

    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(String(input))
      const next = queuedResponses.shift()
      if (!next) {
        return Promise.reject(new Error('No queued fetch response'))
      }
      return next()
    }) as typeof fetch

    const readyState = await loadComparisonSourceState()
    assert.equal(readyState.status, 'ready')
    assert.equal(readyState.mode, 'live')
    assert.equal(readyState.workspace?.default_baseline_id, 'baseline')
    assert.ok(readyState.qpmPayload)

    const httpFallbackState = await loadComparisonSourceState()
    assert.equal(httpFallbackState.status, 'ready')
    assert.equal(httpFallbackState.mode, 'mock')
    assert.equal(httpFallbackState.workspace?.workspace_id, 'comparison-v1-workspace')
    assert.equal(httpFallbackState.qpmPayload, null)

    const guardFallbackState = await loadComparisonSourceState()
    assert.equal(guardFallbackState.status, 'ready')
    assert.equal(guardFallbackState.mode, 'mock')
    assert.equal(guardFallbackState.warnings.length > 0, true)

    const networkFallbackState = await loadComparisonSourceState()
    assert.equal(networkFallbackState.status, 'ready')
    assert.equal(networkFallbackState.mode, 'mock')
    assert.equal(
      networkFallbackState.workspace?.workspace_id,
      'comparison-v1-workspace',
    )

    assert.equal(calls.length, 4)
  })
})
