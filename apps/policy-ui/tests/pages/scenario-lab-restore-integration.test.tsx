import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssumptionsPanel } from '../../src/components/scenario-lab/AssumptionsPanel.js'
import { InterpretationPanel } from '../../src/components/scenario-lab/InterpretationPanel.js'
import { ResultsPanel } from '../../src/components/scenario-lab/ResultsPanel.js'
import type {
  Assumption,
  ChartSpec,
  ScenarioLabAssumptionState,
  ScenarioLabResultsBundle,
} from '../../src/contracts/data-contract.js'
import {
  buildScenarioLabResults,
  scenarioLabWorkspaceMock,
} from '../../src/data/mock/scenario-lab.js'
import { getPresetValuesFromWorkspace } from '../../src/pages/scenario-lab-preset.js'
import {
  clearAllScenarios,
  loadScenario,
  saveScenario,
  type PersistedRunResults,
} from '../../src/state/scenarioStore.js'
import { installMemoryStorage } from '../helpers/memory-storage.js'

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
          buttons: {
            close: 'Close',
            run: 'Run',
            runScenario: 'Run scenario',
            saveDraft: 'Save draft',
          },
          scenarioLab: {
            assumptions: {
              title: 'Assumptions',
              description: 'Adjust scenario inputs.',
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
            },
            form: {
              preset: 'Preset',
              scenarioName: 'Scenario name',
              scenarioNamePlaceholder: 'Scenario name',
              detailsSummary: 'Details',
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
              loadLink: 'Load saved scenario',
            },
            results: {
              title: 'Results',
              description: 'Scenario output snapshot.',
              tabsAria: 'Scenario result views',
              tabs: {
                headlineImpact: 'Headline impact',
                macroPath: 'Macro path',
                externalBalance: 'External balance',
                fiscalEffects: 'Fiscal effects',
              },
              deltaVsBaseline: '{{delta}} vs baseline',
            },
            interpretation: {
              title: 'Interpretation',
              description: 'Translate model outputs into decision language.',
              sections: {
                whatChanged: 'What changed',
                whyItChanged: 'Why it changed',
                keyRisks: 'Key risks',
                policyImplications: 'Policy implications',
                suggestedNextScenarios: 'Suggested next scenarios',
              },
              aiAttribution: {
                title: 'AI-assisted · Unreviewed draft',
                body:
                  'This interpretation was drafted from structured simulation outputs using the {{engine}}. Human review is required before citing externally.',
                engineTemplate: 'template narrative engine',
                engineAssisted: 'assisted narrative engine',
                engineReviewed: 'reviewed narrative engine',
                reviewedMeta: 'Reviewed by {{reviewer_name}} on {{review_date}}.',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

function toSavedAssumptions(values: ScenarioLabAssumptionState): Assumption[] {
  return scenarioLabWorkspaceMock.assumptions.map((assumption) => ({
    key: assumption.key,
    label: assumption.label,
    value: values[assumption.key] ?? assumption.default_value,
    unit: assumption.unit,
    category: assumption.category,
    technical_variable: assumption.technical_variable,
  }))
}

function toAssumptionValues(assumptions: Assumption[]): ScenarioLabAssumptionState {
  const values: ScenarioLabAssumptionState = {}
  for (const assumption of scenarioLabWorkspaceMock.assumptions) {
    values[assumption.key] = assumption.default_value
  }
  for (const assumption of assumptions) {
    if (typeof assumption.value === 'number') {
      values[assumption.key] = assumption.value
    }
  }
  return values
}

function buildPersistedRunResults(values: ScenarioLabAssumptionState): PersistedRunResults {
  const generatedResults = buildScenarioLabResults(values, {
    selectedPresetId: 'remittance-downside',
  })
  const persistedMacroPath: ChartSpec = {
    ...generatedResults.charts_by_tab.macro_path,
    title: 'Persisted saved macro path',
    takeaway: 'Persisted saved-run chart takeaway.',
  }
  return {
    headline_metrics: generatedResults.headline_metrics.map((metric, index) =>
      index === 0
        ? {
            ...metric,
            label: 'Persisted sentinel GDP',
            value: 99.9,
            delta_abs: 88.8,
          }
        : metric,
    ),
    charts_by_tab: {
      ...generatedResults.charts_by_tab,
      macro_path: persistedMacroPath,
    },
  }
}

describe('Scenario Lab saved-run restore integration', () => {
  let localStorageHandle: ReturnType<typeof installMemoryStorage> | null = null

  beforeEach(() => {
    localStorageHandle = installMemoryStorage()
    localStorageHandle.storage.clear()
    clearAllScenarios()
  })

  afterEach(() => {
    clearAllScenarios()
    localStorageHandle?.restore()
    localStorageHandle = null
  })

  it('restores current saved-run shape through Scenario Lab assumptions, results, and interpretation panels', async () => {
    const i18n = await createTestI18n()
    const selectedPresetId = 'remittance-downside'
    const presetValues = getPresetValuesFromWorkspace(scenarioLabWorkspaceMock, selectedPresetId)
    const runResults = buildPersistedRunResults(presetValues)
    const saved = saveScenario({
      scenario_id: 'saved-run-restore-1',
      scenario_name: 'Restored remittance downside',
      scenario_type: 'stress',
      tags: ['external', 'trade'],
      description: 'Saved run with persisted results and reviewed governance metadata.',
      assumptions: toSavedAssumptions(presetValues),
      model_ids: ['scenario-lab-mock-engine'],
      data_version: 'mock-v1',
      created_at: '',
      updated_at: '',
      created_by: '',
      run_id: 'run-restored-current-shape',
      run_saved_at: '2026-04-01T12:00:00Z',
      run_results: runResults,
      run_interpretation: {
        what_changed: ['Persisted interpretation what-changed text.'],
        why_it_changed: ['Persisted interpretation driver text.'],
        key_risks: ['Persisted interpretation risk text.'],
        policy_implications: ['Persisted interpretation implication text.'],
        suggested_next_scenarios: ['Persisted next scenario text.'],
        generation_mode: 'reviewed',
        reviewer_name: 'M. Usmanov',
        reviewed_at: '2026-04-01T12:00:00Z',
        metadata: {
          generation_mode: 'reviewed',
          reviewer_name: 'M. Usmanov',
          reviewed_at: '2026-04-01T12:00:00Z',
        },
      },
      run_attribution: [
        {
          model_id: 'scenario-lab-mock-engine',
          model_name: 'Scenario Lab Mock Engine',
          module: 'scenario-lab',
          version: '0.1.0',
          run_id: 'run-restored-current-shape',
          data_version: 'mock-v1',
          timestamp: '2026-04-01T12:00:00Z',
        },
      ],
    })

    const rawSavedRecord = localStorage.getItem(`policy-ui:scenario.v2:${saved.scenario_id}`)
    assert.ok(rawSavedRecord)
    assert.match(rawSavedRecord, /"run_results"/)
    assert.match(rawSavedRecord, /"metadata"/)

    const loaded = loadScenario(saved.scenario_id)
    assert.ok(loaded)
    assert.equal(loaded.run_id, 'run-restored-current-shape')
    assert.equal(loaded.run_saved_at, '2026-04-01T12:00:00Z')
    assert.ok(loaded.run_results)
    assert.ok(loaded.run_interpretation)
    assert.equal(loaded.run_interpretation.metadata?.generation_mode, 'reviewed')
    assert.equal(loaded.run_interpretation.reviewer_name, 'M. Usmanov')

    const restoredAssumptions = toAssumptionValues(loaded.assumptions)
    assert.equal(restoredAssumptions.export_demand_change, -8)
    assert.equal(restoredAssumptions.policy_rate_change, 0)

    const restoredBundle: ScenarioLabResultsBundle = {
      headline_metrics: loaded.run_results.headline_metrics,
      charts_by_tab: loaded.run_results.charts_by_tab,
      interpretation: loaded.run_interpretation,
    }

    const assumptionsMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AssumptionsPanel
          assumptions={scenarioLabWorkspaceMock.assumptions}
          values={restoredAssumptions}
          presets={scenarioLabWorkspaceMock.presets}
          selectedPresetId={selectedPresetId}
          scenarioName={loaded.scenario_name}
          scenarioType={loaded.scenario_type}
          scenarioDescription={loaded.description}
          scenarioTags={loaded.tags}
          availableScenarioTags={['monetary', 'fiscal', 'external', 'trade', 'inflation']}
          onPresetChange={() => {}}
          onScenarioNameChange={() => {}}
          onScenarioTypeChange={() => {}}
          onScenarioDescriptionChange={() => {}}
          onScenarioTagToggle={() => {}}
          onAssumptionChange={() => {}}
          onRunScenario={() => {}}
          isRunPending={false}
          onSaveScenario={() => {}}
          canSaveScenario={true}
          saveDisabledReason={null}
          savedScenarios={[loaded]}
          onLoadScenario={() => {}}
          onDeleteScenario={() => {}}
          saveStatus={null}
        />
      </I18nextProvider>,
    )
    assert.match(
      assumptionsMarkup,
      /class="preset-chip active" aria-pressed="true">Remittance downside \(proxy\)<\/button>/,
    )
    assert.match(assumptionsMarkup, /value="Restored remittance downside"/)
    assert.match(assumptionsMarkup, /value="-8"/)
    assert.match(assumptionsMarkup, /aria-pressed="true">External<\/button>/)
    assert.match(assumptionsMarkup, /aria-pressed="true">Trade<\/button>/)

    const resultsMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ResultsPanel
          activeTab="macro_path"
          onTabChange={() => {}}
          results={restoredBundle}
        />
      </I18nextProvider>,
    )
    assert.match(resultsMarkup, /Persisted sentinel GDP/)
    assert.match(resultsMarkup, /99\.9/)
    assert.match(resultsMarkup, /Persisted saved macro path/)
    assert.match(resultsMarkup, /Persisted saved-run chart takeaway\./)

    const interpretationMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <InterpretationPanel interpretation={restoredBundle.interpretation} />
        </I18nextProvider>
      </MemoryRouter>,
    )
    assert.match(interpretationMarkup, /Persisted interpretation what-changed text\./)
    assert.match(interpretationMarkup, /reviewed narrative engine/)
    assert.match(interpretationMarkup, /Reviewed by M\. Usmanov/)
  })
})
