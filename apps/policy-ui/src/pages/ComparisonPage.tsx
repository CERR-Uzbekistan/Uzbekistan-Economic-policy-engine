import { useEffect, useMemo, useState } from 'react'
import { ComparisonChartPanel } from '../components/comparison/ComparisonChartPanel'
import { HeadlineComparisonTable } from '../components/comparison/HeadlineComparisonTable'
import { ScenarioSelectorPanel } from '../components/comparison/ScenarioSelectorPanel'
import { TradeoffSummaryPanel } from '../components/comparison/TradeoffSummaryPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type {
  ComparisonScenario,
  ComparisonScenarioTag,
  ComparisonViewMode,
  ComparisonWorkspace,
} from '../contracts/data-contract'
import {
  getInitialComparisonSourceState,
  loadComparisonSourceState,
} from '../data/comparison/source'
import { beginRetry } from '../data/source-state'
import './comparison.css'

function buildScenarioMap(scenarios: ComparisonScenario[]) {
  return scenarios.reduce<Record<string, ComparisonScenario>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario
    return acc
  }, {})
}

function buildInitialTags(workspace: ComparisonWorkspace): Record<string, ComparisonScenarioTag> {
  return workspace.scenarios.reduce<Record<string, ComparisonScenarioTag>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario.initial_tag
    return acc
  }, {})
}

export function ComparisonPage() {
  const [sourceState, setSourceState] = useState(getInitialComparisonSourceState)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [baselineId, setBaselineId] = useState('')
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('level')
  const [tagsByScenarioId, setTagsByScenarioId] = useState<Record<string, ComparisonScenarioTag>>({})

  useEffect(() => {
    let cancelled = false
    loadComparisonSourceState().then((state) => {
      if (!cancelled) {
        setSourceState(state)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const workspace = sourceState.workspace
  const scenarios = workspace?.scenarios ?? []
  const metricDefinitions = workspace?.metric_definitions ?? []
  const scenarioMap = useMemo(() => buildScenarioMap(scenarios), [scenarios])
  const selectedScenarios = useMemo(
    () => selectedIds.map((id) => scenarioMap[id]).filter(Boolean),
    [selectedIds, scenarioMap],
  )

  useEffect(() => {
    if (!workspace) {
      return
    }

    const scenarioIds = new Set(workspace.scenarios.map((scenario) => scenario.scenario_id))
    const normalizedSelected = workspace.default_selected_ids.filter((id) => scenarioIds.has(id)).slice(0, 4)

    setSelectedIds(
      normalizedSelected.length >= 2
        ? normalizedSelected
        : workspace.scenarios.map((scenario) => scenario.scenario_id).slice(0, 4),
    )

    const baselineFromWorkspace = scenarioIds.has(workspace.default_baseline_id)
      ? workspace.default_baseline_id
      : workspace.scenarios[0]?.scenario_id ?? ''

    setBaselineId(baselineFromWorkspace)
    setTagsByScenarioId(buildInitialTags(workspace))
  }, [workspace?.workspace_id])

  async function handleRetry() {
    setSourceState((prev) => beginRetry(prev))
    const nextState = await loadComparisonSourceState()
    setSourceState(nextState)
  }

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="comparison-page">
        <PageHeader
          title="Comparison"
          description="Compare baseline and alternative scenarios side by side to surface trade-offs and decision framing."
        />
        <p className="empty-state" role="status" aria-live="polite">
          Loading comparison workspace...
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !workspace) {
    return (
      <PageContainer className="comparison-page">
        <PageHeader
          title="Comparison"
          description="Compare baseline and alternative scenarios side by side to surface trade-offs and decision framing."
        />
        <p className="empty-state" role="status" aria-live="polite">
          {sourceState.error ?? 'Comparison data is currently unavailable.'}
        </p>
        {sourceState.canRetry ? (
          <div>
            <button type="button" className="ui-secondary-action" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}
      </PageContainer>
    )
  }

  function handleToggleScenario(scenarioId: string) {
    const currentlySelected = selectedIds.includes(scenarioId)

    if (currentlySelected) {
      if (scenarioId === baselineId || selectedIds.length <= 2) {
        return
      }
      setSelectedIds((prev) => prev.filter((id) => id !== scenarioId))
      return
    }

    if (selectedIds.length >= 4) {
      return
    }
    setSelectedIds((prev) => [...prev, scenarioId])
  }

  function handleBaselineChange(nextBaselineId: string) {
    if (!selectedIds.includes(nextBaselineId)) {
      setSelectedIds((prev) => {
        if (prev.length < 4) {
          return [...prev, nextBaselineId]
        }
        const removable = prev.find((id) => id !== baselineId)
        return removable ? [...prev.filter((id) => id !== removable), nextBaselineId] : prev
      })
    }
    setBaselineId(nextBaselineId)
  }

  function handleTagChange(scenarioId: string, tag: ComparisonScenarioTag) {
    setTagsByScenarioId((prev) => ({ ...prev, [scenarioId]: tag }))
  }

  return (
    <PageContainer className="comparison-page">
      <PageHeader
        title="Comparison"
        description="Compare baseline and alternative scenarios side by side to surface trade-offs and decision framing."
      />

      <ScenarioSelectorPanel
        scenarios={scenarios}
        selectedIds={selectedIds}
        baselineId={baselineId}
        tagsByScenarioId={tagsByScenarioId}
        onToggleScenario={handleToggleScenario}
        onBaselineChange={handleBaselineChange}
        onTagChange={handleTagChange}
      />

      <HeadlineComparisonTable
        metrics={metricDefinitions}
        selectedScenarios={selectedScenarios}
        baselineId={baselineId}
        tagsByScenarioId={tagsByScenarioId}
      />

      <div className="comparison-bottom-grid">
        <ComparisonChartPanel
          selectedScenarios={selectedScenarios}
          baselineId={baselineId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <TradeoffSummaryPanel
          selectedScenarios={selectedScenarios}
          baselineId={baselineId}
          tagsByScenarioId={tagsByScenarioId}
        />
      </div>
    </PageContainer>
  )
}
