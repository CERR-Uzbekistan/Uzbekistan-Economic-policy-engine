import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getComparisonBasisKey,
  OVERVIEW_COMPARISON_BASIS_METRIC_IDS,
} from '../../../src/components/overview/metric-comparison-basis.js'
import { OVERVIEW_METRIC_SEMANTICS } from '../../../src/components/overview/metric-semantics.js'
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

  it('defines explicit delta display semantics for rate, FX, and trade metrics', () => {
    assert.equal(OVERVIEW_METRIC_SEMANTICS.cpi_yoy.delta_display_mode, 'percentage_point')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.cpi_mom.delta_display_mode, 'percentage_point')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.real_gdp_growth_quarter_yoy.delta_unit, 'pp')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.policy_rate.delta_unit, 'pp')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.usd_uzs_level.sign_interpretation, 'usd_uzs')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.usd_uzs_mom_change.sign_interpretation, 'usd_uzs')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.usd_uzs_yoy_change.sign_interpretation, 'usd_uzs')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.trade_balance.sign_interpretation, 'trade_balance')
    assert.equal(OVERVIEW_METRIC_SEMANTICS.trade_balance.display_unit, 'USD bn')
  })
})
