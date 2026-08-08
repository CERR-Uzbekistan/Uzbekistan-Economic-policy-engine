import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildOverviewMacroPulseTokens } from '../../../src/data/overview/macro-pulse.js'
import { overviewArtifactToMacroSnapshot } from '../../../src/data/overview/artifact-adapter.js'
import { buildValidOverviewArtifact } from './overview-artifact-fixture.js'

const TRANSLATIONS: Record<string, string> = {
  'overview.common.middleDot': '·',
  'overview.common.slash': '/',
  'overview.macroPulse.gdp': 'GDP',
  'overview.macroPulse.cpi': 'CPI',
  'overview.macroPulse.tradeBalance': 'Trade balance',
  'overview.macroPulse.usdUzs': 'USD/UZS',
  'overview.macroPulse.yoy': 'YoY',
  'overview.macroPulse.mom': 'MoM',
  'overview.tradeBalance.deficit': 'deficit',
  'overview.tradeBalance.surplus': 'surplus',
  'overview.tradeBalance.balanced': 'balanced',
  'overview.tradeBalance.usdBnPattern': 'USD {{value}}bn {{position}}',
  'overview.fx.stronger': 'UZS stronger',
  'overview.fx.weaker': 'UZS weaker',
  'overview.fx.unchanged': 'unchanged',
}

function t(key: string, options?: Record<string, unknown>): string {
  let template = TRANSLATIONS[key] ?? key
  for (const [name, value] of Object.entries(options ?? {})) {
    template = template.replaceAll(`{{${name}}}`, String(value))
  }
  return template
}

describe('overview macro pulse selector', () => {
  it('preserves semantic formatting for GDP, CPI, FX, and trade balance', () => {
    const artifact = buildValidOverviewArtifact()
    const byId = new Map(artifact.metrics.map((metric) => [metric.id, metric]))
    const gdp = byId.get('real_gdp_growth_quarter_yoy')
    const cpiYoy = byId.get('cpi_yoy')
    const cpiMom = byId.get('cpi_mom')
    const tradeBalance = byId.get('trade_balance')
    const usdUzs = byId.get('usd_uzs_level')
    if (!gdp || !cpiYoy || !cpiMom || !tradeBalance || !usdUzs) {
      throw new Error('fixture missing pulse metrics')
    }
    gdp.value = 8.7
    cpiYoy.value = 7.1
    cpiMom.value = 0.6
    tradeBalance.value = -4.51
    usdUzs.value = 12073
    usdUzs.previous_value = 12170

    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const tokens = buildOverviewMacroPulseTokens(
      [...(snapshot.artifact_summary_metrics ?? []), ...snapshot.headline_metrics],
      'en',
      t,
    )
    const valuesById = new Map(tokens.map((token) => [token.id, `${token.label} ${token.value}`]))

    assert.equal(valuesById.get('gdp'), 'GDP 8.7 %')
    assert.equal(valuesById.get('cpi'), 'CPI 7.1 % YoY / 0.6 % MoM')
    assert.equal(valuesById.get('trade_balance'), 'Trade balance USD 4.51bn deficit')
    assert.equal(valuesById.get('usd_uzs'), 'USD/UZS 12,073 UZS/USD · UZS stronger 0.8%')
  })
})
