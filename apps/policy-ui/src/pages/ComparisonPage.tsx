import { useMemo, useState } from 'react'
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
import { comparisonWorkspaceMock } from '../data/mock/comparison'
import './comparison.css'

function buildScenarioMap(scenarios: ComparisonScenario[]) {
  return scenarios.reduce<Record<string, ComparisonScenario>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario
    return acc
  }, {})
}

export function ComparisonPage() {
  const { scenarios, metric_definitions, default_baseline_id, default_selected_ids } = comparisonWorkspaceMock
  const scenarioMap = useMemo(() => buildScenarioMap(scenarios), [scenarios])

  const [selectedIds, setSelectedIds] = useState<string[]>(default_selected_ids)
  const [baselineId, setBaselineId] = useState(default_baseline_id)
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('level')
  const [tagsByScenarioId, setTagsByScenarioId] = useState<Record<string, ComparisonScenarioTag>>(
    scenarios.reduce<Record<string, ComparisonScenarioTag>>((acc, scenario) => {
      acc[scenario.scenario_id] = scenario.initial_tag
      return acc
    }, {}),
  )

  const selectedScenarios = useMemo(
    () => selectedIds.map((id) => scenarioMap[id]).filter(Boolean),
    [selectedIds, scenarioMap],
  )

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
        metrics={metric_definitions}
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
