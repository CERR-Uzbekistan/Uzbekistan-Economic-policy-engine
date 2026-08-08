import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComparisonSelector } from '../../../src/components/comparison/ComparisonSelector.js'
import type { ComparisonScenarioMeta } from '../../../src/contracts/data-contract.js'

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
            chip: { remove: 'Remove {{name}}' },
            selector: {
              inView: 'In view',
              addSaved: 'Add saved scenario',
              baselineLabel: 'Baseline',
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
  { id: 'alt', name: 'Fiscal consolidation', role: 'alternative', role_label: 'Alternative' },
  { id: 'stress', name: 'Russia slowdown', role: 'downside', role_label: 'Stress' },
]

describe('ComparisonSelector baseline switcher', () => {
  it('renders a baseline <select> with one option per selected scenario', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ComparisonSelector
          scenarios={scenarios}
          baselineId="baseline"
          onAddSavedScenario={() => {}}
          onBaselineChange={() => {}}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /<select[^>]*class="cmp-selector__baseline-select"/)
    // Selected option must match the current baselineId.
    assert.match(markup, /<option value="baseline" selected="">Baseline<\/option>/)
    assert.match(markup, /<option value="alt">Fiscal consolidation<\/option>/)
    assert.match(markup, /<option value="stress">Russia slowdown<\/option>/)
  })

  it('disables removal on the current baseline chip', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ComparisonSelector
          scenarios={scenarios}
          baselineId="baseline"
          onRemove={() => {}}
          onAddSavedScenario={() => {}}
          onBaselineChange={() => {}}
        />
      </I18nextProvider>,
    )
    // Count the remove (×) buttons; one per non-baseline chip when
    // selection size > 2. Baseline chip must not render a close affordance.
    const closeButtonMatches = markup.match(/class="close"/g) ?? []
    assert.equal(
      closeButtonMatches.length,
      scenarios.filter((scenario) => scenario.role !== 'baseline').length,
      'baseline chip must not render the × close button',
    )
    // Aria-label on each close button should name the corresponding scenario.
    assert.match(markup, /aria-label="Remove Fiscal consolidation"/)
    assert.match(markup, /aria-label="Remove Russia slowdown"/)
    assert.doesNotMatch(markup, /aria-label="Remove Baseline"/)
  })
})
