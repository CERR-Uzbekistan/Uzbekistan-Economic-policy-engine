import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadModelExplorerSourceState } from '../../../src/data/model-explorer/source.js'
import { validateDfmBridgePayload } from '../../../src/data/bridge/dfm-guard.js'
import type { DfmBridgePayload } from '../../../src/data/bridge/dfm-types.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import { validatePeBridgePayload } from '../../../src/data/bridge/pe-guard.js'
import type { PeBridgePayload } from '../../../src/data/bridge/pe-types.js'
import { validateQpmBridgePayload } from '../../../src/data/bridge/qpm-guard.js'
import type { QpmBridgePayload } from '../../../src/data/bridge/qpm-types.js'
import { modelCatalogEntries } from '../../../src/data/mock/model-catalog.js'
import { modelExplorerLiveRawMock } from '../../../src/data/raw/model-explorer-live.js'

const originalFetch = globalThis.fetch
const originalMode = process.env.VITE_MODEL_EXPLORER_DATA_MODE
const DFM_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/dfm.json', import.meta.url))
const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))
const PE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/pe.json', import.meta.url))
const QPM_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/qpm.json', import.meta.url))

function loadValidDfmPayload(): DfmBridgePayload {
  const validation = validateDfmBridgePayload(JSON.parse(readFileSync(DFM_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

function loadValidIoPayload(): IoBridgePayload {
  const validation = validateIoBridgePayload(JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

function loadValidPePayload(): PeBridgePayload {
  const validation = validatePeBridgePayload(JSON.parse(readFileSync(PE_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

function loadValidQpmPayload(): QpmBridgePayload {
  const validation = validateQpmBridgePayload(JSON.parse(readFileSync(QPM_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalMode === undefined) {
    delete process.env.VITE_MODEL_EXPLORER_DATA_MODE
  } else {
    process.env.VITE_MODEL_EXPLORER_DATA_MODE = originalMode
  }
})

describe('model explorer source live integration flow', () => {
  it('serves the Shot 1 catalog through mock source state', async () => {
    process.env.VITE_MODEL_EXPLORER_DATA_MODE = 'mock'

    const readyState = await loadModelExplorerSourceState()
    const catalogEntries = Object.values(readyState.workspace?.catalog_entries_by_model_id ?? {})

    assert.equal(readyState.status, 'ready')
    assert.equal(readyState.mode, 'mock')
    assert.equal(catalogEntries.length, modelCatalogEntries.length)
    assert.deepEqual(
      catalogEntries.map((entry) => entry.id),
      modelCatalogEntries.map((entry) => entry.id),
    )
    assert.equal(readyState.workspace?.meta?.models_live, 3)
    assert.deepEqual(
      readyState.workspace?.catalog_entries_by_model_id?.['dfm-nowcast']?.status,
      { label: 'Unavailable for current policy use', severity: 'warn' },
    )
  })

  it('enriches the I-O and PE entries with bridge evidence when public artifacts are valid', async () => {
    process.env.VITE_MODEL_EXPLORER_DATA_MODE = 'mock'
    const dfmPayload = loadValidDfmPayload()
    const ioPayload = loadValidIoPayload()
    const pePayload = loadValidPePayload()
    const qpmPayload = loadValidQpmPayload()
    globalThis.fetch = ((input: RequestInfo | URL) => {
      if (String(input) === '/data/qpm.json') {
        return Promise.resolve(
          new Response(JSON.stringify(qpmPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (String(input) === '/data/dfm.json') {
        return Promise.resolve(
          new Response(JSON.stringify(dfmPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (String(input) === '/data/io.json') {
        return Promise.resolve(
          new Response(JSON.stringify(ioPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      assert.equal(String(input), '/data/pe.json')
      return Promise.resolve(
        new Response(JSON.stringify(pePayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }) as typeof fetch

    const readyState = await loadModelExplorerSourceState()
    const dfmEntry = readyState.workspace?.catalog_entries_by_model_id?.['dfm-nowcast']
    const ioEntry = readyState.workspace?.catalog_entries_by_model_id?.['io-model']
    const peEntry = readyState.workspace?.catalog_entries_by_model_id?.['pe-model']
    const qpmEntry = readyState.workspace?.catalog_entries_by_model_id?.['qpm-uzbekistan']

    assert.equal(readyState.status, 'ready')
    assert.equal(qpmEntry?.bridge_evidence?.source_artifact, 'apps/policy-ui/public/data/qpm.json')
    assert.equal(dfmEntry?.bridge_evidence?.source_artifact, 'apps/policy-ui/public/data/dfm.json')
    assert.deepEqual(dfmEntry?.status, {
      label: 'Unavailable for current policy use',
      severity: 'warn',
    })
    assert.equal(readyState.workspace?.meta?.models_live, 3)
    assert.equal(
      ioEntry?.bridge_evidence?.source_artifact,
      'io_model/io_data.json + io_model/io_employment.json + io_model/io_data.js labels',
    )
    assert.equal(ioEntry?.bridge_evidence?.sector_count, 136)
    assert.equal(peEntry?.bridge_evidence?.source_artifact, 'mcp_server/data/pe_data.json')
    assert.equal(peEntry?.bridge_evidence?.sector_count, 19)
  })

  it('falls back to the existing I-O entry when the IO artifact is invalid', async () => {
    process.env.VITE_MODEL_EXPLORER_DATA_MODE = 'mock'
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ sectors: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )) as typeof fetch

    const readyState = await loadModelExplorerSourceState()
    const entries = Object.values(readyState.workspace?.catalog_entries_by_model_id ?? {})
    const ioEntry = readyState.workspace?.catalog_entries_by_model_id?.['io-model']

    assert.equal(readyState.status, 'ready')
    assert.equal(entries.length, 6)
    assert.equal(ioEntry?.title, 'I-O')
    assert.equal(ioEntry?.bridge_evidence, undefined)
  })

  it('maps transport and payload outcomes into UI-safe source states', async () => {
    process.env.VITE_MODEL_EXPLORER_DATA_MODE = 'live'
    const calls: string[] = []
    const queuedResponses: Array<() => Promise<Response>> = [
      () =>
        Promise.resolve(
          new Response(JSON.stringify(modelExplorerLiveRawMock), {
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
      if (String(input) === '/data/qpm.json') {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      if (String(input) === '/data/dfm.json') {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      if (String(input) === '/data/io.json') {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      if (String(input) === '/data/pe.json') {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      const next = queuedResponses.shift()
      if (!next) {
        return Promise.reject(new Error('No queued fetch response'))
      }
      return next()
    }) as typeof fetch

    const readyState = await loadModelExplorerSourceState()
    assert.equal(readyState.status, 'ready')
    assert.equal(readyState.mode, 'live')
    assert.equal(readyState.workspace?.workspace_id, modelExplorerLiveRawMock.workspaceId)
    assert.ok(readyState.workspace?.catalog_entries_by_model_id?.['qpm-uzbekistan'])

    const httpErrorState = await loadModelExplorerSourceState()
    assert.equal(httpErrorState.status, 'error')
    assert.equal(httpErrorState.canRetry, true)
    assert.equal(httpErrorState.error, 'Model Explorer API returned an unsuccessful response (503).')

    const networkErrorState = await loadModelExplorerSourceState()
    assert.equal(networkErrorState.status, 'error')
    assert.equal(
      networkErrorState.error,
      'Model Explorer API is unreachable. Please check your connection and retry.',
    )

    const timeoutState = await loadModelExplorerSourceState()
    assert.equal(timeoutState.status, 'error')
    assert.equal(timeoutState.error, 'Model Explorer API request timed out. Please retry.')

    assert.equal(calls.length, 8)
  })
})
