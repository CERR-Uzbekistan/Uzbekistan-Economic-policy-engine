import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  enrichModelExplorerWorkspaceWithDfmBridge,
  toModelExplorerDfmBridgeEvidence,
} from '../../../src/data/adapters/model-explorer-dfm-enrichment.js'
import { validateDfmBridgePayload } from '../../../src/data/bridge/dfm-guard.js'
import type { DfmBridgePayload } from '../../../src/data/bridge/dfm-types.js'
import { modelExplorerWorkspaceMock } from '../../../src/data/mock/model-explorer.js'

const DFM_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/dfm.json', import.meta.url))

function loadValidDfmPayload(): DfmBridgePayload {
  const validation = validateDfmBridgePayload(JSON.parse(readFileSync(DFM_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('model explorer DFM bridge enrichment', () => {
  it('maps the validated DFM public artifact into Model Explorer bridge evidence', () => {
    const payload = loadValidDfmPayload()
    const evidence = toModelExplorerDfmBridgeEvidence(payload)

    assert.equal(evidence.status_label, 'Validated')
    assert.equal(evidence.source_artifact, 'apps/policy-ui/public/data/dfm.json')
    assert.equal(evidence.data_version, payload.attribution.data_version)
    assert.equal(evidence.exported_at, payload.metadata.exported_at.slice(0, 10))
    assert.equal(evidence.solver_version, payload.metadata.solver_version)
    assert.equal(
      evidence.evidence_metrics?.find((metric) => metric.label === 'Indicators')?.value,
      String(payload.indicators.length),
    )
    assert.equal(
      evidence.evidence_metrics?.find((metric) => metric.label === 'Forward horizon')?.value,
      '0 quarters',
    )
    assert.equal(
      evidence.caveats.some((caveat) => caveat.includes('Official StatOffice YoY publication')),
      true,
    )
  })

  it('replaces static DFM methodology values with public artifact-backed facts', () => {
    const payload = loadValidDfmPayload()
    const enriched = enrichModelExplorerWorkspaceWithDfmBridge(modelExplorerWorkspaceMock, payload)
    const dfmEntry = enriched.catalog_entries_by_model_id?.['dfm-nowcast']

    assert.ok(dfmEntry)
    assert.equal(dfmEntry.stats[0].value, String(payload.indicators.length))
    assert.equal(dfmEntry.stats[2].value, payload.nowcast.current_quarter.period)
    assert.equal(dfmEntry.parameters.some((parameter) => parameter.symbol === 'h' && parameter.value === '0 quarters'), true)
    assert.equal(dfmEntry.caveats.some((caveat) => caveat.id === 'dfm-parameters-frozen-at-refit'), true)
    assert.match(dfmEntry.validation_summary.join(' '), /does not validate model economics/)
    assert.equal(dfmEntry.bridge_evidence?.source_artifact, 'apps/policy-ui/public/data/dfm.json')
  })
})
