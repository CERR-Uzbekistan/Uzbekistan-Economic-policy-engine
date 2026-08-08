import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { DeltaTable } from '../../../src/components/comparison/DeltaTable.js'
import type {
  ComparisonMetricRow,
  ComparisonScenarioMeta,
} from '../../../src/contracts/data-contract.js'

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
            table: {
              indicator: 'Indicator',
              baselineFallback: 'Baseline',
              highestTitle: 'Numerically highest',
              lowestTitle: 'Numerically lowest',
              footnote:
                '★ indicates numerically lowest or highest value. Policy judgment is separate and not encoded.',
            },
          },
        },
      },
    },
  })
  return instance
}

const scenarios: ComparisonScenarioMeta[] = [
  { id: 'baseline', name: 'Baseline', role: 'baseline', role_label: 'Baseline' },
  { id: 'alt', name: 'Alt', role: 'alternative', role_label: 'Alternative' },
  { id: 'stress', name: 'Stress', role: 'downside', role_label: 'Stress' },
]

const metrics: ComparisonMetricRow[] = [
  {
    id: 'gdp',
    label: 'GDP · 3y avg',
    baseline_value: '+5.8%',
    values: { baseline: '+5.8%', alt: '+5.3%', stress: '+4.8%' },
    deltas: { baseline: '—', alt: '−0.5 pp', stress: '−1.0 pp' },
    highest_scenario: 'baseline',
  },
  {
    id: 'infl',
    label: 'Inflation · terminal',
    baseline_value: '5.4%',
    values: { baseline: '5.4%', alt: '4.6%', stress: '5.7%' },
    deltas: { baseline: '—', alt: '−0.8 pp', stress: '+0.3 pp' },
    lowest_scenario: 'alt',
  },
]

describe('DeltaTable', () => {
  it('applies highest class to baseline cell when highest_scenario === baseline', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DeltaTable scenarios={scenarios} metrics={metrics} baselineScenarioId="baseline" />
      </I18nextProvider>,
    )

    assert.match(markup, /<td class="num highest"[^>]*>\+5\.8%<\/td>/)
  })

  it('applies lowest class to alt cell when lowest_scenario === alt', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DeltaTable scenarios={scenarios} metrics={metrics} baselineScenarioId="baseline" />
      </I18nextProvider>,
    )

    assert.match(markup, /<td class="num lowest"[^>]*>4\.6%<\/td>/)
  })

  it('renders policy-judgment footnote below the table', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DeltaTable scenarios={scenarios} metrics={metrics} baselineScenarioId="baseline" />
      </I18nextProvider>,
    )

    assert.match(markup, /Policy judgment is separate and not encoded/)
  })
})
