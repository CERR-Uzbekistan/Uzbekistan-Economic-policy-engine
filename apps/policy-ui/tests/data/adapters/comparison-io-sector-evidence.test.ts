import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { composeComparisonContent } from '../../../src/data/adapters/comparison.js'
import { toComparisonSectorEvidence } from '../../../src/data/adapters/comparison-io-sector-evidence.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import { comparisonWorkspaceMock } from '../../../src/data/mock/comparison.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))

function loadValidIoPayload(): IoBridgePayload {
  const validation = validateIoBridgePayload(JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('comparison IO sector evidence adapter', () => {
  it('maps a valid IO payload into page-native sector evidence panel data', () => {
    const evidence = toComparisonSectorEvidence(loadValidIoPayload())
    const linkageCountSum = evidence.linkage_counts.reduce((sum, item) => sum + item.value, 0)

    assert.equal(evidence.source_artifact, 'io_model/io_data.json + mcp_server/data/io_data.json')
    assert.equal(evidence.data_vintage, '2022')
    assert.equal(evidence.exported_at, '2026-04-09')
    assert.equal(evidence.sector_count, 136)
    assert.equal(evidence.units, 'thousand UZS')
    assert.equal(linkageCountSum, 136)
    assert.equal(
      evidence.caveats.some((caveat) => caveat.includes('Type II induced-consumption arrays')),
      true,
    )
  })

  it('keeps existing Comparison macro rows unchanged when IO evidence is composed separately', () => {
    const baselineContent = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    const evidence = toComparisonSectorEvidence(loadValidIoPayload())
    const contentAfterEvidence = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )

    assert.equal(evidence.sector_count, 136)
    assert.deepEqual(contentAfterEvidence.metrics, baselineContent.metrics)
    assert.equal(contentAfterEvidence.metrics.length, 7)
    assert.deepEqual(contentAfterEvidence.metrics.map((metric) => metric.id), [
      'gdp_growth',
      'inflation',
      'current_account',
      'fiscal_balance',
      'reserves_end',
      'unemployment_avg',
      'real_wages_cumulative',
    ])
  })
})
