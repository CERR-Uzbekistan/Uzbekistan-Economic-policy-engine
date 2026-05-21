import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { ResultsPanel } from '../../../src/components/scenario-lab/ResultsPanel.js'
import { buildScenarioLabResults } from '../../../src/data/mock/scenario-lab.js'

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
              title: 'Results',
              description: 'Review headline effects and transmission paths.',
              tabsAria: 'Result views',
              tabs: {
                headlineImpact: 'Headline impact',
                macroPath: 'Macro path',
                externalBalance: 'External balance',
                fiscalEffects: 'Fiscal effects',
              },
              impulseResponseEyebrow: 'IMPULSE RESPONSE',
              impulseResponseCaption:
                'QPM reference calculation: deviations from baseline over 12 quarters, in percentage points. It should not be cited as a live forecast.',
              impulsePanels: {
                subtitle: 'Deviation from baseline; zero line marks no effect.',
                yLabel: 'Deviation from baseline',
                gdp_gap: {
                  title: 'GDP gap',
                  takeaway: 'GDP gap takeaway.',
                },
                inflation: {
                  title: 'Inflation',
                  takeaway: 'Inflation takeaway.',
                },
                policy_rate: {
                  title: 'Policy rate',
                  takeaway: 'Policy rate takeaway.',
                },
              },
              qpmReferenceBadge: 'QPM reference',
              headlineMetricsAria: 'Headline macro indicators',
              activeShocks: {
                ariaLabel: 'Active QPM shock assumptions',
                title: 'Active shocks',
                none: 'No active shocks.',
              },
              decision: {
                eyebrow: 'Decision view',
                title: 'QPM reference result',
                currentScenario: 'current scenario',
                lead: 'If “{{scenarioName}}” is applied, the reference calculation shows:',
                note:
                  'Custom sliders are approximation mode until the live QPM solver is connected to this tab.',
              },
              explanations: {
                headlineImpact:
                  'Shows how the selected scenario deviates from the baseline across 12 quarters; values are percentage-point deviations from the reference calculation.',
                macroPath:
                  'Shows the scenario path next to the baseline path so the table can be read as a comparison, not a raw dump.',
                externalBalance:
                  'Shows the external-balance scenario path under the current assumptions, with units kept in percent of GDP.',
                fiscalEffects:
                  'Shows fiscal accounting under the selected scenario assumptions; it is not a new fiscal model run.',
              },
              claimLabels: {
                headlineImpact: 'Scenario impulse response',
                macroPath: 'Scenario path vs baseline',
                externalBalance: 'External-balance scenario path',
                fiscalEffects: 'Fiscal scenario accounting',
              },
              pathDeltas: {
                period: 'Endpoint',
                baselineEnd: 'Baseline endpoint',
                scenarioEnd: 'Scenario endpoint',
                difference: 'Scenario minus baseline',
              },
              deltaVsBaseline: '{{delta}} vs baseline',
            },
            assumptions: {
              inputs: {
                policy_rate_change: {
                  label: 'Policy rate change',
                },
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('ResultsPanel clarification copy', () => {
  it('labels the headline QPM chart as a baseline deviation, not a live forecast', async () => {
    const i18n = await createTestI18n()
    const results = buildScenarioLabResults({})
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ResultsPanel
          activeAssumptions={[
            {
              category: 'macro',
              key: 'policy_rate_change',
              label: 'Policy rate change',
              technical_variable: 'qpm.policy_rate',
              unit: 'pp',
              value: 1,
            },
          ]}
          activeTab="headline_impact"
          onTabChange={() => {}}
          results={results}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /Scenario impulse response/)
    assert.match(markup, /QPM reference result/)
    assert.match(markup, /Active shocks/)
    assert.match(markup, /Policy rate change/)
    assert.match(markup, /QPM REFERENCE/)
    assert.match(markup, /Deviation from baseline; zero line marks no effect/)
    assert.match(markup, /QPM reference calculation: deviations from baseline over 12 quarters/)
    assert.match(markup, /deviates from the baseline across 12 quarters/)
    assert.match(markup, /0\.0 pp vs baseline/)
    assert.doesNotMatch(markup, /QPM · FPP/)
    assert.doesNotMatch(markup, /Mock Scenario Lab/)
  })

  it('adds claim labels and explanations to table-like macro result tabs', async () => {
    const i18n = await createTestI18n()
    const results = buildScenarioLabResults({})
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ResultsPanel activeTab="macro_path" onTabChange={() => {}} results={results} />
      </I18nextProvider>,
    )

    assert.match(markup, /Scenario path vs baseline/)
    assert.match(markup, /scenario path next to the baseline path/)
    assert.match(markup, /Baseline endpoint/)
    assert.match(markup, /Scenario minus baseline/)
    assert.match(markup, /Growth path reflects combined demand/)
  })
})
