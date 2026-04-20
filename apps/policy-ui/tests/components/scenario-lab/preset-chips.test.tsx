import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssumptionsPanel } from '../../../src/components/scenario-lab/AssumptionsPanel.js'
import { buildPresetChipPresentation } from '../../../src/components/scenario-lab/preset-chip.js'
import type { ScenarioLabPreset } from '../../../src/contracts/data-contract.js'

const presets: ScenarioLabPreset[] = [
  {
    preset_id: 'balanced-baseline',
    title: 'Balanced baseline',
    summary: 'Baseline',
    assumption_overrides: {},
  },
  {
    preset_id: 'external-slowdown',
    title: 'External slowdown',
    summary: 'Slowdown',
    assumption_overrides: { export_demand_change: -8 },
  },
]

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
            assumptions: {
              title: 'Assumptions',
              description: 'desc',
              showTechnical: 'Show technical variable names',
              technicalPrefix: 'Technical: {{variable}}',
              categories: {
                macro: 'Macro assumptions',
                external: 'External assumptions',
                fiscal: 'Fiscal assumptions',
                trade: 'Trade assumptions',
                advanced: 'Advanced assumptions',
              },
              emptyCategory: 'No assumptions available in this category.',
              emptyAdvanced: 'No advanced assumptions are currently configured.',
            },
            form: {
              preset: 'Preset',
              scenarioName: 'Scenario name',
              scenarioNamePlaceholder: 'Scenario name',
              scenarioType: 'Scenario type',
              scenarioTypeOptions: {
                baseline: 'Baseline',
                alternative: 'Alternative',
                stress: 'Stress',
              },
              description: 'Description',
              descriptionPlaceholder: 'Optional scenario description',
              tags: 'Tags',
              tagOptions: {
                monetary: 'Monetary',
                fiscal: 'Fiscal',
                external: 'External',
                trade: 'Trade',
                inflation: 'Inflation',
              },
            },
            saved: {
              title: 'Saved scenarios',
              empty: 'No saved scenarios yet.',
              load: 'Load',
              delete: 'Delete',
            },
          },
          buttons: {
            saveDraft: 'Save draft',
            run: 'Run',
            runScenario: 'Run scenario',
          },
        },
      },
    },
  })
  return instance
}

function renderPanelMarkup(selectedPresetId: string) {
  return createTestI18n().then((i18n) =>
    renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AssumptionsPanel
          assumptions={[
            {
              key: 'policy_rate_change',
              label: 'Policy rate change',
              description: 'desc',
              category: 'macro',
              unit: 'pp',
              technical_variable: 'qpm.policy_rate_shock',
              min: -3,
              max: 4,
              step: 0.25,
              default_value: 0,
            },
          ]}
          values={{ policy_rate_change: 0 }}
          presets={presets}
          selectedPresetId={selectedPresetId}
          scenarioName="Scenario name"
          scenarioType="alternative"
          scenarioDescription=""
          scenarioTags={[]}
          availableScenarioTags={['monetary']}
          onPresetChange={() => {}}
          onScenarioNameChange={() => {}}
          onScenarioTypeChange={() => {}}
          onScenarioDescriptionChange={() => {}}
          onScenarioTagToggle={() => {}}
          onAssumptionChange={() => {}}
          onRunScenario={() => {}}
          isRunPending={false}
          onSaveScenario={() => {}}
          savedScenarios={[]}
          onLoadScenario={() => {}}
          onDeleteScenario={() => {}}
          saveStatus={null}
        />
      </I18nextProvider>,
    ),
  )
}

describe('preset chips', () => {
  it('renders active aria-pressed state for the selected preset chip', async () => {
    const baselineMarkup = await renderPanelMarkup('balanced-baseline')
    assert.match(
      baselineMarkup,
      /<button type="button" class="preset-chip active" aria-pressed="true">Balanced baseline<\/button>/,
    )

    const slowdownMarkup = await renderPanelMarkup('external-slowdown')
    assert.match(
      slowdownMarkup,
      /<button type="button" class="preset-chip active" aria-pressed="true">External slowdown<\/button>/,
    )
  })

  it('invokes preset handler on click and keyboard activation', () => {
    const calls: string[] = []
    const presentation = buildPresetChipPresentation('balanced-baseline', 'external-slowdown', (presetId) =>
      calls.push(presetId),
    )

    presentation.onClick()
    presentation.onKeyDown({
      key: 'Enter',
      preventDefault: () => {},
    } as unknown as Parameters<typeof presentation.onKeyDown>[0])

    assert.deepEqual(calls, ['external-slowdown', 'external-slowdown'])
    assert.equal(presentation.ariaPressed, false)
  })
})
