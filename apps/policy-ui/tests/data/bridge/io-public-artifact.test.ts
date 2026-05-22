import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { toIoAdapterOutput } from '../../../src/data/bridge/io-adapter.js'
import { auditIoBridgePayload } from '../../../src/data/bridge/io-audit.js'
import {
  fetchIoBridgePayload,
  IoTransportError,
  IoValidationError,
  resolveIoDefaultDataUrl,
} from '../../../src/data/bridge/io-client.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))
const MCP_CONVERSION_SOURCE_PATH = join(process.cwd(), '..', '..', 'io_model', 'io_data.js')

function loadIoDataJs(path: string): {
  EmpTotal: number[]
  EmpFormal: number[]
  EmpInformal: number[]
} {
  const code = readFileSync(path, 'utf8')
  const load = new Function(`${code}; return IO_DATA;`) as () => {
    EmpTotal: number[]
    EmpFormal: number[]
    EmpInformal: number[]
  }
  return load()
}

function loadPublicIoPayload(): IoBridgePayload {
  return JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')) as IoBridgePayload
}

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

describe('io bridge public artifact', () => {
  it('accepts the generated public IO bridge payload', () => {
    const validation = validateIoBridgePayload(loadPublicIoPayload())

    assert.equal(validation.ok, true)
    assert.ok(validation.value)
    assert.equal(
      validation.value.metadata.source_artifact,
      'io_model/io_data.json + io_model/io_data.js',
    )
    assert.match(validation.value.metadata.units, /bln UZS/)
    assert.equal(validation.value.metadata.n_sectors, 136)
    assert.equal(validation.value.sectors.length, 136)
    assert.equal(validation.value.sector_dictionary.length, 136)
    assert.equal(validation.value.sector_dictionary[0].source_label, validation.value.sectors[0].name_ru)
    assert.equal(validation.value.sector_dictionary[0].display_label_en, 'Cereal crops (excl. rice), legumes and oil seeds')
    assert.equal(validation.value.sector_dictionary[0].broad_group, 'agriculture')
    assert.equal(validation.value.sector_dictionary[0].tradable_tag, null)
    assert.equal(validation.value.sectors[0].employment_total, 343564)
    assert.equal(validation.value.matrices.technical_coefficients.length, 136)
    assert.equal(validation.value.matrices.leontief_inverse[0].length, 136)
    assert.equal(
      validation.value.caveats.some((caveat) => caveat.caveat_id === 'io-monetary-scale-audited'),
      true,
    )
    assert.equal(
      validation.value.caveats.some((caveat) => caveat.caveat_id === 'io-employment-mcp-source'),
      true,
    )
  })

  it('keeps public employment fields aligned with the tracked JS source arrays', () => {
    const validation = validateIoBridgePayload(loadPublicIoPayload())
    const mcpSource = loadIoDataJs(MCP_CONVERSION_SOURCE_PATH)
    assert.ok(validation.value)

    for (const index of [0, 4, 42, 135]) {
      assert.equal(validation.value.sectors[index].employment_total, mcpSource.EmpTotal[index])
      assert.equal(validation.value.sectors[index].employment_formal, mcpSource.EmpFormal[index])
      assert.equal(validation.value.sectors[index].employment_informal, mcpSource.EmpInformal[index])
    }
  })

  it('passes focused I-O numerical readiness audit checks', () => {
    const validation = validateIoBridgePayload(loadPublicIoPayload())
    assert.ok(validation.value)

    const audit = auditIoBridgePayload(validation.value)

    assert.equal(audit.ok, true)
    assert.equal(audit.checks.every((check) => check.status === 'pass'), true)
    assert.equal(
      audit.checks.some((check) => check.id === 'leontief-inverse' && check.detail.includes('136 x 136')),
      true,
    )
    assert.equal(
      audit.checks.some(
        (check) =>
          check.id === 'leontief-identity' &&
          check.detail.includes('(I - A) * L approximates identity'),
      ),
      true,
    )
    assert.equal(
      audit.checks.some(
        (check) =>
          check.id === 'baseline-reconstruction' &&
          check.detail.includes('L * final demand reconstructs total resources'),
      ),
      true,
    )
  })

  it('rejects malformed matrix dimensions with a path-scoped issue', () => {
    const payload = clonePayload(loadPublicIoPayload())
    payload.matrices.leontief_inverse[0] = payload.matrices.leontief_inverse[0].slice(1)

    const validation = validateIoBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'matrices.leontief_inverse[0]'),
      true,
    )
  })

  it('adapts the bridge payload to bridge-native sector summaries', () => {
    const validation = validateIoBridgePayload(loadPublicIoPayload())
    assert.ok(validation.value)

    const adapterOutput = toIoAdapterOutput(validation.value)
    const typeCountSum = Object.values(adapterOutput.type_counts).reduce((sum, count) => sum + count, 0)

    assert.equal(adapterOutput.metadata.n_sectors, 136)
    assert.equal(adapterOutput.sectors.length, 136)
    assert.equal(typeCountSum, 136)
    assert.equal(adapterOutput.top_output_multipliers.length, 10)
    assert.equal(
      adapterOutput.top_output_multipliers[0].output_multiplier >=
        adapterOutput.top_output_multipliers[1].output_multiplier,
      true,
    )
  })
})

describe('io bridge client', () => {
  it('resolves the default public artifact URL against the Vite base path', () => {
    assert.equal(resolveIoDefaultDataUrl(undefined), '/data/io.json')
    assert.equal(
      resolveIoDefaultDataUrl('/Uzbekistan-Economic-policy-engine/policy-ui/'),
      '/Uzbekistan-Economic-policy-engine/policy-ui/data/io.json',
    )
  })

  it('fetches and validates IO bridge payload through the shared bridge fetch helper', async () => {
    const payload = loadPublicIoPayload()
    const fetched = await fetchIoBridgePayload(() =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    assert.equal(fetched.attribution.model_id, 'IO')
    assert.equal(fetched.metadata.n_sectors, 136)
  })

  it('preserves IO-specific transport and validation errors', async () => {
    await assert.rejects(
      () => fetchIoBridgePayload(() => Promise.resolve(new Response('', { status: 404 }))),
      (error) => error instanceof IoTransportError && error.kind === 'http' && error.status === 404,
    )

    await assert.rejects(
      () =>
        fetchIoBridgePayload(() =>
          Promise.resolve(
            new Response(JSON.stringify({ sectors: [] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        ),
      (error) => error instanceof IoValidationError && error.issues.length > 0,
    )
  })
})
