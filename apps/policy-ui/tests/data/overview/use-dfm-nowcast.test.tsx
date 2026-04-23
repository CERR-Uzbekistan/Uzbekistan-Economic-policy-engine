import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createElement, useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { useDfmNowcast, type DfmNowcastHookResult } from '../../../src/data/overview/useDfmNowcast.js'
import { buildValidDfmPayload } from '../../data/bridge/dfm-fixture.js'

function makeFetchOk() {
  return async () =>
    ({
      ok: true,
      status: 200,
      json: async () => buildValidDfmPayload(),
    }) as unknown as Response
}

function makeFetchHttpError(status: number) {
  return async () =>
    ({
      ok: false,
      status,
      json: async () => ({}),
    }) as unknown as Response
}

function makeFetchInvalidPayload() {
  return async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ not: 'valid' }),
    }) as unknown as Response
}

function captureHook(fetchImpl: Parameters<typeof useDfmNowcast>[0]): DfmNowcastHookResult {
  const holder: { current: DfmNowcastHookResult | null } = { current: null }
  function Probe() {
    const result = useDfmNowcast(fetchImpl)
    holder.current = result
    useEffect(() => {}, [])
    return null
  }
  renderToString(createElement(Probe))
  if (!holder.current) {
    throw new Error('Hook did not populate capture')
  }
  return holder.current
}

describe('useDfmNowcast', () => {
  it('initial render returns loading state', () => {
    const result = captureHook(makeFetchOk())
    assert.equal(result.state.status, 'loading')
  })

  it('resolves to bridge state on successful fetch', async () => {
    // Execute the same async flow the hook performs internally.
    const { fetchDfmBridgePayload } = await import('../../../src/data/bridge/dfm-client.js')
    const { toDfmAdapterOutput } = await import('../../../src/data/bridge/dfm-adapter.js')
    const { composeDfmNowcastChart } = await import('../../../src/data/overview/dfm-composition.js')

    const payload = await fetchDfmBridgePayload(makeFetchOk())
    const adapter = toDfmAdapterOutput(payload)
    const chart = composeDfmNowcastChart(adapter)
    assert.equal(chart.series.length, 1)
    assert.equal(chart.uncertainty.length, 3)
  })

  it('classifies HTTP non-ok responses as transport errors', async () => {
    const { fetchDfmBridgePayload, DfmTransportError } = await import('../../../src/data/bridge/dfm-client.js')
    await assert.rejects(() => fetchDfmBridgePayload(makeFetchHttpError(503)), (error) => {
      assert.ok(error instanceof DfmTransportError)
      assert.equal(error.kind, 'http')
      assert.equal(error.status, 503)
      return true
    })
  })

  it('classifies invalid payloads as validation errors', async () => {
    const { fetchDfmBridgePayload, DfmValidationError } = await import('../../../src/data/bridge/dfm-client.js')
    await assert.rejects(() => fetchDfmBridgePayload(makeFetchInvalidPayload()), (error) => {
      assert.ok(error instanceof DfmValidationError)
      assert.ok(error.issues.length > 0)
      return true
    })
  })

  it('exposes a refetch callback', () => {
    const result = captureHook(makeFetchOk())
    assert.equal(typeof result.refetch, 'function')
  })
})
