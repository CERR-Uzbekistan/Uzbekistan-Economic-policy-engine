import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { ScenarioLabSavedRunsPanel } from '../../../src/components/scenario-lab/ScenarioLabSavedRunsPanel.js'
import { filterSavedScenarios } from '../../../src/components/scenario-lab/savedRunsFilters.js'
import type { SavedScenarioRecord } from '../../../src/state/scenarioStore.js'

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
            delete: 'Delete',
            load: 'Load',
          },
          scenarioLab: {
            ioShock: {
              kpis: {
                output: 'Output effect',
                gdpContribution: 'GDP accounting contribution',
                employment: 'Employment effect',
              },
            },
            savedRuns: {
              title: 'Saved Runs',
              description: '{{count}} saved run(s).',
              empty: 'Saved macro and I-O runs will appear here after you save them.',
              filtersAria: 'Saved run filters',
              openInComparison: 'Open in Comparison',
              ioBoundary: 'Sector transmission evidence only.',
              macroFallback: 'Saved QPM macro scenario.',
              filters: {
                all: 'All',
                macro_qpm: 'Macro/QPM',
                io: 'I-O',
              },
              filteredEmpty: {
                all: 'No saved runs match this filter.',
                macro_qpm: 'No saved Macro/QPM runs yet.',
                io: 'No saved I-O runs yet.',
              },
              type: {
                io: 'I-O sector shock',
                macro: 'Macro/QPM',
              },
              fields: {
                type: 'Type',
                data: 'Source vintage',
                source: 'Source vintage',
                sourceVintage: 'Source vintage',
                sourceArtifact: 'Source artifact',
                saved: 'Saved',
              },
            },
            saved: {
              localBrowserDisclosure: 'Saved runs are stored only in this browser.',
            },
          },
        },
      },
    },
  })
  return instance
}

const macroRecord: SavedScenarioRecord = {
  scenario_id: 'macro-1',
  scenario_name: 'Macro saved run',
  scenario_type: 'alternative',
  tags: ['fiscal'],
  description: 'Saved macro run.',
  created_at: '2026-04-22T00:00:00Z',
  updated_at: '2026-04-22T10:15:00Z',
  created_by: 'session-test',
  assumptions: [
    {
      key: 'policy_rate',
      label: 'Policy rate',
      value: 14,
      unit: '%',
      category: 'macro',
      technical_variable: null,
    },
  ],
  model_ids: ['qpm'],
  data_version: '2026Q1',
  stored_at: '2026-04-22T10:15:00Z',
  run_saved_at: '2026-04-22T10:15:00Z',
  run_attribution: [
    {
      model_id: 'qpm',
      model_name: 'QPM',
      module: 'qpm',
      version: '1.0.0',
      run_id: 'qpm-run-1',
      data_version: '2026Q1-live',
      timestamp: '2026-04-22T10:15:00Z',
    },
  ],
}

const ioRecord: SavedScenarioRecord = {
  ...macroRecord,
  scenario_id: 'io-1',
  scenario_name: 'I-O export shock',
  tags: ['io'],
  description: 'Saved I-O run.',
  model_ids: ['io-sector-shock'],
  data_version: '2022',
  io_sector_shock: {
    model_type: 'io_sector_shock',
    title: 'I-O export shock',
    data_vintage: '2022',
    source_artifact: 'io_model/io_data.json',
    saved_at: '2026-04-22T10:20:00Z',
    request: {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'output',
    },
    totals: {
      input_shock: 1000,
      input_currency: 'bln_uzs',
      demand_shock_bln_uzs: 1000,
      output_effect_bln_uzs: 1600,
      value_added_effect_bln_uzs: 650,
      gdp_accounting_contribution_bln_uzs: 650,
      employment_effect_persons: 2400,
      aggregate_output_multiplier: 1.6,
    },
    top_sectors: [],
    caveats: ['Sector transmission only.'],
  },
}

describe('ScenarioLabSavedRunsPanel', () => {
  it('filters saved runs by All, Macro/QPM, and I-O', () => {
    const records = [macroRecord, ioRecord]

    assert.deepEqual(filterSavedScenarios(records, 'all'), records)
    assert.deepEqual(filterSavedScenarios(records, 'macro_qpm'), [macroRecord])
    assert.deepEqual(filterSavedScenarios(records, 'io'), [ioRecord])
  })

  it('renders model type, timestamp, vintage, key outputs, and comparison actions', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ScenarioLabSavedRunsPanel
            savedScenarios={[macroRecord, ioRecord]}
            onLoadScenario={() => {}}
            onDeleteScenario={() => {}}
          />
        </MemoryRouter>
      </I18nextProvider>,
    )

    assert.match(markup, /Macro\/QPM/)
    assert.match(markup, /Saved runs are stored only in this browser/)
    assert.match(markup, /I-O sector shock/)
    assert.match(markup, /2026Q1/)
    assert.match(markup, /2026Q1-live/)
    assert.match(markup, /io_model\/io_data\.json/)
    assert.match(markup, /Source artifact/)
    assert.match(markup, /Output effect/)
    assert.match(markup, /Open in Comparison/)
    assert.match(markup, /Load/)
    assert.match(markup, /Delete/)
  })
})
