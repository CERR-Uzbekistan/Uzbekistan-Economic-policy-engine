import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import { buildDataRegistry, loadDataRegistry } from '../../../src/data/data-registry/source.js'
import { buildValidDfmPayload } from '../bridge/dfm-fixture.js'
import { buildValidQpmPayload } from '../bridge/qpm-fixture.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))
const NOW = new Date('2026-04-25T12:00:00Z')

function loadPublicIoPayload(): IoBridgePayload {
  return JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')) as IoBridgePayload
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function bridgeFetch(payloads: {
  qpm?: unknown | Response
  dfm?: unknown | Response
  io?: unknown | Response
}) {
  return (input: RequestInfo | URL) => {
    const url = String(input)
    const value = url.includes('qpm.json')
      ? payloads.qpm
      : url.includes('dfm.json')
        ? payloads.dfm
        : payloads.io
    if (value instanceof Response) {
      return Promise.resolve(value)
    }
    return Promise.resolve(jsonResponse(value ?? {}, 200))
  }
}

describe('data registry source', () => {
  it('renders QPM, DFM, and I-O rows from current metadata and keeps planned rows honest', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
      }),
      NOW,
    )

    assert.equal(registry.artifacts.length, 3)
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/qpm.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/dfm.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/io.json'))
    assert.ok(registry.dataSources.some((row) => row.label === 'PE Trade Shock' && row.status === 'planned'))
    assert.ok(registry.dataSources.some((row) => row.label === 'CGE Reform Shock' && row.status === 'planned'))
    assert.ok(registry.dataSources.some((row) => row.label === 'FPP Fiscal Path' && row.status === 'planned'))
    assert.equal(registry.dataSources.some((row) => row.id === 'pe' && row.status === 'missing'), false)
  })

  it('warns when DFM export is older than 48 hours and escalates after 7 days', async () => {
    const dfm = buildValidDfmPayload()
    dfm.caveats = []
    const registry = buildDataRegistry({
      qpm: { status: 'loaded', payload: buildValidQpmPayload() },
      dfm: { status: 'loaded', payload: dfm },
      io: { status: 'loaded', payload: loadPublicIoPayload() },
      now: NOW,
    })

    const dfmArtifact = registry.artifacts.find((artifact) => artifact.id === 'dfm')
    assert.equal(dfmArtifact?.status, 'warning')
    assert.ok(dfmArtifact?.issues.some((issue) => issue.message.includes('48 hours')))

    dfm.metadata.exported_at = '2026-04-10T00:00:00Z'
    const staleRegistry = buildDataRegistry({
      qpm: { status: 'loaded', payload: buildValidQpmPayload() },
      dfm: { status: 'loaded', payload: dfm },
      io: { status: 'loaded', payload: loadPublicIoPayload() },
      now: NOW,
    })
    const staleDfmArtifact = staleRegistry.artifacts.find((artifact) => artifact.id === 'dfm')
    assert.ok(staleDfmArtifact?.issues.some((issue) => issue.message.includes('7 days')))
  })

  it('shows validation failure without breaking the registry page model', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: buildValidQpmPayload(),
        dfm: { attribution: { model_id: 'DFM' } },
        io: loadPublicIoPayload(),
      }),
      NOW,
    )

    const dfmArtifact = registry.artifacts.find((artifact) => artifact.id === 'dfm')
    assert.equal(dfmArtifact?.status, 'failed')
    assert.ok(dfmArtifact?.issues.length)
    assert.ok(registry.warnings.some((warning) => warning.title.includes('DFM nowcast')))
  })

  it('shows missing implemented artifact state but keeps I-O base-year vintage non-stale', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: new Response('', { status: 404 }),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
      }),
      NOW,
    )

    const qpmArtifact = registry.artifacts.find((artifact) => artifact.id === 'qpm')
    const ioRows = registry.dataSources.filter((row) => row.id === 'io')
    assert.equal(qpmArtifact?.status, 'missing')
    assert.ok(ioRows.some((row) => row.notes.includes('base-year')))
    assert.equal(registry.warnings.some((warning) => warning.title.includes('I-O') && warning.detail.includes('stale')), false)
  })
})
