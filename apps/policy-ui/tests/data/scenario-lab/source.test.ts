import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadScenarioLabSourceState } from '../../../src/data/scenario-lab/source.js'
import { scenarioLabLiveRawMock } from '../../../src/data/raw/scenario-lab-live.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_SCENARIO_LAB_DATA_MODE

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalMode === undefined) {
    delete process.env.VITE_SCENARIO_LAB_DATA_MODE
  } else {
    process.env.VITE_SCENARIO_LAB_DATA_MODE = originalMode
  }
})

describe('scenario lab source live integration flow', () => {
  it('maps run transport and payload outcomes into source states', async () => {
    process.env.VITE_SCENARIO_LAB_DATA_MODE = 'live'
    const calls: string[] = []
    const queuedResponses: Array<() => Promise<Response>> = [
      () =>
        Promise.resolve(
          new Response(JSON.stringify(scenarioLabLiveRawMock), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 500 })),
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

    const runParams = {
      assumptions: { policy_rate_change: 0, exchange_rate_change: 0 },
      selectedPresetId: 'balanced-baseline',
      scenarioName: 'Scenario A',
    }

    const readyState = await loadScenarioLabSourceState(runParams)
    assert.equal(readyState.status, 'ready')
    assert.equal(readyState.mode, 'live')
    assert.equal(readyState.workspace?.workspace_id, scenarioLabLiveRawMock.workspace?.workspaceId)

    const httpErrorState = await loadScenarioLabSourceState(runParams)
    assert.equal(httpErrorState.status, 'error')
    assert.equal(httpErrorState.canRetry, true)
    assert.equal(httpErrorState.error, 'Scenario Lab API returned an unsuccessful response (500).')

    const networkErrorState = await loadScenarioLabSourceState(runParams)
    assert.equal(networkErrorState.status, 'error')
    assert.equal(
      networkErrorState.error,
      'Scenario Lab API is unreachable. Please check your connection and retry.',
    )

    const timeoutState = await loadScenarioLabSourceState(runParams)
    assert.equal(timeoutState.status, 'error')
    assert.equal(timeoutState.error, 'Scenario Lab API request timed out. Please retry.')

    assert.equal(calls.length, 4)
  })
})
