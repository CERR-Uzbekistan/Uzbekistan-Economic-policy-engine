import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { CgeBridgePayload } from '../../../src/data/bridge/cge-types.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import type { PeBridgePayload } from '../../../src/data/bridge/pe-types.js'
import {
  buildDataRegistry,
  getFilteredRegistry,
  loadDataRegistry,
} from '../../../src/data/data-registry/source.js'
import { buildValidDfmPayload } from '../bridge/dfm-fixture.js'
import { buildValidQpmPayload } from '../bridge/qpm-fixture.js'
import { buildValidOverviewArtifact } from '../overview/overview-artifact-fixture.js'

const CGE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/cge.json', import.meta.url))
const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))
const PE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/pe.json', import.meta.url))
const NOW = new Date('2026-04-25T12:00:00Z')
const ORIGINAL_REGISTRY_API_URL = process.env.VITE_REGISTRY_API_URL

afterEach(() => {
  if (ORIGINAL_REGISTRY_API_URL === undefined) {
    delete process.env.VITE_REGISTRY_API_URL
  } else {
    process.env.VITE_REGISTRY_API_URL = ORIGINAL_REGISTRY_API_URL
  }
})

function loadPublicCgePayload(): CgeBridgePayload {
  return JSON.parse(readFileSync(CGE_PUBLIC_ARTIFACT_PATH, 'utf8')) as CgeBridgePayload
}

function loadPublicIoPayload(): IoBridgePayload {
  return JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')) as IoBridgePayload
}

function loadPublicPePayload(): PeBridgePayload {
  return JSON.parse(readFileSync(PE_PUBLIC_ARTIFACT_PATH, 'utf8')) as PeBridgePayload
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function bridgeFetch(payloads: {
  api?: unknown | Response
  overview?: unknown | Response
  qpm?: unknown | Response
  dfm?: unknown | Response
  io?: unknown | Response
  pe?: unknown | Response
  cge?: unknown | Response
}) {
  return (input: RequestInfo | URL) => {
    const url = String(input)
    let value: unknown | Response | undefined
    if (url.includes('/api/v1/registry/artifacts') || url.includes('registry.test/artifacts')) {
      value = payloads.api
    } else if (url.includes('overview.json')) {
      if (payloads.overview === undefined) {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      value = payloads.overview
    } else if (url.includes('qpm.json')) {
      value = payloads.qpm
    } else if (url.includes('dfm.json')) {
      value = payloads.dfm
    } else if (url.includes('io.json')) {
      value = payloads.io
    } else if (url.includes('pe.json')) {
      value = payloads.pe
    } else if (url.includes('cge.json')) {
      value = payloads.cge ?? loadPublicCgePayload()
    }
    if (value instanceof Response) {
      return Promise.resolve(value)
    }
    return Promise.resolve(jsonResponse(value ?? {}, 200))
  }
}

describe('data registry source', () => {
  it('prefers API metadata when the backend registry is available', async () => {
    process.env.VITE_REGISTRY_API_URL = 'https://registry.test/artifacts'

    const registry = await loadDataRegistry(
      bridgeFetch({
        api: {
          api_version: 'v1',
          source: 'frontend_public_artifacts',
          artifacts: [
            {
              id: 'qpm',
              model_family: 'QPM',
              artifact_path: '/data/qpm.json',
              source_artifact: 'qpm',
              source_vintage: '2026Q1-api',
              data_vintage: '2026Q1-api',
              exported_at: '2026-04-22T07:55:14Z',
              generated_at: '2026-04-22T07:55:13Z',
              checksum: 'sha256:qpm-test',
              guard_status: 'warning',
              guard_checks: ['json_parse', 'metadata_extract'],
              caveats: [],
              warnings: [],
            },
            {
              id: 'dfm',
              model_family: 'DFM',
              artifact_path: '/data/dfm.json',
              source_artifact: 'dfm_nowcast/dfm_data.js',
              source_vintage: '2026-04-08 10:09:12',
              data_vintage: '2026Q1',
              exported_at: '2026-04-22T11:58:03Z',
              generated_at: '2026-04-22T11:58:03Z',
              checksum: 'sha256:dfm-test',
              guard_status: 'valid',
              guard_checks: ['json_parse', 'metadata_extract'],
              caveats: [],
              warnings: [],
            },
            {
              id: 'io',
              model_family: 'I-O',
              artifact_path: '/data/io.json',
              source_artifact: 'io_model/io_data.json',
              source_vintage: 'Base-year vintage 2022',
              data_vintage: '2022',
              exported_at: '2026-04-09T00:00:00Z',
              generated_at: '2026-04-09',
              checksum: 'sha256:io-test',
              guard_status: 'valid',
              guard_checks: ['json_parse', 'metadata_extract'],
              caveats: [],
              warnings: [],
            },
            {
              id: 'pe',
              model_family: 'PE',
              artifact_path: '/data/pe.json',
              source_artifact: 'pe_model/wits_smart_export.csv',
              source_vintage: 'Base-year vintage 2025',
              data_vintage: '2025',
              exported_at: '2026-04-22T08:00:00Z',
              generated_at: '2026-04-22',
              checksum: 'sha256:pe-test',
              guard_status: 'valid',
              guard_checks: ['json_parse', 'metadata_extract'],
              caveats: [],
              warnings: [],
            },
          ],
        },
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const qpmArtifact = registry.artifacts.find((artifact) => artifact.id === 'qpm')
    assert.equal(registry.metadataSource, 'api')
    assert.equal(qpmArtifact?.checksum, 'sha256:qpm-test')
    assert.equal(qpmArtifact?.dataVintage, '2026Q1-api')
    assert.ok(registry.bridgeOutputs.some((row) => row.id === 'qpm' && row.dataVintage === '2026Q1-api'))
  })

  it('does not probe the registry API in default static mode', async () => {
    delete process.env.VITE_REGISTRY_API_URL
    const registryApiCalls: string[] = []
    const fetchImpl = ((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/v1/registry')) {
        registryApiCalls.push(url)
      }
      return bridgeFetch({
        overview: buildValidOverviewArtifact(),
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      })(input)
    }) as typeof fetch

    const registry = await loadDataRegistry(fetchImpl, NOW)

    assert.equal(registry.metadataSource, 'static-fallback')
    assert.deepEqual(registryApiCalls, [])
    assert.ok(registry.dataSources.some((row) => row.id === 'pe' && (row.status === 'valid' || row.status === 'warning')))
    assert.ok(registry.dataSources.some((row) => row.id === 'cge' && row.status === 'warning'))
    assert.ok(registry.dataSources.some((row) => row.label === 'FPP Fiscal Path' && row.status === 'planned'))
    assert.ok(registry.dataSources.some((row) => row.label === 'High-frequency indicators' && row.status === 'planned'))
  })

  it('falls back to static frontend composition when the backend registry is unavailable', async () => {
    process.env.VITE_REGISTRY_API_URL = 'https://registry.test/artifacts'

    const registry = await loadDataRegistry(
      bridgeFetch({
        api: new Response('', { status: 503 }),
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const qpmArtifact = registry.artifacts.find((artifact) => artifact.id === 'qpm')
    assert.equal(registry.metadataSource, 'static-fallback')
    assert.equal(qpmArtifact?.checksum, undefined)
    assert.equal(qpmArtifact?.dataVintage, '2026Q1')
  })

  it('falls back to static frontend composition when the backend registry returns invalid metadata with HTTP 200', async () => {
    process.env.VITE_REGISTRY_API_URL = 'https://registry.test/artifacts'

    const registry = await loadDataRegistry(
      bridgeFetch({
        api: {
          api_version: 'v1',
          source: 'frontend_public_artifacts',
          artifacts: [{ id: 'qpm' }],
        },
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const qpmArtifact = registry.artifacts.find((artifact) => artifact.id === 'qpm')
    assert.equal(registry.metadataSource, 'static-fallback')
    assert.equal(qpmArtifact?.checksum, undefined)
    assert.equal(qpmArtifact?.dataVintage, '2026Q1')
  })

  it('renders implemented artifact rows and keeps only unavailable lanes planned', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    assert.equal(registry.artifacts.length, 6)
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/overview.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/qpm.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/dfm.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/io.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/pe.json'))
    assert.ok(registry.artifacts.some((artifact) => artifact.artifactPath === '/data/cge.json' && artifact.status === 'warning'))
    assert.ok(registry.plannedArtifacts.some((row) => row.label === 'High-frequency indicators'))
    assert.ok(registry.dataSources.some((row) => row.label === 'High-frequency indicators' && row.status === 'planned'))
    assert.ok(registry.dataSources.some((row) => row.id === 'pe' && (row.status === 'valid' || row.status === 'warning')))
    assert.ok(registry.dataSources.some((row) => row.id === 'cge' && row.status === 'warning'))
    assert.ok(registry.dataSources.some((row) => row.label === 'FPP Fiscal Path' && row.status === 'planned'))
    assert.equal(registry.dataSources.some((row) => row.id === 'pe' && row.status === 'missing'), false)
    assert.equal(registry.dataSources.some((row) => row.id === 'hfi' && row.status === 'missing'), false)
    assert.ok(registry.bridgeOutputs.every((row) => row.registryType === 'bridge_output'))
  })

  it('shows overview artifact as planned/missing when no production overview.json is present', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const overviewArtifact = registry.artifacts.find((artifact) => artifact.id === 'overview')
    assert.equal(overviewArtifact?.status, 'missing')
    assert.ok(overviewArtifact?.statusDetail.includes('planned'))
    assert.ok(registry.bridgeOutputs.some((row) => row.id === 'overview' && row.status === 'missing'))
    assert.ok(registry.warnings.some((warning) => warning.title.includes('Operational Overview')))
  })

  it('shows overview artifact as valid when it is present and guard-checked', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        overview: buildValidOverviewArtifact(),
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const overviewArtifact = registry.artifacts.find((artifact) => artifact.id === 'overview')
    assert.equal(overviewArtifact?.status, 'valid')
    assert.equal(overviewArtifact?.artifactPath, '/data/overview.json')
    assert.ok(overviewArtifact?.facts.some((fact) => fact.label === 'Locked metrics' && fact.value === '17'))
  })

  it('filters active, warning, planned, and missing/unavailable registry records', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: new Response('', { status: 404 }),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const active = getFilteredRegistry(registry, 'active')
    const warnings = getFilteredRegistry(registry, 'warnings')
    const planned = getFilteredRegistry(registry, 'planned')
    const missingUnavailable = getFilteredRegistry(registry, 'missingUnavailable')

    assert.ok(active.artifacts.every((artifact) => artifact.status === 'valid' || artifact.status === 'warning'))
    assert.ok(warnings.artifacts.every((artifact) => artifact.status === 'warning'))
    assert.ok(planned.plannedArtifacts.some((row) => row.id === 'hfi'))
    assert.ok(planned.plannedArtifacts.some((row) => row.id === 'fpp'))
    assert.equal(planned.plannedArtifacts.some((row) => row.id === 'pe'), false)
    assert.ok(missingUnavailable.artifacts.some((artifact) => artifact.id === 'qpm' && artifact.status === 'missing'))
  })

  it('uses upstream readiness gates rather than a recent DFM JSON export timestamp', () => {
    const dfm = buildValidDfmPayload()
    dfm.caveats = []
    dfm.metadata.exported_at = '2026-04-25T11:59:00Z'
    const registry = buildDataRegistry({
      qpm: { status: 'loaded', payload: buildValidQpmPayload() },
      dfm: { status: 'loaded', payload: dfm },
      io: { status: 'loaded', payload: loadPublicIoPayload() },
      pe: { status: 'loaded', payload: loadPublicPePayload() },
      now: NOW,
    })

    const dfmArtifact = registry.artifacts.find((artifact) => artifact.id === 'dfm')
    assert.equal(dfmArtifact?.status, 'unavailable')
    assert.ok(dfmArtifact?.issues.some((issue) => issue.path.includes('current_quarter_mismatch')))
    assert.ok(dfmArtifact?.issues.some((issue) => issue.path.includes('economist_signoff_missing')))
    assert.equal(
      dfmArtifact?.facts.find((fact) => fact.label === 'Operational availability')?.value,
      'unavailable',
    )
  })

  it('shows validation failure without breaking the registry page model', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        qpm: buildValidQpmPayload(),
        dfm: { attribution: { model_id: 'DFM' } },
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
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
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    const qpmArtifact = registry.artifacts.find((artifact) => artifact.id === 'qpm')
    const ioRows = registry.dataSources.filter((row) => row.id === 'io')
    assert.equal(qpmArtifact?.status, 'missing')
    assert.ok(ioRows.some((row) => row.notes.includes('base-year')))
    assert.equal(registry.warnings.some((warning) => warning.title.includes('I-O') && warning.detail.includes('stale')), false)
  })

  it('describes guard scope without implying economic or model validation', async () => {
    const registry = await loadDataRegistry(
      bridgeFetch({
        overview: buildValidOverviewArtifact(),
        qpm: buildValidQpmPayload(),
        dfm: buildValidDfmPayload(),
        io: loadPublicIoPayload(),
        pe: loadPublicPePayload(),
      }),
      NOW,
    )

    for (const artifact of registry.artifacts) {
      assert.match(artifact.statusDetail, /passed format checks/)
      assert.match(artifact.statusDetail, /not economic or model validation/)
      assert.match(artifact.validationScope, /Frontend guard checks/)
      assert.doesNotMatch(artifact.statusDetail, /^Valid\b/)
    }
  })
})
