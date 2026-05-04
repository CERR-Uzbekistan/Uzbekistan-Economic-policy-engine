import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImpulseResponseChart } from '../../../src/components/scenario-lab/ImpulseResponseChart.js'
import type { ChartSpec } from '../../../src/contracts/data-contract.js'

const impulseChart: ChartSpec = {
  chart_id: 'impulse-response',
  title: 'Impulse response',
  subtitle: 'Baseline deviation over 12 quarters',
  chart_type: 'line',
  x: {
    label: 'Quarter',
    unit: '',
    values: ['Q1', 'Q2', 'Q3'],
  },
  y: {
    label: 'Deviation',
    unit: 'pp',
    values: [0.1, 0.3, 0.2],
  },
  series: [
    {
      series_id: 'gdp-gap',
      label: 'GDP gap',
      semantic_role: 'baseline',
      values: [0.1, 0.3, 0.2],
    },
    {
      series_id: 'inflation',
      label: 'Inflation',
      semantic_role: 'alternative',
      values: [0.0, 0.2, 0.4],
    },
    {
      series_id: 'policy-rate',
      label: 'Policy rate',
      semantic_role: 'other',
      values: [0.5, 0.4, 0.2],
    },
  ],
  view_mode: 'delta',
  uncertainty: [],
  takeaway: 'Impulse response peaks in Q2.',
  model_attribution: [
    {
      model_id: 'QPM',
      model_name: 'Quarterly Projection Model',
      module: 'scenario_lab',
      version: '1',
      run_id: 'run-1',
      data_version: '2026Q1',
      timestamp: '2026-04-30T00:00:00Z',
    },
  ],
}

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
          scenarioLab: {
            results: {
              impulseResponseEyebrow: 'Impulse response',
              impulseResponseCaption: 'Generated from the active scenario assumptions.',
              claimLabels: {
                headlineImpact: 'Baseline deviation',
              },
              explanations: {
                headlineImpact: 'Values are modelled deviations, not forecasts.',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('ImpulseResponseChart', () => {
  it('renders through ChartRenderer with chart frame and axis context', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ImpulseResponseChart chart={impulseChart} />
      </I18nextProvider>,
    )

    assert.match(markup, /scenario-impulse-card/)
    assert.match(markup, /Impulse response/)
    assert.match(markup, /role="img"/)
    assert.match(markup, /aria-label="Impulse response"/)
    assert.match(markup, /Quarter · Deviation \(pp\)/)
    assert.match(markup, /Generated from the active scenario assumptions\./)
    assert.match(markup, />QPM · FPP</)
  })
})
