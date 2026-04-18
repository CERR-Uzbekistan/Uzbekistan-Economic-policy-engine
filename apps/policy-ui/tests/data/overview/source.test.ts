import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadOverviewSourceState } from '../../../src/data/overview/source.js'
import { overviewLiveRawMock } from '../../../src/data/raw/overview-live.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_OVERVIEW_DATA_MODE

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalMode === undefined) {
    delete process.env.VITE_OVERVIEW_DATA_MODE
  } else {
    process.env.VITE_OVERVIEW_DATA_MODE = originalMode
  }
})

describe('overview source live integration flow', () => {
  it('maps transport and payload outcomes into UI-safe source states', async () => {
    process.env.VITE_OVERVIEW_DATA_MODE = 'live'
    const calls: string[] = []
    const queuedResponses: Array<() => Promise<Response>> = [
      () =>
        Promise.resolve(
          new Response(JSON.stringify(overviewLiveRawMock), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 503 })),
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

    const readyState = await loadOverviewSourceState()
    assert.equal(readyState.status, 'ready')
    assert.equal(readyState.mode, 'live')
    assert.equal(readyState.snapshot?.snapshot_id, overviewLiveRawMock.id)

    const httpErrorState = await loadOverviewSourceState()
    assert.equal(httpErrorState.status, 'error')
    assert.equal(httpErrorState.canRetry, true)
    assert.equal(httpErrorState.error, 'Overview API returned an unsuccessful response (503).')

    const networkErrorState = await loadOverviewSourceState()
    assert.equal(networkErrorState.status, 'error')
    assert.equal(networkErrorState.error, 'Overview API is unreachable. Please check your connection and retry.')

    const timeoutState = await loadOverviewSourceState()
    assert.equal(timeoutState.status, 'error')
    assert.equal(timeoutState.error, 'Overview API request timed out. Please retry.')

    assert.equal(calls.length, 4)
  })
})
