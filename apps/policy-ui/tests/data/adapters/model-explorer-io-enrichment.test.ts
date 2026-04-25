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
    const linkageCountSum = evidence.linkage_counts.reduce((sum, item) => sum + Number(item.value), 0)

    assert.equal(evidence.status_label, 'Validated')
    assert.equal(evidence.source_artifact, 'io_model/io_data.json')
    assert.equal(evidence.data_version, '2022')
    assert.equal(evidence.exported_at, '2026-04-09')
    assert.equal(evidence.solver_version, '0.1.0')
    assert.equal(evidence.sector_count, 136)
    assert.equal(evidence.units, 'thousand UZS')
    assert.equal(linkageCountSum, 136)
    assert.equal(
      evidence.caveats.some((caveat) => caveat.includes('Type II induced-consumption arrays')),
      true,
    )
  })

  it('adds bridge evidence only to the existing I-O catalog entry', () => {
    const enriched = enrichModelExplorerWorkspaceWithIoBridge(modelExplorerWorkspaceMock, loadValidIoPayload())
    const entries = Object.values(enriched.catalog_entries_by_model_id ?? {})

    assert.equal(entries.length, 6)
    assert.ok(enriched.catalog_entries_by_model_id?.['io-model']?.bridge_evidence)
    assert.equal(enriched.catalog_entries_by_model_id?.['qpm-uzbekistan']?.bridge_evidence, undefined)
  })
})
