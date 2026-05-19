import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  enrichModelExplorerWorkspaceWithQpmBridge,
  toModelExplorerQpmBridgeEvidence,
} from '../../../src/data/adapters/model-explorer-qpm-enrichment.js'
import { validateQpmBridgePayload } from '../../../src/data/bridge/qpm-guard.js'
import type { QpmBridgePayload } from '../../../src/data/bridge/qpm-types.js'
import { modelExplorerWorkspaceMock } from '../../../src/data/mock/model-explorer.js'

const QPM_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/qpm.json', import.meta.url))

function loadValidQpmPayload(): QpmBridgePayload {
  const validation = validateQpmBridgePayload(JSON.parse(readFileSync(QPM_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('model explorer QPM bridge enrichment', () => {
  it('maps the validated QPM public artifact into Model Explorer bridge evidence', () => {
    const payload = loadValidQpmPayload()
    const evidence = toModelExplorerQpmBridgeEvidence(payload)

    assert.equal(evidence.status_label, 'Validated')
    assert.equal(evidence.source_artifact, 'apps/policy-ui/public/data/qpm.json')
    assert.equal(evidence.data_version, payload.attribution.data_version)
    assert.equal(evidence.exported_at, payload.metadata.exported_at.slice(0, 10))
    assert.equal(evidence.solver_version, payload.metadata.solver_version)
    assert.equal(evidence.evidence_metrics?.find((metric) => metric.label === 'Scenarios')?.value, '5')
    assert.equal(
      evidence.caveats.some((caveat) => caveat.includes('gap*_t follows AR(1) decay with rho=0.75')),
      true,
    )
  })

  it('replaces stale static QPM parameters and caveats with the public artifact values', () => {
    const payload = loadValidQpmPayload()
    const enriched = enrichModelExplorerWorkspaceWithQpmBridge(modelExplorerWorkspaceMock, payload)
    const qpmEntry = enriched.catalog_entries_by_model_id?.['qpm-uzbekistan']

    assert.ok(qpmEntry)
    assert.equal(qpmEntry.parameters[0].symbol, 'b1')
    assert.equal(qpmEntry.parameters[0].value, '0.7')
    assert.equal(qpmEntry.parameters.some((parameter) => parameter.symbol === 'rs_neutral'), true)
    assert.equal(qpmEntry.caveats.some((caveat) => caveat.id === 'qpm-external-demand-ar1'), true)
    assert.match(qpmEntry.validation_summary.join(' '), /canonical baseline, rate-cut, rate-hike/)
    assert.equal(qpmEntry.bridge_evidence?.evidence_metrics?.length, 3)
  })
})
