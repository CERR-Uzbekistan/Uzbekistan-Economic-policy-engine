import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { KpiStrip } from '../../../src/components/overview/KpiStrip.js'
import type { HeadlineMetric } from '../../../src/contracts/data-contract.js'

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
          overview: {
            common: { middleDot: '·' },
            kpi: {
              title: 'Core indicators',
              description: 'desc',
              empty: 'empty',
              deltaSrLabel: '{{direction}} by {{delta}}',
              noPrior: 'No prior',
              notAvailable: 'n/a',
              freshness: 'Metric timestamp {{date}}',
              smePendingChip: 'SME content pending',
              smePendingAria: 'SME pending',
              provenance: {
                observed: 'Observed',
                nowcast: 'Nowcast',
                scenario: 'Scenario',
                reference: 'Reference',
                draft: 'Draft',
              },
              direction: { up: 'higher', down: 'lower', flat: 'unchanged' },
            },
          },
        },
      },
    },
  })
  return instance
}

function buildMetric(overrides: Partial<HeadlineMetric> = {}): HeadlineMetric {
  return {
    metric_id: 'gdp',
    label: 'GDP',
    value: 5.8,
    unit: '%',
    period: '2026 Q1',
    baseline_value: 5.5,
    delta_abs: 0.3,
    delta_pct: 5.45,
    direction: 'up',
    confidence: 'medium',
    last_updated: '2026-04-16T17:30:00+05:00',
    model_attribution: [],
    ...overrides,
  }
}

describe('KpiStrip', () => {
  it('renders SME-pending warn chip when context_note is the sentinel', async () => {
    const i18n = await createTestI18n()
    const metric = buildMetric({ context_note: '[SME content pending]' })
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[metric]} />
      </I18nextProvider>,
    )

    assert.match(markup, /ui-chip--warn/)
    assert.match(markup, /SME content pending/)
  })

  it('renders plain context_note when a non-sentinel value is present', async () => {
    const i18n = await createTestI18n()
    const metric = buildMetric({ context_note: '70% band · 5.2 – 6.4%' })
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[metric]} />
      </I18nextProvider>,
    )

    assert.match(markup, /70% band · 5\.2 – 6\.4%/)
    assert.doesNotMatch(markup, /ui-chip--warn/)
  })

  it('does not render the removed "Core indicators" section heading', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[buildMetric()]} />
      </I18nextProvider>,
    )

    // The h2 still exists as sr-only landmark, but no visible .page-section-head wrapper.
    assert.doesNotMatch(markup, /class="overview-section-head/)
  })

  it('renders inline arrow-glyph delta (not a chip-pill)', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[buildMetric({ direction: 'up', delta_abs: 0.3 })]} />
      </I18nextProvider>,
    )

    // Old implementation used <span class="... ui-chip ui-chip--neutral"> for the delta.
    // Shot-1: delta renders as <p class="kpi__delta overview-kpi-trend"> with ↑ glyph.
    assert.match(markup, /overview-kpi-trend__glyph[^>]*>↑/)
    assert.doesNotMatch(markup, /overview-kpi-trend[^"]*ui-chip/)
  })

  it('renders conservative provenance pills from supported attribution metadata', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'gdp',
              model_attribution: [
                {
                  model_id: 'dfm-nowcast',
                  model_name: 'DFM',
                  module: 'nowcast',
                  version: '1.0.0',
                  run_id: 'dfm-1',
                  data_version: '2026Q1',
                  timestamp: '2026-04-16T17:30:00+05:00',
                },
              ],
            }),
            buildMetric({
              metric_id: 'inflation',
              model_attribution: [
                {
                  model_id: 'qpm_uzbekistan',
                  model_name: 'QPM',
                  module: 'monetary',
                  version: '1.0.0',
                  run_id: 'qpm-1',
                  data_version: 'mock-v1',
                  timestamp: '2026-04-16T17:30:00+05:00',
                },
              ],
            }),
            buildMetric({
              metric_id: 'external',
              model_attribution: [
                {
                  model_id: 'pe_trade_reference',
                  model_name: 'PE Trade',
                  module: 'external',
                  version: '1.0.0',
                  run_id: 'pe-1',
                  data_version: 'mock-v1',
                  timestamp: '2026-04-16T17:30:00+05:00',
                },
              ],
            }),
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /Nowcast/)
    assert.match(markup, /Scenario/)
    assert.match(markup, /Reference/)
    assert.match(markup, /overview-kpi-card__provenance--nowcast/)
  })
})
