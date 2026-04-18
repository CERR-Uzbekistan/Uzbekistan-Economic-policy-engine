import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadComparisonSourceState } from '../../../src/data/comparison/source.js'
import { comparisonLiveRawMock } from '../../../src/data/raw/comparison-live.js'

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

describe('comparison source live integration flow', () => {
  it('maps transport and payload outcomes into source states', async () => {
    process.env.VITE_COMPARISON_DATA_MODE = 'live'
    const calls: string[] = []
    const queuedResponses: Array<() => Promise<Response>> = [
      () =>
        Promise.resolve(
          new Response(JSON.stringify(comparisonLiveRawMock), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 502 })),
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
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
    assert.equal(readyState.workspace?.workspace_id, comparisonLiveRawMock.workspaceId)

    const httpErrorState = await loadComparisonSourceState()
    assert.equal(httpErrorState.status, 'error')
    assert.equal(httpErrorState.canRetry, true)
    assert.equal(httpErrorState.error, 'Comparison API returned an unsuccessful response (502).')

    const networkErrorState = await loadComparisonSourceState()
    assert.equal(networkErrorState.status, 'error')
    assert.equal(
      networkErrorState.error,
      'Comparison API is unreachable. Please check your connection and retry.',
    )

    const timeoutState = await loadComparisonSourceState()
    assert.equal(timeoutState.status, 'error')
    assert.equal(timeoutState.error, 'Comparison API request timed out. Please retry.')

    assert.equal(calls.length, 4)
  })
})
