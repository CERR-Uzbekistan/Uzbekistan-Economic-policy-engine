import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ComparisonSelector } from '../components/comparison/ComparisonSelector'
import { DeltaTable } from '../components/comparison/DeltaTable'
import { ScenarioSummaryCards } from '../components/comparison/ScenarioSummaryCards'
import { TradeoffSummaryPanel } from '../components/comparison/TradeoffSummaryPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type { ComparisonContent } from '../contracts/data-contract'
import { composeComparisonContent } from '../data/adapters/comparison'
import {
  getInitialComparisonSourceState,
  loadComparisonSourceState,
} from '../data/comparison/source'
import { beginRetry } from '../data/source-state'
import './comparison.css'

const COMPARISON_SLOT_LIMIT = 3

export function ComparisonPage() {
  const { t } = useTranslation()
  const [sourceState, setSourceState] = useState(getInitialComparisonSourceState)
  const [selectedIdsOverride, setSelectedIdsOverride] = useState<string[] | null>(null)
  const [baselineIdOverride, setBaselineIdOverride] = useState<string | null>(null)

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

  const selectedIds = useMemo(() => {
    if (!workspace) return []
    const scenarioIds = new Set(workspace.scenarios.map((scenario) => scenario.scenario_id))
    const candidate = selectedIdsOverride ?? workspace.default_selected_ids
    const normalized = candidate.filter((id) => scenarioIds.has(id)).slice(0, COMPARISON_SLOT_LIMIT)
    return normalized.length >= 2
      ? normalized
      : workspace.scenarios.map((scenario) => scenario.scenario_id).slice(0, COMPARISON_SLOT_LIMIT)
  }, [workspace, selectedIdsOverride])

  const baselineId = useMemo(() => {
    if (!workspace) return ''
    const candidate = baselineIdOverride ?? workspace.default_baseline_id
    return selectedIds.includes(candidate) ? candidate : selectedIds[0] ?? ''
  }, [workspace, baselineIdOverride, selectedIds])

  const content: ComparisonContent | null = useMemo(() => {
    if (!workspace || selectedIds.length === 0 || !baselineId) {
      return null
    }
    return composeComparisonContent(workspace, selectedIds, baselineId)
  }, [workspace, selectedIds, baselineId])

  async function handleRetry() {
    setSourceState((prev) => beginRetry(prev))
    const nextState = await loadComparisonSourceState()
    setSourceState(nextState)
  }

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="comparison-page">
        <PageHeader
          title={t('pages.comparison.title')}
          description={t('pages.comparison.description')}
        />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.comparison')}
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !workspace || !content) {
    return (
      <PageContainer className="comparison-page">
        <PageHeader
          title={t('pages.comparison.title')}
          description={t('pages.comparison.description')}
        />
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

  function handleRemove(scenarioId: string) {
    // Preserve baseline; require at least 2 scenarios to remain.
    if (scenarioId === baselineId) return
    if (selectedIds.length <= 2) return
    setSelectedIdsOverride(selectedIds.filter((id) => id !== scenarioId))
  }

  function handleAddSavedScenario() {
    // Shot 1 stub — the saved-scenario picker modal is Shot 2 scope. A real
    // picker would source from scenarioStore and merge into the selection
    // (subject to COMPARISON_SLOT_LIMIT).
    console.info('[Comparison] Add-saved-scenario modal not yet wired (Shot 2).')
  }

  function handleBaselineChange(nextBaselineId: string) {
    // Amend-cycle 1 fix: baseline switcher reintroduced. If the new baseline is
    // not already in the selection, swap it in (replacing the last non-baseline
    // slot when at capacity) so the delta table continues to render 3 scenarios.
    if (!workspace) return
    if (!selectedIds.includes(nextBaselineId)) {
      const currentIds = selectedIds
      if (currentIds.length < COMPARISON_SLOT_LIMIT) {
        setSelectedIdsOverride([...currentIds, nextBaselineId])
      } else {
        const removableId = currentIds.find((id) => id !== baselineId) ?? currentIds[0]
        setSelectedIdsOverride([
          ...currentIds.filter((id) => id !== removableId),
          nextBaselineId,
        ])
      }
    }
    setBaselineIdOverride(nextBaselineId)
  }

  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('comparison.header.eyebrow')}</span>
      <span>
        {t('comparison.header.meta.comparing')} {t('overview.common.middleDot')}{' '}
        <strong>
          {t('comparison.header.meta.scenarioCount', { count: content.scenarios.length })}
        </strong>
      </span>
      <span>
        {t('comparison.header.meta.horizon')} {t('overview.common.middleDot')}{' '}
        <strong>{content.horizon_label}</strong>
      </span>
      <span>
        {t('comparison.header.meta.mode')} {t('overview.common.middleDot')}{' '}
        <strong>{t('comparison.header.meta.deltasVsBaseline')}</strong>
      </span>
    </>
  )

  return (
    <PageContainer className="comparison-page">
      <PageHeader
        title={t('pages.comparison.title')}
        description={t('pages.comparison.description')}
        meta={pageHeaderMeta}
      />

      <ComparisonSelector
        scenarios={content.scenarios}
        baselineId={content.baseline_scenario_id}
        onRemove={handleRemove}
        onAddSavedScenario={handleAddSavedScenario}
        onBaselineChange={handleBaselineChange}
      />

      <ScenarioSummaryCards scenarios={content.scenarios} metrics={content.metrics} />

      <DeltaTable
        scenarios={content.scenarios}
        metrics={content.metrics}
        baselineScenarioId={content.baseline_scenario_id}
      />

      <TradeoffSummaryPanel tradeoff={content.tradeoff} scenarios={content.scenarios} />
    </PageContainer>
  )
}
