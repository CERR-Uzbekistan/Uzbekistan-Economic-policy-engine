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
            delta: {
              vsPeriodBasis: 'vs {{period}} {{basis}}',
            },
            tradeBalance: {
              deficit: 'deficit',
              surplus: 'surplus',
              balanced: 'balanced',
              usdBnPattern: 'USD {{value}}bn {{position}}',
            },
            fx: {
              stronger: 'UZS stronger',
              weaker: 'UZS weaker',
              unchanged: 'unchanged',
            },
            claimLabels: {
              observed: 'Observed',
              calculated: 'Calculated',
              nowcast: 'Nowcast',
              reference: 'Reference',
              forecast: 'Forecast',
            },
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
            comparisonBasis: {
              cpi_yoy: 'print',
              real_gdp_growth_quarter_yoy: 'print',
              gdp_nowcast_current_quarter: 'model nowcast',
              policy_rate: 'policy setting',
            },
            indicators: {
              status: {
                warning: 'Caution',
                failed: 'Failed',
              },
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
    delta_value: 0.3,
    delta_unit: 'pp',
    delta_basis: 'percentage_point',
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
    assert.match(markup, /title="70% band · 5\.2 – 6\.4%"/)
    assert.doesNotMatch(markup, /ui-chip--warn/)
  })

  it('keeps warning status in the KPI top meta area', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[buildMetric({ validation_status: 'warning' })]} />
      </I18nextProvider>,
    )

    assert.match(
      markup,
      /overview-kpi-card__top-meta[\s\S]*overview-kpi-card__status[\s\S]*Caution/,
    )
    assert.doesNotMatch(markup, /kpi__freshness/)
    assert.doesNotMatch(markup, /overview-kpi-card__meta[\s\S]*overview-kpi-card__status/)
  })

  it('renders accessible comparison-basis text on headline KPI cards', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'cpi_yoy',
              label: 'CPI inflation',
              comparison_basis_key: 'overview.comparisonBasis.cpi_yoy',
              comparison_period: 'Feb 2026',
            }),
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /data-metric-id="cpi_yoy"/)
    assert.match(markup, /↑<\/span> \+0\.3 pp vs Feb 2026 print/)
    assert.doesNotMatch(markup, /title="vs Feb 2026 print"/)
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

  it('renders localized no-prior text for null deltas', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip metrics={[buildMetric({
          baseline_value: null,
          delta_abs: null,
          delta_value: null,
          delta_pct: null,
          direction: 'flat',
        })]} />
      </I18nextProvider>,
    )

    assert.match(markup, /aria-label="No prior"[^>]*>No prior/)
    assert.doesNotMatch(markup, /→ n\/a/)
  })

  it('renders compact claim labels from claim_type semantics instead of attribution text', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'real_gdp_growth_quarter_yoy',
              claim_type: 'observed',
              claim_label_key: 'overview.claimLabels.observed',
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
              metric_id: 'gdp_nowcast_current_quarter',
              claim_type: 'nowcast',
              claim_label_key: 'overview.claimLabels.nowcast',
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
              metric_id: 'gold_price_forecast',
              claim_type: 'reference_forecast',
              claim_label_key: 'overview.claimLabels.forecast',
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

    assert.match(markup, /data-metric-id="real_gdp_growth_quarter_yoy"[\s\S]*aria-label="Observed"[^>]*>Observed</)
    assert.match(markup, /data-metric-id="gdp_nowcast_current_quarter"[\s\S]*aria-label="Nowcast"[^>]*>Nowcast</)
    assert.match(markup, /data-metric-id="gold_price_forecast"[\s\S]*aria-label="Forecast"[^>]*>Forecast</)
    assert.doesNotMatch(markup, /overview-kpi-card__provenance/)
  })

  it('renders rate-metric deltas as percentage points, not percent changes', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'cpi_yoy',
              label: 'CPI inflation, YoY',
              value: 7.1,
              baseline_value: 7.3,
              delta_abs: -0.2,
              delta_value: -0.2,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              delta_pct: null,
              direction: 'down',
              comparison_basis_key: 'overview.comparisonBasis.cpi_yoy',
              comparison_period: 'Feb 2026',
            }),
            buildMetric({
              metric_id: 'real_gdp_growth_quarter_yoy',
              label: 'GDP growth',
              value: 8.7,
              baseline_value: 6.8,
              delta_abs: 1.9,
              delta_value: 1.9,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              delta_pct: null,
              comparison_basis_key: 'overview.comparisonBasis.real_gdp_growth_quarter_yoy',
              comparison_period: '2025 Q1',
            }),
            buildMetric({
              metric_id: 'policy_rate',
              label: 'Policy rate',
              value: 14,
              baseline_value: 13.5,
              delta_abs: 0.5,
              delta_value: 0.5,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              delta_pct: null,
              comparison_basis_key: 'overview.comparisonBasis.policy_rate',
            }),
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /−0\.2 pp vs Feb 2026 print/)
    assert.match(markup, /\+1\.9 pp vs 2025 Q1 print/)
    assert.match(markup, /\+0\.5 pp policy setting/)
    assert.doesNotMatch(markup, /−0\.2 %/)
    assert.doesNotMatch(markup, /\+1\.9 %/)
  })

  it('renders USD/UZS deltas with stronger, weaker, and unchanged interpretation', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'usd_uzs_level',
              label: 'USD/UZS',
              unit: 'UZS/USD',
              value: 12400,
              baseline_value: 12500,
              delta_abs: -100,
              delta_value: -0.8,
              delta_unit: '%',
              delta_basis: 'percent_change',
              direction: 'down',
            }),
            buildMetric({
              metric_id: 'usd_uzs_mom_change',
              label: 'USD/UZS MoM',
              value: 0.9,
              baseline_value: 0.7,
              delta_abs: 0.2,
              delta_value: 0.2,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              direction: 'up',
            }),
            buildMetric({
              metric_id: 'usd_uzs_yoy_change',
              label: 'USD/UZS YoY',
              value: 0,
              baseline_value: 0,
              delta_abs: 0,
              delta_value: 0,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              direction: 'flat',
            }),
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /UZS stronger 0\.8%/)
    assert.match(markup, /UZS weaker 0\.2 pp/)
    assert.match(markup, /unchanged/)
  })

  it('keeps claim, warning, semantic delta, and lower-rank period/context structure', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KpiStrip
          metrics={[
            buildMetric({
              metric_id: 'policy_rate',
              label: 'Policy rate',
              value: 14,
              baseline_value: 13.5,
              delta_abs: 0.5,
              delta_value: 0.5,
              delta_unit: 'pp',
              delta_basis: 'percentage_point',
              delta_pct: null,
              claim_type: 'observed_policy_setting',
              claim_label_key: 'overview.claimLabels.observed',
              validation_status: 'warning',
              comparison_basis_key: 'overview.comparisonBasis.policy_rate',
              context_note: 'Policy setting context remains visible to auditors.',
            }),
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /overview-kpi-card__claim-label[^>]*aria-label="Observed"[^>]*>Observed</)
    assert.match(markup, /overview-kpi-card__status[\s\S]*Caution/)
    assert.match(markup, /\+0\.5 pp policy setting/)
    assert.match(markup, /overview-kpi-card__period[^>]*>2026 Q1</)
    assert.match(
      markup,
      /overview-kpi-card__context-note" title="Policy setting context remains visible to auditors\."[^>]*>Policy setting context remains visible to auditors\.</,
    )
  })
})
