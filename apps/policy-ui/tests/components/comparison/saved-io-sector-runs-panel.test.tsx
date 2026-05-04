import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { SavedIoSectorRunsPanel } from '../../../src/components/comparison/SavedIoSectorRunsPanel.js'
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
          comparison: {
            savedIo: {
              title: 'Sector evidence from saved I-O runs',
              separationNote: 'Not part of the macro scenario delta table.',
              description:
                '{{count}} saved run(s) are shown as sector transmission analytics in a separate evidence section.',
              emptyWithAvailable:
                '{{count}} saved I-O run(s) are available. Add them to show sector transmission blocks below the macro table.',
              addAction: 'Add saved run',
              type: 'I-O run',
              topSectors: 'Top sectors',
              boundary:
                'Boundary: value-added is an I-O accounting contribution, not a causal macro scenario delta.',
              employmentUnit: 'employment count estimate',
              claimLabels: {
                output: 'Accounting multiplier / structural sector linkage',
                gdpAccounting: 'I-O value-added accounting contribution, not macro forecast',
                employment: 'Linear employment-intensity estimate, not labor-market forecast',
              },
              metrics: {
                output: 'Output',
                valueAdded: 'Value added',
                gdpAccounting: 'GDP accounting',
                employment: 'Employment',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

const record: SavedScenarioRecord = {
  scenario_id: 'saved-io-1',
  scenario_name: 'I-O export shock',
  scenario_type: 'alternative',
  tags: ['io'],
  description: 'Saved I-O run.',
  created_at: '2026-04-22T00:00:00Z',
  updated_at: '2026-04-22T00:00:00Z',
  created_by: 'session-test',
  assumptions: [
    {
      key: 'io_demand_bucket',
      label: 'Demand shock type',
      value: 'export',
      unit: 'category',
      category: 'trade',
      technical_variable: null,
    },
  ],
  model_ids: ['io-sector-shock'],
  data_version: '2022',
  stored_at: '2026-04-22T10:15:00Z',
  io_sector_shock: {
    model_type: 'io_sector_shock',
    title: 'I-O export shock',
    data_vintage: '2022',
    source_artifact: 'io_model/io_data.json',
    saved_at: '2026-04-22T10:15:00Z',
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
    top_sectors: [
      {
        sector_code: 'A01',
        sector_name: 'Agriculture',
        output_effect_bln_uzs: 200,
        value_added_effect_bln_uzs: 80,
        output_multiplier: 1.4,
        value_added_multiplier: 0.6,
        backward_linkage: 1.1,
        forward_linkage: 0.9,
        linkage_classification: 'backward',
        employment_effect_persons: 900,
      },
    ],
    caveats: ['Sector transmission only.'],
  },
}

describe('SavedIoSectorRunsPanel', () => {
  it('renders saved I-O analytics with honest non-overclaiming copy', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SavedIoSectorRunsPanel records={[record]} />
      </I18nextProvider>,
    )

    assert.match(markup, /Sector evidence from saved I-O runs/)
    assert.match(markup, /Not part of the macro scenario delta table/)
    assert.match(markup, /sector transmission analytics/)
    assert.match(markup, /separate evidence section/)
    assert.match(markup, /not a causal macro scenario delta/)
    assert.match(markup, /Accounting multiplier \/ structural sector linkage/)
    assert.match(markup, /I-O value-added accounting contribution, not macro forecast/)
    assert.match(markup, /Linear employment-intensity estimate, not labor-market forecast/)
    assert.match(markup, /employment count estimate/)
    assert.match(markup, /I-O export shock/)
    assert.match(markup, /Agriculture/)
  })

  it('renders nothing when no I-O saved runs are selected', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SavedIoSectorRunsPanel records={[]} />
      </I18nextProvider>,
    )

    assert.equal(markup, '')
  })

  it('renders an add prompt when saved I-O runs exist but none are selected', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SavedIoSectorRunsPanel records={[]} availableCount={2} onAddSavedRun={() => {}} />
      </I18nextProvider>,
    )

    assert.match(markup, /2 saved I-O run/)
    assert.match(markup, /Not part of the macro scenario delta table/)
    assert.match(markup, /Add saved run/)
  })
})
