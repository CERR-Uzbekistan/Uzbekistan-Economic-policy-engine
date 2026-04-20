import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
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
} from '../contracts/data-contract'
import {
  getInitialComparisonSourceState,
  loadComparisonSourceState,
} from '../data/comparison/source'
import { beginRetry } from '../data/source-state'
import { toComparisonScenario } from '../state/scenarioComparisonAdapter'
import { listScenarios, subscribeScenarioStore } from '../state/scenarioStore'
import './comparison.css'

function buildScenarioMap(scenarios: ComparisonScenario[]) {
  return scenarios.reduce<Record<string, ComparisonScenario>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario
    return acc
  }, {})
}

function buildInitialTags(scenarios: ComparisonScenario[]): Record<string, ComparisonScenarioTag> {
  return scenarios.reduce<Record<string, ComparisonScenarioTag>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario.initial_tag
    return acc
  }, {})
}

export function ComparisonPage() {
  const { t } = useTranslation()
  const [sourceState, setSourceState] = useState(getInitialComparisonSourceState)
  const [selectedIdsOverride, setSelectedIdsOverride] = useState<string[] | null>(null)
  const [baselineIdOverride, setBaselineIdOverride] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('level')
  const [tagsByScenarioIdOverride, setTagsByScenarioIdOverride] = useState<
    Record<string, ComparisonScenarioTag> | null
  >(null)
  const savedScenarios = useSyncExternalStore(subscribeScenarioStore, listScenarios, () => [])

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
  const scenarios = useMemo(() => {
    const workspaceScenarios = workspace?.scenarios ?? []
    if (savedScenarios.length === 0) {
      return workspaceScenarios
    }
    const merged = new Map<string, ComparisonScenario>()
    for (const scenario of workspaceScenarios) {
      merged.set(scenario.scenario_id, scenario)
    }
    for (const savedScenario of savedScenarios) {
      const mapped = toComparisonScenario(savedScenario)
      merged.set(mapped.scenario_id, mapped)
    }
    return Array.from(merged.values())
  }, [workspace, savedScenarios])
  const metricDefinitions = useMemo(() => workspace?.metric_definitions ?? [], [workspace])

  const defaultSelectedIds = useMemo(() => {
    if (!workspace) {
      return []
    }

    const scenarioIds = new Set(scenarios.map((scenario) => scenario.scenario_id))
    const normalized = workspace.default_selected_ids.filter((id) => scenarioIds.has(id)).slice(0, 4)
    return normalized.length >= 2
      ? normalized
      : scenarios.map((scenario) => scenario.scenario_id).slice(0, 4)
  }, [workspace, scenarios])

  const selectedIds = useMemo(() => {
    if (!workspace) {
      return []
    }

    if (!selectedIdsOverride) {
      return defaultSelectedIds
    }

    const scenarioIds = new Set(scenarios.map((scenario) => scenario.scenario_id))
    const normalized = selectedIdsOverride.filter((id) => scenarioIds.has(id)).slice(0, 4)
    return normalized.length >= 2 ? normalized : defaultSelectedIds
  }, [workspace, scenarios, selectedIdsOverride, defaultSelectedIds])

  const defaultBaselineId = useMemo(() => {
    if (!workspace) {
      return ''
    }

    const scenarioIds = new Set(scenarios.map((scenario) => scenario.scenario_id))
    return scenarioIds.has(workspace.default_baseline_id)
      ? workspace.default_baseline_id
      : scenarios[0]?.scenario_id ?? ''
  }, [workspace, scenarios])

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

    const defaults = buildInitialTags(scenarios)
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
  }, [workspace, scenarios, tagsByScenarioIdOverride])

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
        <PageHeader title={t('pages.comparison.title')} description={t('pages.comparison.description')} />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.comparison')}
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !workspace) {
    return (
      <PageContainer className="comparison-page">
        <PageHeader title={t('pages.comparison.title')} description={t('pages.comparison.description')} />
        <p className="empty-state" role="alert">
          {sourceState.error ?? t('states.error.comparisonUnavailable')}
        </p>
        {sourceState.canRetry ? (
          <div>
            <button type="button" className="ui-secondary-action" onClick={handleRetry}>
              {t('buttons.retry')}
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
      <PageHeader title={t('pages.comparison.title')} description={t('pages.comparison.description')} />

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
          metricDefinitions={metricDefinitions}
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
