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
                eyebrow: 'Scenario effect',
                title: 'Effect by {{period}}',
                currentScenario: 'current scenario',
                periodUnavailable: 'the final quarter',
                lead:
                  'If “{{scenarioName}}” is applied, the QPM result is shown first as the change versus baseline.',
                note:
                  'The baseline path is anchored to the latest Overview snapshot. Scenario values add QPM shock effects around that baseline.',
              },
              explanations: {
                headlineImpact:
                  'Shows how the selected scenario deviates from the baseline across 12 quarters; values are percentage-point deviations from the reference calculation.',
                macroPath:
                  'Shows the scenario effect as scenario minus baseline. Endpoint cards keep the level comparison.',
                externalBalance:
                  'Shows the external-balance scenario path under the current assumptions, with units kept in percent of GDP.',
                fiscalEffects:
                  'Shows fiscal accounting under the selected scenario assumptions; it is not a new fiscal model run.',
              },
              claimLabels: {
                headlineImpact: 'Scenario impulse response',
                macroPath: 'Scenario effect vs baseline',
                externalBalance: 'External-balance scenario path',
                fiscalEffects: 'Fiscal scenario accounting',
              },
              effectChart: {
                title: '{{metric}} effect vs baseline',
                subtitle: 'Scenario minus baseline; zero line means no scenario effect.',
                yLabel: 'Scenario minus baseline',
                series: 'Scenario effect',
                takeaway: 'Read this as the scenario effect over time, not as a standalone forecast level.',
                metrics: {
                  macro_path: 'GDP growth',
                  external_balance: 'Current account',
                  fiscal_effects: 'Fiscal balance',
                },
              },
              baselineSource: {
                ariaLabel: 'QPM starting point',
                eyebrow: 'Starting point',
                title: 'Latest Overview snapshot',
                summary: 'Baseline path uses the latest Overview snapshot.',
                details: 'Source and context details',
                artifact: 'Source file',
                exportedAt: 'Exported',
                contextOnly: 'context only',
              },
              pathDeltas: {
                period: 'Endpoint',
                baselineEnd: 'Baseline endpoint',
                scenarioEnd: 'Scenario endpoint',
                difference: 'Scenario minus baseline',
                noMaterialDifference: 'No material difference from baseline.',
              },
              deltaVsBaseline: '{{delta}} vs baseline',
              effectVsBaseline: 'Effect vs baseline',
              scenarioAndBaseline: 'Scenario {{scenario}} · baseline {{baseline}}',
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
    assert.match(markup, /Effect by 2027 Q2/)
    assert.match(markup, /Starting point/)
    assert.match(markup, /Latest Overview snapshot/)
    assert.ok(results.baseline_source?.data_version)
    assert.ok(markup.includes(results.baseline_source.data_version))
    assert.match(markup, /Policy rate change/)
    assert.match(markup, /\+1\.0 pp/)
    assert.match(markup, /Effect vs baseline/)
    assert.match(markup, /baseline path is anchored to the latest Overview snapshot/i)
    assert.match(markup, /Scenario .*baseline/)
    assert.doesNotMatch(markup, /Why the result can differ from today&#x27;s indicators/)
    assert.doesNotMatch(markup, /Current values are not the result/)
    assert.doesNotMatch(markup, /Where the result comes from/)
    assert.match(markup, /Active shocks/)
    assert.match(markup, /Policy rate change/)
    assert.match(markup, /Deviation from baseline; zero line marks no effect/)
    assert.match(markup, /QPM reference calculation: deviations from baseline over 12 quarters/)
    assert.match(markup, /deviates from the baseline across 12 quarters/)
    assert.match(markup, /0\.0 pp/)
    assert.doesNotMatch(markup, />QPM REFERENCE</)
    assert.doesNotMatch(markup, /QPM · FPP/)
    assert.doesNotMatch(markup, /Mock Scenario Lab/)
  })

  it('adds claim labels and explanations to table-like macro result tabs', async () => {
    const i18n = await createTestI18n()
    const results = buildScenarioLabResults({ gov_spending_change: 1 })
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ResultsPanel activeTab="macro_path" onTabChange={() => {}} results={results} />
      </I18nextProvider>,
    )

    assert.match(markup, /Scenario effect vs baseline/)
    assert.match(markup, /scenario effect as scenario minus baseline/)
    assert.match(markup, /Baseline endpoint/)
    assert.match(markup, /Scenario minus baseline/)
    assert.match(markup, /GDP growth effect vs baseline/)
    assert.match(markup, /zero line means no scenario effect/)
    assert.match(markup, /role="img"/)
    assert.doesNotMatch(markup, /chart-renderer__takeaway/)
  })

  it('hides no-op path charts when the selected tab is unchanged from baseline', async () => {
    const i18n = await createTestI18n()
    const results = buildScenarioLabResults({})
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ResultsPanel activeTab="external_balance" onTabChange={() => {}} results={results} />
      </I18nextProvider>,
    )

    assert.match(markup, /No material difference from baseline/)
    assert.doesNotMatch(markup, /Current account path/)
  })
})
