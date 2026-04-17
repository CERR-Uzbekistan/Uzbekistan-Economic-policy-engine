import { useMemo, useState } from 'react'
import { AssumptionsPanel } from '../components/scenario-lab/AssumptionsPanel'
import { InterpretationPanel } from '../components/scenario-lab/InterpretationPanel'
import { ResultsPanel } from '../components/scenario-lab/ResultsPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type { ScenarioLabAssumptionState, ScenarioLabResultTab } from '../contracts/data-contract'
import {
  applyPresetToState,
  buildScenarioLabResults,
  scenarioLabWorkspaceMock,
} from '../data/mock/scenario-lab'
import './scenario-lab.css'

export function ScenarioLabPage() {
  const [selectedPresetId, setSelectedPresetId] = useState(scenarioLabWorkspaceMock.presets[0].preset_id)
  const [scenarioName, setScenarioName] = useState('Scenario 1')
  const [assumptionValues, setAssumptionValues] = useState<ScenarioLabAssumptionState>(
    applyPresetToState(selectedPresetId),
  )
  const [activeTab, setActiveTab] = useState<ScenarioLabResultTab>('headline_impact')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const currentResults = useMemo(
    () => buildScenarioLabResults(assumptionValues),
    [assumptionValues],
  )

  function handlePresetChange(nextPresetId: string) {
    const selectedPreset = scenarioLabWorkspaceMock.presets.find((preset) => preset.preset_id === nextPresetId)
    setSelectedPresetId(nextPresetId)
    setAssumptionValues(applyPresetToState(nextPresetId))
    if (selectedPreset) {
      setScenarioName(selectedPreset.title)
    }
    setSaveStatus(null)
  }

  function handleAssumptionChange(key: string, value: number) {
    setAssumptionValues((prev) => ({ ...prev, [key]: value }))
    setSaveStatus(null)
  }

  function handleSaveScenario() {
    const timestamp = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date())
    setSaveStatus(`Saved to local session at ${timestamp}.`)
  }

  return (
    <PageContainer className="scenario-lab-page">
      <PageHeader
        title="Scenario Lab"
        description="Build policy scenarios by adjusting assumptions, then review impacts and interpretation in one operational workspace."
      />

      <div className="scenario-lab-grid">
        <AssumptionsPanel
          assumptions={scenarioLabWorkspaceMock.assumptions}
          values={assumptionValues}
          presets={scenarioLabWorkspaceMock.presets}
          selectedPresetId={selectedPresetId}
          scenarioName={scenarioName}
          onPresetChange={handlePresetChange}
          onScenarioNameChange={setScenarioName}
          onAssumptionChange={handleAssumptionChange}
          onSaveScenario={handleSaveScenario}
          saveStatus={saveStatus}
        />

        <ResultsPanel activeTab={activeTab} onTabChange={setActiveTab} results={currentResults} />

        <InterpretationPanel interpretation={currentResults.interpretation} />
      </div>
    </PageContainer>
  )
}
