import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { EconomicStateHeader } from '../../../src/components/overview/EconomicStateHeader.js'
import { LanguageContext } from '../../../src/state/language-context.js'

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
            common: {
              middleDot: '·',
            },
            header: {
              kicker: 'Economic State',
              modelListFallback: 'MODEL SET',
              draftedFrom: 'State narrative · drafted from {{models}} baseline',
              updatedAt: 'Updated {{date}}',
              artifactStrap: 'Snapshot · {{date}} · {{count}} review note',
              artifactStrapPlural: 'Snapshot · {{date}} · {{count}} review notes',
              artifactSummaryMeta: 'Snapshot summary · {{count}} metrics',
              staticFallbackNotice: 'Reference summary · current snapshot unavailable',
              dataNoteReviewed: 'Data note: reviewed {{date}}',
              dataNoteUpdated: 'Data note: updated {{date}}',
              sourceNotesBelow: '{{count}} metric sources listed below',
              modelSource: 'model source: {{models}}',
              artifactBrief: {
                summary: 'Growth is above the current nowcast path; inflation and external indicators remain on watch.',
              },
              takeaways: {
                aria: 'Overview briefing takeaways',
                changedLabel: 'What changed: ',
                changed: 'Q1 GDP is above the Q2 nowcast path; CPI remains high despite gradual decline.',
                mattersLabel: 'Why it matters: ',
                matters: 'FX pass-through, food prices, and remittances can still shift the baseline.',
                testLabel: 'Test next: ',
                test: 'Start with exchange-rate, inflation persistence, and remittance downside scenarios.',
              },
              summary: {
                template: '{{items}}.',
                item: '{{label}} {{value}} {{unit}}{{qualifier}}',
                provisional: 'provisional',
                unavailable: 'Unavailable',
                labels: {
                  gdp: 'GDP',
                  cpi: 'CPI',
                  exports: 'exports',
                  imports: 'imports',
                  policyRate: 'policy rate',
                  gold: 'gold',
                },
              },
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

describe('EconomicStateHeader', () => {
  it('renders a compact fallback notice for static summary mode', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
          <MemoryRouter>
            <EconomicStateHeader
              summary="Growth remains resilient while inflation moderates."
              updatedAt="2026-04-17T09:05:00+05:00"
              modelIds={['dfm_nowcast', 'qpm_uzbekistan']}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </I18nextProvider>,
    )

    assert.match(markup, /class="state-header__meta/)
    assert.match(markup, /Reference summary · current snapshot unavailable/)
    assert.match(markup, /Updated/)
    assert.doesNotMatch(markup, /Prepare snapshot brief/)
  })

  it('renders neutral artifact strap from metadata/counts without stale attribution labels', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
          <MemoryRouter>
            <EconomicStateHeader
              summary="Legacy static prose should not be used."
              updatedAt="2026-04-17T09:05:00+05:00"
              modelIds={['dfm_nowcast', 'qpm_uzbekistan']}
              isArtifactMode
              artifactProvisionalCount={5}
              macroPulseTokens={[
                { id: 'gdp', label: 'GDP', value: '5.7 %' },
                { id: 'cpi', label: 'CPI', value: '8.1 % YoY / 0.7 % MoM' },
                { id: 'trade_balance', label: 'Trade balance', value: 'USD 1.20bn deficit' },
                { id: 'usd_uzs', label: 'USD/UZS', value: '12,680 UZS/USD · UZS weaker 1.4%' },
              ]}
              artifactSummaryMetrics={[
                {
                  metric_id: 'real_gdp_growth_quarter_yoy',
                  label: 'GDP',
                  value: 5.7,
                  unit: '%',
                  period: '2026 Q1',
                  baseline_value: 5.5,
                  delta_abs: 0.2,
                  delta_pct: 3.6,
                  direction: 'up',
                  confidence: 'high',
                  last_updated: '2026-04-26T08:00:00Z',
                  model_attribution: [],
                  validation_status: 'valid',
                },
                {
                  metric_id: 'cpi_yoy',
                  label: 'CPI',
                  value: 8.1,
                  unit: '%',
                  period: 'March 2026',
                  baseline_value: 8.3,
                  delta_abs: -0.2,
                  delta_pct: -2.4,
                  direction: 'down',
                  confidence: 'medium',
                  last_updated: '2026-04-26T08:00:00Z',
                  model_attribution: [],
                  validation_status: 'warning',
                },
              ]}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </I18nextProvider>,
    )

    assert.match(markup, /Growth is above the current nowcast path/)
    assert.match(markup, /GDP[\s\S]*5\.7 %/)
    assert.match(markup, /CPI[\s\S]*8\.1 % YoY \/ 0\.7 % MoM/)
    assert.match(markup, /Trade balance[\s\S]*USD 1\.20bn deficit/)
    assert.match(markup, /USD\/UZS[\s\S]*12,680 UZS\/USD · UZS weaker 1\.4%/)
    assert.match(markup, /Data note: updated/)
    assert.match(markup, /2 metric sources listed below/)
    assert.match(markup, /What changed:/)
    assert.match(markup, /Test next:/)
    assert.doesNotMatch(markup, /Snapshot · Apr 2026 · 5 review notes/)
    assert.doesNotMatch(markup, /AI-assisted/)
    assert.doesNotMatch(markup, /DFM \+ QPM/)
    assert.doesNotMatch(markup, /reviewed by/i)
    assert.doesNotMatch(markup, /Legacy static prose/)
  })

  it('renders numeric macro pulse tokens without qualitative state adjectives', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
          <MemoryRouter>
            <EconomicStateHeader
              summary="Legacy static prose should not be used."
              updatedAt="2026-04-17T09:05:00+05:00"
              modelIds={['overview_artifact']}
              isArtifactMode
              macroPulseTokens={[
                { id: 'gdp', label: 'GDP', value: '8.7 %' },
                { id: 'cpi', label: 'CPI', value: '7.1 % YoY / 0.6 % MoM' },
                { id: 'trade_balance', label: 'Trade balance', value: 'USD 4.51bn deficit' },
                { id: 'usd_uzs', label: 'USD/UZS', value: '12,073 UZS/USD' },
              ]}
              artifactSummaryMetrics={[]}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </I18nextProvider>,
    )

    assert.match(markup, /Growth is above the current nowcast path/)
    assert.match(markup, /GDP[\s\S]*8\.7 %/)
    assert.match(markup, /CPI[\s\S]*7\.1 % YoY \/ 0\.6 % MoM/)
    assert.match(markup, /Trade balance[\s\S]*USD 4\.51bn deficit/)
    assert.match(markup, /USD\/UZS[\s\S]*12,073 UZS\/USD/)
    assert.doesNotMatch(markup, /\b(?:firm|easing|stable|strong|weak)\b/i)
  })
})
