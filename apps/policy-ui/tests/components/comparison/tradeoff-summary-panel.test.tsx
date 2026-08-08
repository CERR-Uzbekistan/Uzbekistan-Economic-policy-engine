import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { TradeoffSummaryPanel } from '../../../src/components/comparison/TradeoffSummaryPanel.js'
import type {
  ComparisonScenarioMeta,
  TradeoffSummary,
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
            tradeoff: {
              title: 'Trade-off summary',
              smePendingChip: 'Review needed',
              smePendingAria: 'Trade-off summary needs review',
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
  {
    id: 'fiscal-consolidation',
    name: 'Fiscal consolidation',
    role: 'alternative',
    role_label: 'Alternative',
  },
]

describe('TradeoffSummaryPanel', () => {
  it('wraps scenario names in <em> when rendering shell prose', async () => {
    const i18n = await createTestI18n()
    const tradeoff: TradeoffSummary = {
      mode: 'shell',
      shell_id: 'fiscal-vs-growth-tradeoff',
      rendered_text:
        'Fiscal consolidation dominates on external stability at the cost of growth.',
    }

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <TradeoffSummaryPanel tradeoff={tradeoff} scenarios={scenarios} />
      </I18nextProvider>,
    )

    assert.match(markup, /<em>Fiscal consolidation<\/em>/)
    assert.doesNotMatch(markup, /Review needed/)
  })

  it('renders the review-needed warn chip when mode is empty', async () => {
    const i18n = await createTestI18n()
    const tradeoff: TradeoffSummary = { mode: 'empty' }

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <TradeoffSummaryPanel tradeoff={tradeoff} scenarios={scenarios} />
      </I18nextProvider>,
    )

    assert.match(markup, /ui-chip--warn/)
    assert.match(markup, /Review needed/)
  })
})
