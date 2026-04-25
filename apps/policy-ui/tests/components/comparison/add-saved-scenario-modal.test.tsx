import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { AddSavedScenarioModal } from '../../../src/components/comparison/AddSavedScenarioModal.js'
import { scenarioLabWorkspaceMock } from '../../../src/data/mock/scenario-lab.js'
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
            cancel: 'Cancel',
            close: 'Close',
          },
          comparison: {
            selector: {
              savedEmpty: 'No saved runs yet. Run and save a scenario in Scenario Lab to compare it here.',
              scenarioType: {
                baseline: 'Baseline',
                alternative: 'Alternative',
                stress: 'Stress',
              },
            },
            savedModal: {
              title: 'Add saved scenario',
              addSelected: 'Add selected',
            },
          },
        },
      },
    },
  })
  return instance
}

function buildSavedScenario(overrides: Partial<SavedScenarioRecord> = {}): SavedScenarioRecord {
  return {
    scenario_id: 'saved-modal-1',
    scenario_name: 'Saved modal scenario',
    scenario_type: 'alternative',
    tags: ['fiscal'],
    description: 'Saved for modal test.',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
    created_by: 'session-test',
    assumptions: scenarioLabWorkspaceMock.assumptions.slice(0, 2).map((assumption) => ({
      key: assumption.key,
      label: assumption.label,
      value: assumption.default_value,
      unit: assumption.unit,
      category: assumption.category,
      technical_variable: assumption.technical_variable,
    })),
    model_ids: ['scenario-lab-mock-engine'],
    data_version: 'mock-v1',
    stored_at: '2026-04-22T10:15:00Z',
    ...overrides,
  }
}

describe('AddSavedScenarioModal', () => {
  it('renders a clear empty state when no saved runs exist', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AddSavedScenarioModal
          isOpen={true}
          savedScenarios={[]}
          activeScenarioIds={[]}
          maxSelectable={2}
          onClose={() => {}}
          onAddSelected={() => {}}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /role="dialog"/)
    assert.match(markup, /Add saved scenario/)
    assert.match(markup, /No saved runs yet/)
  })

  it('lists saved runs with selectable checkboxes', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AddSavedScenarioModal
          isOpen={true}
          savedScenarios={[buildSavedScenario()]}
          activeScenarioIds={[]}
          maxSelectable={2}
          onClose={() => {}}
          onAddSelected={() => {}}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /Saved modal scenario/)
    assert.match(markup, /type="checkbox"/)
    assert.match(markup, /Alternative/)
    assert.match(markup, /Add selected/)
  })
})
