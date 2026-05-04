import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadOverviewSourceState } from '../../../src/data/overview/source.js'
import { overviewLiveRawMock } from '../../../src/data/raw/overview-live.js'
import { overviewV1Data } from '../../../src/data/mock/overview.js'
import { buildValidOverviewArtifact } from './overview-artifact-fixture.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_OVERVIEW_DATA_MODE
const originalArtifactUrl = process.env.VITE_OVERVIEW_ARTIFACT_URL
const originalConsoleError = console.error

afterEach(() => {
  globalThis.fetch = originalFetch
  console.error = originalConsoleError
  if (originalMode === undefined) {
    delete process.env.VITE_OVERVIEW_DATA_MODE
  } else {
    process.env.VITE_OVERVIEW_DATA_MODE = originalMode
  }
  if (originalArtifactUrl === undefined) {
    delete process.env.VITE_OVERVIEW_ARTIFACT_URL
  } else {
    process.env.VITE_OVERVIEW_ARTIFACT_URL = originalArtifactUrl
  }
})

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('overview source artifact flow', () => {
  it('loads a valid overview artifact and exposes artifact source state', async () => {
    delete process.env.VITE_OVERVIEW_DATA_MODE
    globalThis.fetch = (() => Promise.resolve(jsonResponse(buildValidOverviewArtifact()))) as typeof fetch

    const state = await loadOverviewSourceState()

    assert.equal(state.status, 'ready')
    assert.equal(state.mode, 'artifact')
    assert.equal(state.sourceKind, 'overview-artifact')
    assert.equal(state.fallbackReason, null)
    assert.equal(state.snapshot?.snapshot_id, 'overview-artifact')
    assert.equal(state.snapshot?.headline_metrics[0].metric_id, 'real_gdp_growth_quarter_yoy')
  })

  it('falls back cleanly when the overview artifact is missing', async () => {
    delete process.env.VITE_OVERVIEW_DATA_MODE
    globalThis.fetch = (() => Promise.resolve(new Response('', { status: 404 }))) as typeof fetch

    const state = await loadOverviewSourceState()

    assert.equal(state.status, 'ready')
    assert.equal(state.sourceKind, 'static-fallback')
    assert.equal(state.fallbackReason, 'missing')
    assert.equal(state.snapshot?.snapshot_id, overviewV1Data.snapshot_id)
  })

  it('treats Vite HTML fallback for missing overview.json as clean missing fallback', async () => {
    delete process.env.VITE_OVERVIEW_DATA_MODE
    const consoleErrors: unknown[][] = []
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args)
    }
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response('<!doctype html><html lang="en"></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )) as typeof fetch

    const state = await loadOverviewSourceState()

    assert.equal(state.status, 'ready')
    assert.equal(state.sourceKind, 'static-fallback')
    assert.equal(state.fallbackReason, 'missing')
    assert.equal(state.snapshot?.snapshot_id, overviewV1Data.snapshot_id)
    assert.equal(consoleErrors.length, 0)
  })

  it('falls back cleanly when the overview artifact is invalid', async () => {
    delete process.env.VITE_OVERVIEW_DATA_MODE
    globalThis.fetch = (() => Promise.resolve(jsonResponse({ schema_version: 'overview.v1' }))) as typeof fetch

    const state = await loadOverviewSourceState()

    assert.equal(state.status, 'ready')
    assert.equal(state.sourceKind, 'static-fallback')
    assert.equal(state.fallbackReason, 'invalid')
    assert.equal(state.snapshot?.snapshot_id, overviewV1Data.snapshot_id)
    assert.ok(state.warnings.length > 0)
  })
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
