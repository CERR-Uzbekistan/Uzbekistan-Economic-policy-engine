import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { TradeoffSummaryPanel } from '../../../src/components/comparison/TradeoffSummaryPanel.js'
import type { ComparisonScenario } from '../../../src/contracts/data-contract.js'

async function createTestI18n() {
  const instance = i18next.createInstance()
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources: {
      en: {
        common: {
          comparison: {
            tradeoff: {
              title: 'Tradeoff summary',
              description: 'Template prose.',
              empty: 'Select alternatives to compare.',
              template: 'Compared to baseline, {{scenario_name}} {{delta_gdp}}{{delta_inf}}{{delta_rate}}.',
              negligible: 'Compared to baseline, {{scenario_name}} shows negligible differences across headline metrics.',
              shifts: 'shifts',
              by: 'by',
              metric: {
                gdp_growth: 'GDP',
                inflation: 'inflation',
                policy_rate: 'policy rate',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

function buildScenario(overrides: Partial<ComparisonScenario>): ComparisonScenario {
  return {
    scenario_id: 'scenario',
    scenario_name: 'Scenario',
    scenario_type: 'alternative',
    summary: 'Summary',
    initial_tag: 'balanced',
    values: {
      gdp_growth: 5,
      inflation: 4,
      policy_rate: 12,
    },
    risk_index: 0.3,
    ...overrides,
  }
}

describe('TradeoffSummaryPanel', () => {
  it('renders shifts token with a separator space before metric label', async () => {
    const i18n = await createTestI18n()
    const baseline = buildScenario({
      scenario_id: 'baseline',
      scenario_name: 'Baseline',
      scenario_type: 'baseline',
      values: { gdp_growth: 5, inflation: 4, policy_rate: 12 },
    })
    const alternative = buildScenario({
      scenario_id: 'rate-cut-100bp',
      scenario_name: 'Rate cut',
      values: { gdp_growth: 5.8, inflation: 4, policy_rate: 12 },
    })

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <TradeoffSummaryPanel selectedScenarios={[baseline, alternative]} baselineId="baseline" />
      </I18nextProvider>,
    )

    assert.match(markup, /shifts GDP by \+0\.8pp/)
    assert.equal(markup.includes('shiftsGDP by'), false)
  })
})
