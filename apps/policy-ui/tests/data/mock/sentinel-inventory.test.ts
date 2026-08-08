import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  collectSentinelInventory,
  EDITORIAL_SENTINEL_TEXT,
} from '../../../src/data/mock/sentinel-inventory.js'
import { modelCatalogEntries } from '../../../src/data/mock/model-catalog.js'
import { overviewV1Data } from '../../../src/data/mock/overview.js'

describe('sentinel inventory', () => {
  it('tracks the Week 1 Shot 2 editorial burn-down surfaces', () => {
    const inventory = collectSentinelInventory()
    assert.deepEqual(
      inventory.map((item) => item.id),
      [
        'overview.kpi.context_notes',
        'model_explorer.validation_summaries',
        'model_explorer.equation_detail_sets',
        'comparison.tradeoff.shell_a_c',
      ],
    )
  })

  it('reports current sentinel counts for content owners', () => {
    const byId = new Map(collectSentinelInventory().map((item) => [item.id, item]))

    assert.equal(byId.get('overview.kpi.context_notes')?.count, 0)
    assert.equal(byId.get('model_explorer.validation_summaries')?.count, 0)
    assert.equal(byId.get('model_explorer.equation_detail_sets')?.count, 0)
    assert.equal(byId.get('comparison.tradeoff.shell_a_c')?.count, 0)
  })

  it('stays aligned with the actual Overview and Model Explorer sentinel data', () => {
    const overviewSentinels = overviewV1Data.headline_metrics.filter(
      (metric) => metric.context_note === EDITORIAL_SENTINEL_TEXT,
    )
    const modelValidationSentinels = modelCatalogEntries.filter((entry) =>
      entry.validation_summary.includes(EDITORIAL_SENTINEL_TEXT),
    )
    const byId = new Map(collectSentinelInventory().map((item) => [item.id, item]))

    assert.equal(byId.get('overview.kpi.context_notes')?.count, overviewSentinels.length)
    assert.equal(
      byId.get('model_explorer.validation_summaries')?.count,
      modelValidationSentinels.length,
    )
  })
})

