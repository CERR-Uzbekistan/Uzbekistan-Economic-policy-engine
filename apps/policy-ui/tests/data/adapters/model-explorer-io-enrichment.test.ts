import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  enrichModelExplorerWorkspaceWithIoBridge,
  toModelExplorerIoBridgeEvidence,
} from '../../../src/data/adapters/model-explorer-io-enrichment.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import { modelExplorerWorkspaceMock } from '../../../src/data/mock/model-explorer.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))

function loadValidIoPayload(): IoBridgePayload {
  const validation = validateIoBridgePayload(JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('model explorer IO bridge enrichment', () => {
  it('maps the validated IO public artifact into Model Explorer bridge evidence', () => {
    const evidence = toModelExplorerIoBridgeEvidence(loadValidIoPayload())
    const linkageCountSum = (evidence.linkage_counts ?? []).reduce((sum, item) => sum + Number(item.value), 0)

    assert.equal(evidence.status_label, 'Validated')
    assert.equal(evidence.source_artifact, 'io_model/io_data.json + io_model/io_data.js')
    assert.equal(evidence.data_version, '2022')
    assert.equal(evidence.exported_at, '2026-04-09')
    assert.equal(evidence.solver_version, '0.1.0')
    assert.equal(evidence.sector_count, 136)
    assert.match(evidence.units ?? '', /bln UZS/)
    assert.equal(linkageCountSum, 136)
    assert.equal(
      evidence.caveats.some((caveat) => caveat.includes('Type II induced-consumption arrays')),
      true,
    )
  })

  it('adds bridge evidence only to the existing I-O catalog entry', () => {
    const enriched = enrichModelExplorerWorkspaceWithIoBridge(modelExplorerWorkspaceMock, loadValidIoPayload())
    const entries = Object.values(enriched.catalog_entries_by_model_id ?? {})
    const ioEntry = enriched.catalog_entries_by_model_id?.['io-model']

    assert.equal(entries.length, 6)
    assert.ok(ioEntry?.bridge_evidence)
    assert.equal(ioEntry?.stats[0].value, '136')
    assert.equal(ioEntry?.stats[1].value, '2022')
    assert.equal(
      ioEntry?.parameters.some((parameter) => parameter.symbol === 'classes' && parameter.value.includes('Key 18')),
      true,
    )
    assert.equal(ioEntry?.caveats.some((caveat) => caveat.id === 'io-type-i-only-json-source'), true)
    assert.equal(ioEntry?.caveats.some((caveat) => caveat.id === 'io-monetary-scale-audited'), true)
    assert.match(ioEntry?.validation_summary.join(' ') ?? '', /does not claim price, substitution/)
    assert.equal(enriched.catalog_entries_by_model_id?.['qpm-uzbekistan']?.bridge_evidence, undefined)
  })
})
