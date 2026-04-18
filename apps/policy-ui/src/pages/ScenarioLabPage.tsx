import { useEffect, useMemo, useRef, useState } from 'react'
import { AssumptionsPanel } from '../components/scenario-lab/AssumptionsPanel'
import { InterpretationPanel } from '../components/scenario-lab/InterpretationPanel'
import { ResultsPanel } from '../components/scenario-lab/ResultsPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type {
  ScenarioLabAssumptionState,
  ScenarioLabResultTab,
  ScenarioLabWorkspace,
} from '../contracts/data-contract'
import {
  buildScenarioLabResults,
  scenarioLabWorkspaceMock,
} from '../data/mock/scenario-lab'
import {
  getInitialScenarioLabSourceState,
  loadScenarioLabSourceState,
} from '../data/scenario-lab/source'
import { beginRetry } from '../data/source-state'
import './scenario-lab.css'

type ScenarioRunParams = {
  assumptions: ScenarioLabAssumptionState
  selectedPresetId: string
  scenarioName: string
}

function getDefaultValuesFromWorkspace(workspace: ScenarioLabWorkspace): ScenarioLabAssumptionState {
  return workspace.assumptions.reduce<ScenarioLabAssumptionState>((acc, assumption) => {
    acc[assumption.key] = assumption.default_value
    return acc
  }, {})
}

function getPresetValuesFromWorkspace(workspace: ScenarioLabWorkspace, presetId: string): ScenarioLabAssumptionState {
  const baseState = getDefaultValuesFromWorkspace(workspace)
  const preset = workspace.presets.find((entry) => entry.preset_id === presetId)
  if (!preset) {
    return baseState
  }
  return { ...baseState, ...preset.assumption_overrides }
}

function assumptionsEqual(a: ScenarioLabAssumptionState, b: ScenarioLabAssumptionState): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}

export function ScenarioLabPage() {
  const [sourceState, setSourceState] = useState(getInitialScenarioLabSourceState)
  const [selectedPresetId, setSelectedPresetId] = useState(scenarioLabWorkspaceMock.presets[0]?.preset_id ?? '')
  const [scenarioName, setScenarioName] = useState('Scenario 1')
  const [assumptionValues, setAssumptionValues] = useState<ScenarioLabAssumptionState>(
    getPresetValuesFromWorkspace(scenarioLabWorkspaceMock, selectedPresetId),
  )
  const [activeTab, setActiveTab] = useState<ScenarioLabResultTab>('headline_impact')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [lastRunAssumptions, setLastRunAssumptions] = useState<ScenarioLabAssumptionState>(assumptionValues)
  const latestRunParamsRef = useRef<ScenarioRunParams>({
    assumptions: assumptionValues,
    selectedPresetId,
    scenarioName,
  })
  const activeRunIdRef = useRef(0)
  const reconciledWorkspaceRef = useRef<ScenarioLabWorkspace | null>(null)

  const workspace = sourceState.workspace ?? scenarioLabWorkspaceMock
  const fallbackResults = useMemo(() => buildScenarioLabResults(assumptionValues), [assumptionValues])
  const currentResults = sourceState.results ?? fallbackResults

  useEffect(() => {
    if (reconciledWorkspaceRef.current === workspace) {
      return
    }
    reconciledWorkspaceRef.current = workspace
    const knownKeys = new Set(workspace.assumptions.map((assumption) => assumption.key))
    const reconcile = (prev: ScenarioLabAssumptionState): ScenarioLabAssumptionState => {
      const next: ScenarioLabAssumptionState = {}
      for (const assumption of workspace.assumptions) {
        next[assumption.key] = prev[assumption.key] ?? assumption.default_value
      }
      for (const [key, value] of Object.entries(prev)) {
        if (knownKeys.has(key)) {
          next[key] = value
        }
      }
      return next
    }
    setAssumptionValues(reconcile)
    setLastRunAssumptions(reconcile)
    setSelectedPresetId((prev) =>
      workspace.presets.some((preset) => preset.preset_id === prev)
        ? prev
        : workspace.presets[0]?.preset_id ?? '',
    )
  }, [workspace])

  async function runScenario(nextParams: ScenarioRunParams) {
    latestRunParamsRef.current = nextParams
    setLastRunAssumptions(nextParams.assumptions)
    const runId = activeRunIdRef.current + 1
    activeRunIdRef.current = runId
    setSourceState((prev) => beginRetry(prev))
    const nextState = await loadScenarioLabSourceState(nextParams)
    if (activeRunIdRef.current !== runId) {
      return
    }
    setSourceState((prev) => {
      if (nextState.status === 'error' && prev.results && prev.workspace) {
        return { ...nextState, workspace: prev.workspace, results: prev.results }
      }
      return nextState
    })
  }

  useEffect(() => {
    void runScenario({
      assumptions: assumptionValues,
      selectedPresetId,
      scenarioName,
    })
    // Intentional mount-only initial run to separate editable assumptions from run lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePresetChange(nextPresetId: string) {
    const selectedPreset = workspace.presets.find((preset) => preset.preset_id === nextPresetId)
    setSelectedPresetId(nextPresetId)
    setAssumptionValues(getPresetValuesFromWorkspace(workspace, nextPresetId))
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

  function handleRunScenario() {
    void runScenario({
      assumptions: assumptionValues,
      selectedPresetId,
      scenarioName,
    })
  }

  function handleRetryScenarioRun() {
    void runScenario(latestRunParamsRef.current)
  }

  const hasReadyRun = sourceState.status === 'ready' || sourceState.results !== null
  const hasPendingEdits =
    hasReadyRun &&
    sourceState.status !== 'loading' &&
    !assumptionsEqual(assumptionValues, lastRunAssumptions)

  return (
    <PageContainer className="scenario-lab-page">
      <PageHeader
        title="Scenario Lab"
        description="Build policy scenarios by adjusting assumptions, then review impacts and interpretation in one operational workspace."
      />

      <div className="scenario-lab-grid">
        <AssumptionsPanel
          assumptions={workspace.assumptions}
          values={assumptionValues}
          presets={workspace.presets}
          selectedPresetId={selectedPresetId}
          scenarioName={scenarioName}
          onPresetChange={handlePresetChange}
          onScenarioNameChange={setScenarioName}
          onAssumptionChange={handleAssumptionChange}
          onRunScenario={handleRunScenario}
          isRunPending={sourceState.status === 'loading'}
          onSaveScenario={handleSaveScenario}
          saveStatus={saveStatus}
        />

        <div className="scenario-panel-stack">
          {sourceState.status === 'loading' ? (
            <p className="scenario-run-state scenario-run-state--loading" role="status" aria-live="polite">
              Running scenario with current assumptions...
            </p>
          ) : null}

          {sourceState.status === 'error' ? (
            <div className="scenario-run-state scenario-run-state--error" role="alert">
              <p>{sourceState.error ?? 'Scenario run failed. Please retry.'}</p>
              <button type="button" className="ui-secondary-action" onClick={handleRetryScenarioRun}>
                Retry run
              </button>
            </div>
          ) : null}

          {hasPendingEdits ? (
            <p
              className="scenario-run-state scenario-run-state--stale"
              role="status"
              aria-live="polite"
            >
              Results reflect the previous run. Run scenario to update with current assumptions.
            </p>
          ) : null}

          {hasReadyRun ? (
            <>
              <ResultsPanel activeTab={activeTab} onTabChange={setActiveTab} results={currentResults} />
              <InterpretationPanel interpretation={currentResults.interpretation} />
            </>
          ) : (
            <>
              <section className="scenario-panel scenario-panel--results">
                <p className="empty-state">Run a scenario to view results.</p>
              </section>
              <section className="scenario-panel scenario-panel--interpretation">
                <p className="empty-state">Interpretation appears after a successful scenario run.</p>
              </section>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
