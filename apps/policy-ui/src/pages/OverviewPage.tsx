import { useEffect, useState } from 'react'
import { EconomicStateHeader } from '../components/overview/EconomicStateHeader'
import { KpiStrip } from '../components/overview/KpiStrip'
import { NowcastForecastBlock } from '../components/overview/NowcastForecastBlock'
import { QuickActions } from '../components/overview/QuickActions'
import { RiskPanel } from '../components/overview/RiskPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import {
  getInitialOverviewSourceState,
  loadOverviewSourceState,
} from '../data/overview/source'
import { beginRetry } from '../data/source-state'
import './overview.css'

export function OverviewPage() {
  const [sourceState, setSourceState] = useState(getInitialOverviewSourceState)

  useEffect(() => {
    let cancelled = false
    loadOverviewSourceState().then((state) => {
      if (!cancelled) {
        setSourceState(state)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetry() {
    setSourceState((prev) => beginRetry(prev))
    const nextState = await loadOverviewSourceState()
    setSourceState(nextState)
  }

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="overview-page">
        <PageHeader
          title="Overview"
          description="Decision-first macro snapshot designed to show what changed, why it matters, and where to test next."
        />
        <p className="empty-state" role="status" aria-live="polite">
          Loading latest overview snapshot...
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !sourceState.snapshot) {
    return (
      <PageContainer className="overview-page">
        <PageHeader
          title="Overview"
          description="Decision-first macro snapshot designed to show what changed, why it matters, and where to test next."
        />
        <p className="empty-state" role="status" aria-live="polite">
          {sourceState.error ?? 'Overview data is currently unavailable.'}
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

  const overviewData = sourceState.snapshot

  const {
    summary,
    generated_at,
    headline_metrics,
    nowcast_forecast,
    top_risks,
    analysis_actions,
    output_action,
  } = overviewData

  return (
    <PageContainer className="overview-page">
      <PageHeader
        title="Overview"
        description="Decision-first macro snapshot designed to show what changed, why it matters, and where to test next."
      />

      <EconomicStateHeader summary={summary} updatedAt={generated_at} outputAction={output_action} />

      <KpiStrip metrics={headline_metrics} />

      {nowcast_forecast ? (
        <div className="overview-two-column">
          <NowcastForecastBlock chart={nowcast_forecast} />
          <RiskPanel risks={top_risks} />
        </div>
      ) : null}

      <QuickActions actions={analysis_actions} />
    </PageContainer>
  )
}
