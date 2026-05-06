import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { toDfmAdapterOutput } from '../../../src/data/bridge/dfm-adapter.js'
import type { DfmBridgePayload } from '../../../src/data/bridge/dfm-types.js'
import {
  classifyDfmContribution,
  composeDfmContributionDetails,
} from '../../../src/data/overview/dfm-contribution-detail.js'

function loadCommittedDfmPayload(): DfmBridgePayload {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'public', 'data', 'dfm.json'), 'utf8'),
  ) as DfmBridgePayload
}

function findIndicator(payload: DfmBridgePayload, indicatorId: string) {
  const indicator = payload.indicators.find((item) => item.indicator_id === indicatorId)
  assert.ok(indicator, `expected ${indicatorId} in DFM artifact`)
  return indicator
}

describe('dfm contribution detail', () => {
  it('reads the current DFM artifact with 2026Q1 GDP YoY around 7.0078 percent', () => {
    const payload = loadCommittedDfmPayload()

    assert.equal(payload.nowcast.current_quarter.period, '2026Q1')
    assert.ok(payload.nowcast.current_quarter.gdp_growth_yoy_pct !== null)
    assert.ok(Math.abs(payload.nowcast.current_quarter.gdp_growth_yoy_pct - 7.0078) < 0.0001)
  })

  it('classifies IND_YOY=-0.5017 as a contracting negative growth signal', () => {
    const payload = loadCommittedDfmPayload()
    const adapter = toDfmAdapterOutput(payload)
    const indicator = adapter.indicators.find((item) => item.indicator_id === 'IND_YOY')

    assert.ok(indicator, 'expected IND_YOY in adapter output')
    assert.equal(indicator.latest_value, -0.5017)
    const signal = classifyDfmContribution(indicator)
    assert.equal(signal.kind, 'contracting')
    assert.equal(signal.tone, 'negative')
    assert.equal(signal.isGrowthRate, true)
  })

  it('keeps Wholesale Trade Growth visible even when pinned rows are needed', () => {
    const payload = loadCommittedDfmPayload()
    const adapter = toDfmAdapterOutput(payload)
    const rows = composeDfmContributionDetails(adapter, { limit: 3 })

    assert.ok(
      rows.some((row) => row.indicatorId === 'wholesale_trade_grwth'),
      'expected wholesale_trade_grwth to be pinned into detail rows',
    )
  })

  it('does not label M0 as Contracting when its native latest value is negative', () => {
    const payload = loadCommittedDfmPayload()
    const adapter = toDfmAdapterOutput(payload)
    const m0 = adapter.indicators.find((item) => item.indicator_id === 'm0')

    assert.ok(m0, 'expected m0 in adapter output')
    assert.equal(m0.latest_value, -2.9709)
    const signal = classifyDfmContribution(m0)
    assert.equal(signal.kind, 'monetary-aggregate-native')
    assert.equal(signal.isGrowthRate, false)
    assert.notEqual(signal.kind, 'contracting')
  })

  it('omits the quarterly GDP target from indicator detail rows', () => {
    const payload = loadCommittedDfmPayload()
    const adapter = toDfmAdapterOutput(payload)
    const rows = composeDfmContributionDetails(adapter)

    findIndicator(payload, 'gdp')
    assert.equal(rows.some((row) => row.indicatorId === 'gdp'), false)
  })
})
