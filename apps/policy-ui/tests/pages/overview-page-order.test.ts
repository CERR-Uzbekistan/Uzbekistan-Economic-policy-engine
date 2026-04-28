import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

describe('OverviewPage render order', () => {
  it('keeps operations before grouped indicators and nowcast', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'pages', 'OverviewPage.tsx'), 'utf8')
    const pageHeader = source.indexOf('<PageHeader')
    const stateHeader = source.indexOf('<EconomicStateHeader')
    const kpis = source.indexOf('<KpiStrip')
    const risks = source.indexOf('<RiskPanel')
    const actions = source.indexOf('<QuickActions')
    const indicators = source.indexOf('<IndicatorPanelGrid')
    const nowcast = source.indexOf('<NowcastForecastBlock')
    const notes = source.indexOf('<CaveatPanel')
    const feeds = source.indexOf('<OverviewFeeds')
    const refs = source.indexOf('<ReferencesFooter')

    assert.ok(pageHeader < stateHeader)
    assert.ok(stateHeader < kpis)
    assert.ok(kpis < risks)
    assert.ok(risks < actions)
    assert.ok(actions < indicators)
    assert.ok(indicators < nowcast)
    assert.ok(nowcast < notes)
    assert.ok(notes < feeds)
    assert.ok(feeds < refs)
  })
})
