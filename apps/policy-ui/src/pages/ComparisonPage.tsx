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
  const [selectedIdsOverride, setSelectedIdsOverride] = useState<string[] | null>(null)
  const [baselineIdOverride, setBaselineIdOverride] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('level')
  const [tagsByScenarioIdOverride, setTagsByScenarioIdOverride] = useState<
    Record<string, ComparisonScenarioTag> | null
  >(null)

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
  const scenarios = useMemo(() => workspace?.scenarios ?? [], [workspace])
  const metricDefinitions = useMemo(() => workspace?.metric_definitions ?? [], [workspace])

  const defaultSelectedIds = useMemo(() => {
    if (!workspace) {
      return []
    }

    const scenarioIds = new Set(workspace.scenarios.map((scenario) => scenario.scenario_id))
    const normalized = workspace.default_selected_ids.filter((id) => scenarioIds.has(id)).slice(0, 4)
    return normalized.length >= 2
      ? normalized
      : workspace.scenarios.map((scenario) => scenario.scenario_id).slice(0, 4)
  }, [workspace])

  const selectedIds = useMemo(() => {
    if (!workspace) {
      return []
    }

    if (!selectedIdsOverride) {
      return defaultSelectedIds
    }

    const scenarioIds = new Set(workspace.scenarios.map((scenario) => scenario.scenario_id))
    const normalized = selectedIdsOverride.filter((id) => scenarioIds.has(id)).slice(0, 4)
    return normalized.length >= 2 ? normalized : defaultSelectedIds
  }, [workspace, selectedIdsOverride, defaultSelectedIds])

  const defaultBaselineId = useMemo(() => {
    if (!workspace) {
      return ''
    }

    const scenarioIds = new Set(workspace.scenarios.map((scenario) => scenario.scenario_id))
    return scenarioIds.has(workspace.default_baseline_id)
      ? workspace.default_baseline_id
      : workspace.scenarios[0]?.scenario_id ?? ''
  }, [workspace])

  const baselineId = useMemo(() => {
    if (!workspace) {
      return ''
    }

    const candidate = baselineIdOverride ?? defaultBaselineId
    return selectedIds.includes(candidate) ? candidate : selectedIds[0] ?? ''
  }, [workspace, baselineIdOverride, defaultBaselineId, selectedIds])

  const tagsByScenarioId = useMemo(() => {
    if (!workspace) {
      return {}
    }

    const defaults = buildInitialTags(workspace)
    if (!tagsByScenarioIdOverride) {
      return defaults
    }

    return Object.entries(tagsByScenarioIdOverride).reduce<Record<string, ComparisonScenarioTag>>(
      (acc, [scenarioId, tag]) => {
        if (scenarioId in acc) {
          acc[scenarioId] = tag
        }
        return acc
      },
      defaults,
    )
  }, [workspace, tagsByScenarioIdOverride])

  const scenarioMap = useMemo(() => buildScenarioMap(scenarios), [scenarios])
  const selectedScenarios = useMemo(
    () => selectedIds.map((id) => scenarioMap[id]).filter(Boolean),
    [selectedIds, scenarioMap],
  )

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
        <p className="empty-state" role="alert">
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
      setSelectedIdsOverride((prev) => {
        const current = prev ?? selectedIds
        return current.filter((id) => id !== scenarioId)
      })
      return
    }

    if (selectedIds.length >= 4) {
      return
    }

    setSelectedIdsOverride((prev) => {
      const current = prev ?? selectedIds
      return [...current, scenarioId]
    })
  }

  function handleBaselineChange(nextBaselineId: string) {
    if (!selectedIds.includes(nextBaselineId)) {
      setSelectedIdsOverride((prev) => {
        const current = prev ?? selectedIds
        if (current.length < 4) {
          return [...current, nextBaselineId]
        }
        const removable = current.find((id) => id !== baselineId)
        return removable ? [...current.filter((id) => id !== removable), nextBaselineId] : current
      })
    }
    setBaselineIdOverride(nextBaselineId)
  }

  function handleTagChange(scenarioId: string, tag: ComparisonScenarioTag) {
    setTagsByScenarioIdOverride((prev) => {
      const current = prev ?? tagsByScenarioId
      return { ...current, [scenarioId]: tag }
    })
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
