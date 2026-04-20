import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AssumptionsPanel } from '../components/scenario-lab/AssumptionsPanel'
import { InterpretationPanel } from '../components/scenario-lab/InterpretationPanel'
import { ResultsPanel } from '../components/scenario-lab/ResultsPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type {
  Assumption,
  ModelAttribution,
  ScenarioLabAssumptionState,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
  ScenarioLabWorkspace,
  ScenarioType,
} from '../contracts/data-contract'
import {
  buildScenarioLabResults,
  scenarioLabBaseDataVersion,
  scenarioLabPresetModelIds,
  scenarioLabWorkspaceMock,
} from '../data/mock/scenario-lab'
import {
  getInitialScenarioLabSourceState,
  loadScenarioLabSourceState,
} from '../data/scenario-lab/source'
import { beginRetry } from '../data/source-state'
import {
  deleteScenario,
  listScenarios,
  loadScenario,
  saveScenario,
  subscribeScenarioStore,
} from '../state/scenarioStore'
import {
  findPreset,
  getDefaultValuesFromWorkspace,
  getPresetValuesFromWorkspace,
  resolveDefaultPresetId,
  resolvePresetHydration,
} from './scenario-lab-preset.js'
import './scenario-lab.css'

type ScenarioRunParams = {
  assumptions: ScenarioLabAssumptionState
  selectedPresetId: string
  scenarioName: string
}

const SCENARIO_TAG_OPTIONS = ['monetary', 'fiscal', 'external', 'trade', 'inflation']

function assumptionsEqual(a: ScenarioLabAssumptionState, b: ScenarioLabAssumptionState): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}

function buildAssumptions(
  workspace: ScenarioLabWorkspace,
  values: ScenarioLabAssumptionState,
): Assumption[] {
  return workspace.assumptions.map((assumption) => ({
    key: assumption.key,
    label: assumption.label,
    value: values[assumption.key] ?? assumption.default_value,
    unit: assumption.unit,
    category: assumption.category,
    technical_variable: assumption.technical_variable,
  }))
}

function extractAttribution(results: ScenarioLabResultsBundle | null): ModelAttribution[] {
  if (!results) {
    return []
  }

  const byRunId = new Map<string, ModelAttribution>()
  for (const metric of results.headline_metrics) {
    for (const attribution of metric.model_attribution) {
      byRunId.set(attribution.run_id, attribution)
    }
  }
  for (const chart of Object.values(results.charts_by_tab)) {
    for (const attribution of chart.model_attribution) {
      byRunId.set(attribution.run_id, attribution)
    }
  }
  return Array.from(byRunId.values())
}

function pickLatestAttribution(attributions: ModelAttribution[]): ModelAttribution | null {
  if (attributions.length === 0) {
    return null
  }
  return attributions.reduce((latest, current) => {
    const latestMs = Number.isFinite(Date.parse(latest.timestamp))
      ? Date.parse(latest.timestamp)
      : Number.NEGATIVE_INFINITY
    const currentMs = Number.isFinite(Date.parse(current.timestamp))
      ? Date.parse(current.timestamp)
      : Number.NEGATIVE_INFINITY
    return currentMs > latestMs ? current : latest
  })
}

function toAssumptionValues(
  workspace: ScenarioLabWorkspace,
  assumptions: Assumption[],
): ScenarioLabAssumptionState {
  const base = getDefaultValuesFromWorkspace(workspace)
  for (const assumption of assumptions) {
    if (typeof assumption.value === 'number') {
      base[assumption.key] = assumption.value
    }
  }
  return base
}

export function ScenarioLabPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sourceState, setSourceState] = useState(getInitialScenarioLabSourceState)
  const initialPresetId = resolveDefaultPresetId(scenarioLabWorkspaceMock)
  const initialPreset = findPreset(scenarioLabWorkspaceMock, initialPresetId)
  const [selectedPresetId, setSelectedPresetId] = useState(initialPresetId)
  const [scenarioName, setScenarioName] = useState(initialPreset?.title ?? 'Scenario 1')
  const [scenarioType, setScenarioType] = useState<ScenarioType>('alternative')
  const [scenarioDescription, setScenarioDescription] = useState('')
  const [scenarioTags, setScenarioTags] = useState<string[]>([])
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
  const [assumptionValues, setAssumptionValues] = useState<ScenarioLabAssumptionState>(
    getPresetValuesFromWorkspace(scenarioLabWorkspaceMock, initialPresetId),
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
  const hasHydratedPresetFromUrlRef = useRef(false)
  const [isPresetHydrationComplete, setIsPresetHydrationComplete] = useState(false)
  const reconciledWorkspaceRef = useRef<ScenarioLabWorkspace | null>(null)
  const latestSuccessfulAttributionRef = useRef<ModelAttribution[]>([])
  const savedScenarios = useSyncExternalStore(subscribeScenarioStore, listScenarios, () => [])

  const workspace = sourceState.workspace ?? scenarioLabWorkspaceMock
  const fallbackResults = useMemo(
    () => buildScenarioLabResults(assumptionValues, { selectedPresetId }),
    [assumptionValues, selectedPresetId],
  )
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
        : resolveDefaultPresetId(workspace),
    )
  }, [workspace])

  useEffect(() => {
    if (sourceState.status === 'ready') {
      latestSuccessfulAttributionRef.current = extractAttribution(sourceState.results)
    }
  }, [sourceState.status, sourceState.results])

  useEffect(() => {
    if (hasHydratedPresetFromUrlRef.current) {
      return
    }

    hasHydratedPresetFromUrlRef.current = true
    const presetFromQuery = searchParams.get('preset')
    const hydration = resolvePresetHydration(workspace, presetFromQuery)
    if (hydration.warningMessage) {
      console.warn(hydration.warningMessage)
    }

    setSelectedPresetId(hydration.selectedPresetId)
    setAssumptionValues(hydration.assumptionValues)
    setLastRunAssumptions(hydration.assumptionValues)
    setScenarioName(hydration.scenarioName)

    if (presetFromQuery !== hydration.selectedPresetId) {
      setSearchParams({ preset: hydration.selectedPresetId }, { replace: true })
    }

    setIsPresetHydrationComplete(true)
  }, [searchParams, setSearchParams, workspace])

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

  async function runScenarioSilently(nextParams: ScenarioRunParams) {
    latestRunParamsRef.current = nextParams
    const runId = activeRunIdRef.current + 1
    activeRunIdRef.current = runId
    const nextState = await loadScenarioLabSourceState(nextParams)
    if (activeRunIdRef.current !== runId) {
      return
    }
    setLastRunAssumptions(nextParams.assumptions)
    setSourceState((prev) => {
      if (nextState.status === 'error' && prev.results && prev.workspace) {
        return { ...nextState, workspace: prev.workspace, results: prev.results }
      }
      return nextState
    })
  }

  useEffect(() => {
    if (!isPresetHydrationComplete) {
      return
    }

    const timerId = window.setTimeout(() => {
      void runScenarioSilently({
        assumptions: assumptionValues,
        selectedPresetId,
        scenarioName,
      })
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
    // Intentional one-time initial run after preset hydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresetHydrationComplete])

  function handlePresetChange(nextPresetId: string) {
    const selectedPreset = workspace.presets.find((preset) => preset.preset_id === nextPresetId)
    setSelectedPresetId(nextPresetId)
    setAssumptionValues(getPresetValuesFromWorkspace(workspace, nextPresetId))
    if (selectedPreset) {
      setScenarioName(selectedPreset.title)
    }
    setSearchParams({ preset: nextPresetId })
    setSaveStatus(null)
  }

  function handleScenarioNameChange(nextScenarioName: string) {
    setScenarioName(nextScenarioName)
    setSaveStatus(null)
  }

  function handleAssumptionChange(key: string, value: number) {
    setAssumptionValues((prev) => ({ ...prev, [key]: value }))
    setSaveStatus(null)
  }

  function handleScenarioTypeChange(nextScenarioType: ScenarioType) {
    setScenarioType(nextScenarioType)
    setSaveStatus(null)
  }

  function handleScenarioDescriptionChange(nextScenarioDescription: string) {
    setScenarioDescription(nextScenarioDescription)
    setSaveStatus(null)
  }

  function handleScenarioTagToggle(tag: string) {
    setScenarioTags((prev) =>
      prev.includes(tag) ? prev.filter((existingTag) => existingTag !== tag) : [...prev, tag],
    )
    setSaveStatus(null)
  }

  function handleSaveScenario() {
    const latestAttribution = pickLatestAttribution(latestSuccessfulAttributionRef.current)
    const modelIdsFromRun = latestSuccessfulAttributionRef.current
      .map((attribution) => attribution.model_id)
      .filter((modelId, index, ids) => modelId.length > 0 && ids.indexOf(modelId) === index)
    const modelIdsFromPreset = scenarioLabPresetModelIds[selectedPresetId] ?? []
    const modelIds = modelIdsFromRun.length > 0 ? modelIdsFromRun : modelIdsFromPreset
    const dataVersion = latestAttribution?.data_version ?? scenarioLabBaseDataVersion

    if (modelIds.length === 0) {
      setSaveStatus(t('states.error.scenarioModelIdsUnavailable'))
      return
    }

    try {
      const record = saveScenario({
        scenario_id: currentScenarioId ?? globalThis.crypto.randomUUID(),
        scenario_name: scenarioName,
        scenario_type: scenarioType,
        description: scenarioDescription,
        tags: scenarioTags,
        assumptions: buildAssumptions(workspace, assumptionValues),
        model_ids: modelIds,
        data_version: dataVersion,
        created_at: '',
        updated_at: '',
        created_by: '',
      })
      const timestamp = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }).format(new Date(record.stored_at))
      setCurrentScenarioId(record.scenario_id)
      setSaveStatus(t('states.success.savedToLocalSessionAt', { timestamp }))
    } catch {
      setSaveStatus(t('states.error.scenarioSaveFailed'))
    }
  }

  function handleLoadSavedScenario(scenarioId: string) {
    const record = loadScenario(scenarioId)
    if (!record) {
      setSaveStatus(t('states.error.savedScenarioLoadFailed'))
      return
    }

    setScenarioName(record.scenario_name)
    setScenarioType(record.scenario_type)
    setScenarioDescription(record.description)
    setScenarioTags(record.tags)
    setCurrentScenarioId(record.scenario_id)
    setAssumptionValues(toAssumptionValues(workspace, record.assumptions))
    setSaveStatus(t('states.success.savedScenarioLoaded', { scenarioName: record.scenario_name }))
  }

  function handleDeleteSavedScenario(scenarioId: string) {
    const record = loadScenario(scenarioId)
    const scenarioLabel = record?.scenario_name ?? scenarioId
    const confirmed = window.confirm(t('scenarioLab.saved.confirmDelete', { scenarioName: scenarioLabel }))
    if (!confirmed) {
      return
    }

    const wasDeleted = deleteScenario(scenarioId)
    if (!wasDeleted) {
      setSaveStatus(t('states.error.savedScenarioDeleteFailed'))
      return
    }
    if (currentScenarioId === scenarioId) {
      setCurrentScenarioId(null)
    }
    setSaveStatus(t('states.success.savedScenarioDeleted', { scenarioName: scenarioLabel }))
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

  const currentAttribution = extractAttribution(currentResults)
  const modelIdsForHeader =
    currentAttribution.length > 0
      ? currentAttribution.map((entry) => entry.model_id)
      : scenarioLabPresetModelIds[selectedPresetId] ?? []
  const activeModelCount = Math.max(
    1,
    new Set(modelIdsForHeader.filter((modelId) => modelId.length > 0)).size,
  )
  const latestAttribution = pickLatestAttribution(currentAttribution)
  const dataVintage = latestAttribution?.data_version ?? scenarioLabBaseDataVersion
  const runLifecycleStatusKey =
    sourceState.status === 'loading'
      ? 'loading'
      : sourceState.status === 'error'
        ? 'error'
        : sourceState.status === 'ready'
          ? 'ready'
          : 'ready'
  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('scenarioLab.header.eyebrow')}</span>
      <span>
        <strong>{t('scenarioLab.header.meta.activeModelsLabel')}</strong>{' '}
        {t('overview.common.middleDot')} {activeModelCount}
      </span>
      <span>
        <strong>{t('scenarioLab.header.meta.runLifecycleLabel')}</strong>{' '}
        {t('overview.common.middleDot')} {t(`scenarioLab.header.meta.runLifecycleStatus.${runLifecycleStatusKey}`)}
      </span>
      <span>
        <strong>{t('scenarioLab.header.meta.dataVintageLabel')}</strong>{' '}
        {t('overview.common.middleDot')} {dataVintage}
      </span>
    </>
  )

  return (
    <PageContainer className="scenario-lab-page">
      <PageHeader
        title={t('pages.scenarioLab.title')}
        description={t('pages.scenarioLab.description')}
        meta={pageHeaderMeta}
      />

      <div className="scenario-lab-grid lab-grid">
        <AssumptionsPanel
          assumptions={workspace.assumptions}
          values={assumptionValues}
          presets={workspace.presets}
          selectedPresetId={selectedPresetId}
          scenarioName={scenarioName}
          scenarioType={scenarioType}
          scenarioDescription={scenarioDescription}
          scenarioTags={scenarioTags}
          availableScenarioTags={SCENARIO_TAG_OPTIONS}
          onPresetChange={handlePresetChange}
          onScenarioNameChange={handleScenarioNameChange}
          onScenarioTypeChange={handleScenarioTypeChange}
          onScenarioDescriptionChange={handleScenarioDescriptionChange}
          onScenarioTagToggle={handleScenarioTagToggle}
          onAssumptionChange={handleAssumptionChange}
          onRunScenario={handleRunScenario}
          isRunPending={sourceState.status === 'loading'}
          onSaveScenario={handleSaveScenario}
          savedScenarios={savedScenarios}
          onLoadScenario={handleLoadSavedScenario}
          onDeleteScenario={handleDeleteSavedScenario}
          saveStatus={saveStatus}
        />

        <div className="scenario-panel-stack scenario-panel-stack--results">
          {sourceState.status === 'loading' ? (
            <p className="scenario-run-state scenario-run-state--loading" role="status" aria-live="polite">
              {t('states.loading.scenarioLabRun')}
            </p>
          ) : null}

          {sourceState.status === 'error' ? (
            <div className="scenario-run-state scenario-run-state--error" role="alert">
              <p>{sourceState.error ?? t('states.error.scenarioRunFailed')}</p>
              <button type="button" className="ui-secondary-action" onClick={handleRetryScenarioRun}>
                {t('buttons.retryRun')}
              </button>
            </div>
          ) : null}

          {hasPendingEdits ? (
            <p
              className="scenario-run-state scenario-run-state--stale stale-banner"
              role="status"
              aria-live="polite"
            >
              {t('states.stale.scenarioResults')}
            </p>
          ) : null}

          {hasReadyRun ? (
            <ResultsPanel activeTab={activeTab} onTabChange={setActiveTab} results={currentResults} />
          ) : (
            <section className="scenario-panel scenario-panel--results">
              <p className="empty-state">{t('states.empty.scenarioRunToView')}</p>
            </section>
          )}
        </div>

        {hasReadyRun ? (
          <InterpretationPanel interpretation={currentResults.interpretation} />
        ) : (
          <section className="scenario-panel scenario-panel--interpretation">
            <p className="empty-state">{t('states.empty.scenarioInterpretationAfterRun')}</p>
          </section>
        )}
      </div>
    </PageContainer>
  )
}
