import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadComparisonSourceState } from '../../../src/data/comparison/source.js'
import { buildValidQpmPayload } from '../bridge/qpm-fixture.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_COMPARISON_DATA_MODE
const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))

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
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ sectors: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 404 })),
      () => Promise.resolve(new Response('', { status: 404 })),
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ scenarios: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      () => Promise.resolve(new Response('', { status: 404 })),
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(new Response('', { status: 404 })),
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
    assert.equal(readyState.ioSectorEvidence, null)

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

    assert.equal(calls.length, 8)
  })

  it('loads valid IO sector evidence as optional add-on data without changing macro rows', async () => {
    process.env.VITE_COMPARISON_DATA_MODE = 'live'
    const calls: string[] = []
    const ioPayload = JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8'))

    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/data/qpm.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(buildValidQpmPayload()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (url.endsWith('/data/io.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(ioPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response('', { status: 404 }))
    }) as typeof fetch

    const state = await loadComparisonSourceState()

    assert.equal(state.status, 'ready')
    assert.equal(state.mode, 'live')
    assert.equal(state.workspace?.default_baseline_id, 'baseline')
    assert.equal(state.ioSectorEvidence?.source_artifact, 'io_model/io_data.json + mcp_server/data/io_data.json')
    assert.equal(state.ioSectorEvidence?.sector_count, 136)
    assert.deepEqual(
      state.workspace?.metric_definitions.map((metric) => metric.metric_id),
      ['gdp_growth', 'inflation', 'policy_rate', 'exchange_rate'],
    )
    assert.deepEqual(calls, ['/data/qpm.json', '/data/io.json'])
  })
})
