import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getComparisonBasisKey,
  OVERVIEW_COMPARISON_BASIS_METRIC_IDS,
} from '../../../src/components/overview/metric-comparison-basis.js'
import { OVERVIEW_LOCKED_METRICS } from '../../../src/data/overview/artifact-types.js'

describe('overview metric comparison basis', () => {
  it('covers every locked Overview metric id exactly once', () => {
    const lockedIds = OVERVIEW_LOCKED_METRICS.map((metric) => metric.id).sort()
    assert.deepEqual([...OVERVIEW_COMPARISON_BASIS_METRIC_IDS].sort(), lockedIds)

    for (const metricId of lockedIds) {
      assert.equal(typeof getComparisonBasisKey(metricId), 'string')
    }
  })

  it('returns null for unmapped ids instead of fallback text', () => {
    assert.equal(getComparisonBasisKey('unknown_metric'), null)
  })
})
