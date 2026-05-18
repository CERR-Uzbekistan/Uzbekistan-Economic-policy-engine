import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

describe('OverviewPage render order', () => {
  it('keeps snapshot before nowcast, then scenario tests and monitoring', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'pages', 'OverviewPage.tsx'), 'utf8')
    const pageHeader = source.indexOf('<PageHeader')
    const stateHeader = source.indexOf('<EconomicStateHeader')
    const kpis = source.indexOf('<KpiStrip')
    const risks = source.indexOf('<RiskPanel')
    const indicators = source.indexOf('<IndicatorPanelGrid')
    const nowcast = source.indexOf('<NowcastForecastBlock')
    const notes = source.indexOf('<CaveatPanel')
    const feeds = source.indexOf('<OverviewFeeds')
    const refs = source.indexOf('<ReferencesFooter')

    assert.ok(pageHeader < stateHeader)
    assert.ok(stateHeader < kpis)
    assert.ok(kpis < nowcast)
    assert.equal(source.indexOf('<QuickActions'), -1)
    assert.equal(source.indexOf('<SupportingMetricTable'), -1)
    assert.ok(nowcast < risks)
    assert.ok(risks < indicators)
    assert.ok(nowcast < indicators)
    assert.ok(nowcast < notes)
    assert.ok(indicators < notes)
    assert.ok(notes < feeds)
    assert.ok(feeds < refs)
  })
})
