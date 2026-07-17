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
              staticFallbackNotice: 'Reference summary · current snapshot unavailable',
              dataNoteReviewed: 'Data note: reviewed {{date}}',
              dataNoteUpdated: 'Data note: updated {{date}}',
              sourceNotesBelow: '{{count}} metric sources listed below',
              modelSource: 'model source: {{models}}',
              artifactBrief: {
                summary: 'Latest source-backed indicators are shown below; unavailable model outputs are excluded.',
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
              provenance={{
                drafted_from: 'legacy mock',
                ai_assisted: false,
                reviewed_at: '16 Apr',
              }}
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

    assert.match(markup, /Latest source-backed indicators/)
    assert.match(markup, /Data note: updated/)
    assert.doesNotMatch(markup, /Data note: reviewed 16 Apr/)
    assert.match(markup, /2 metric sources listed below/)
    assert.doesNotMatch(markup, /What changed:/)
    assert.doesNotMatch(markup, /Test next:/)
    assert.doesNotMatch(markup, /Trade balance/)
    assert.doesNotMatch(markup, /USD\/UZS/)
    assert.doesNotMatch(markup, /Snapshot · Apr 2026 · 5 review notes/)
    assert.doesNotMatch(markup, /AI-assisted/)
    assert.doesNotMatch(markup, /DFM \+ QPM/)
    assert.doesNotMatch(markup, /reviewed by/i)
    assert.doesNotMatch(markup, /Legacy static prose/)
  })

  it('keeps artifact header concise without duplicating macro pulse values', async () => {
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
              artifactSummaryMetrics={[]}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </I18nextProvider>,
    )

    assert.match(markup, /Latest source-backed indicators/)
    assert.doesNotMatch(markup, /GDP[\s\S]*8\.7 %/)
    assert.doesNotMatch(markup, /CPI[\s\S]*7\.1 % YoY \/ 0\.6 % MoM/)
    assert.doesNotMatch(markup, /Trade balance[\s\S]*USD 4\.51bn deficit/)
    assert.doesNotMatch(markup, /USD\/UZS[\s\S]*12,073 UZS\/USD/)
    assert.doesNotMatch(markup, /\b(?:firm|easing|stable|strong|weak)\b/i)
  })
})
