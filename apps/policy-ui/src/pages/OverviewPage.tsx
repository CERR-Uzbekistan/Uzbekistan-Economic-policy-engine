import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaveatPanel } from '../components/overview/CaveatPanel'
import { EconomicStateHeader } from '../components/overview/EconomicStateHeader'
import { IndicatorPanelGrid } from '../components/overview/IndicatorPanelGrid'
import { KpiStrip } from '../components/overview/KpiStrip'
import { NowcastForecastBlock } from '../components/overview/NowcastForecastBlock'
import { OverviewFeeds } from '../components/overview/OverviewFeeds'
import { QuickActions } from '../components/overview/QuickActions'
import { ReferencesFooter } from '../components/overview/ReferencesFooter'
import { RiskPanel } from '../components/overview/RiskPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { TrustStateLabel } from '../components/system/TrustStateLabel'
import {
  getInitialOverviewSourceState,
  loadOverviewSourceState,
} from '../data/overview/source'
import { buildOverviewMacroPulseTokens } from '../data/overview/macro-pulse'
import {
  buildArtifactAlignedNowcastChart,
  shouldUseDfmNowcastChart,
} from '../data/overview/nowcast-chart-selection'
import { useDfmNowcast } from '../data/overview/useDfmNowcast'
import { NowcastBanner, type NowcastBannerErrorKind } from '../components/overview/NowcastBanner'
import { DfmTransportError, DfmValidationError } from '../data/bridge/dfm-client'
import { beginRetry } from '../data/source-state'
import { setPageFreshness } from '../state/pageFreshness'
import './overview.css'

function dfmErrorKind(error: DfmTransportError | DfmValidationError): NowcastBannerErrorKind {
  return error instanceof DfmValidationError ? 'validation' : 'transport'
}

function dfmErrorDetail(error: DfmTransportError | DfmValidationError): string | undefined {
  if (error instanceof DfmTransportError) {
    if (error.kind === 'http' && error.status !== null) {
      return `HTTP ${error.status}`
    }
    return error.kind
  }
  const issue = error.issues[0]
  if (issue) {
    return `${issue.path || 'payload'}: ${issue.message}`
  }
  return undefined
}

function toEpoch(timestamp: string): number {
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function formatDate(value: string, locale: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return value
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed))
}

export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [sourceState, setSourceState] = useState(getInitialOverviewSourceState)
  const overviewData = sourceState.snapshot
  const headlineMetrics = useMemo(() => overviewData?.headline_metrics ?? [], [overviewData])
  const { state: dfmState, refetch: refetchDfm } = useDfmNowcast()

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

  const latestAttributionTimestamp = useMemo(() => {
    const timestamps = headlineMetrics.flatMap((metric) =>
      metric.model_attribution.map((attribution) => attribution.timestamp),
    )
    if (timestamps.length === 0) {
      return null
    }
    return timestamps.reduce((latest, current) => (toEpoch(current) > toEpoch(latest) ? current : latest))
  }, [headlineMetrics])

  useEffect(() => {
    if (sourceState.status !== 'ready' || !overviewData || !latestAttributionTimestamp) {
      setPageFreshness(null)
      return () => {
        setPageFreshness(null)
      }
    }
    const ageInDays = Math.max(0, Math.floor((Date.now() - Date.parse(latestAttributionTimestamp)) / 86_400_000))
    setPageFreshness({ ageInDays })
    return () => {
      setPageFreshness(null)
    }
  }, [latestAttributionTimestamp, overviewData, sourceState.status])

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="overview-page">
        <PageHeader title={t('pages.overview.title')} description={t('pages.overview.description')} />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.overview')}
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !overviewData) {
    return (
      <PageContainer className="overview-page">
        <PageHeader title={t('pages.overview.title')} description={t('pages.overview.description')} />
        <p className="empty-state" role="alert">
          {sourceState.error ?? t('states.error.overviewUnavailable')}
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

  const {
    summary,
    generated_at,
    model_ids,
    headline_metrics,
    nowcast_forecast,
    top_risks,
    analysis_actions,
    output_action,
    caveats,
    references,
    activity_feed,
    provenance,
    indicator_groups,
    artifact_summary_metrics,
  } = overviewData

  const artifactProvisionalCount = new Set(
    indicator_groups
      ?.flatMap((group) => group.metrics)
      .filter((metric) => metric.validation_status === 'warning')
      .map((metric) => metric.metric_id) ?? [],
  ).size
  const overviewNowcastMetrics = [...(artifact_summary_metrics ?? []), ...headline_metrics]
  const macroPulseTokens = buildOverviewMacroPulseTokens(overviewNowcastMetrics, locale, t)
  const artifactAlignedNowcastChart = buildArtifactAlignedNowcastChart(overviewNowcastMetrics)
  const useLiveDfmNowcastChart =
    dfmState.status === 'bridge' && shouldUseDfmNowcastChart(dfmState.chart, overviewNowcastMetrics)
  const displayedNowcastChart =
    useLiveDfmNowcastChart ? dfmState.chart : artifactAlignedNowcastChart ?? nowcast_forecast
  const displayedNowcastTrustId = useLiveDfmNowcastChart
    ? 'liveBridgeJson'
    : sourceState.sourceKind === 'overview-artifact'
      ? 'overviewArtifact'
      : 'fallbackMock'

  const pageHeaderMeta = (
    <>
      <TrustStateLabel
        id={
          sourceState.sourceKind === 'overview-artifact'
            ? 'overviewArtifact'
            : sourceState.sourceKind === 'static-fallback'
              ? 'staticOverviewFallback'
              : 'liveBridgeJson'
        }
        tone={sourceState.sourceKind === 'overview-artifact' ? 'success' : 'neutral'}
      />
      <span>
        <strong>{t('overview.meta.vintageLabel')}</strong> {t('overview.common.middleDot')}{' '}
        {formatDate(generated_at, locale)}
      </span>
    </>
  )

  return (
    <PageContainer className="overview-page">
      <PageHeader title={t('pages.overview.title')} description={t('pages.overview.description')} meta={pageHeaderMeta} />

      <EconomicStateHeader
        summary={summary}
        updatedAt={generated_at}
        modelIds={model_ids}
        outputAction={output_action}
        provenance={provenance}
        artifactSummaryMetrics={artifact_summary_metrics}
        artifactProvisionalCount={artifactProvisionalCount}
        isArtifactMode={sourceState.sourceKind === 'overview-artifact'}
        macroPulseTokens={macroPulseTokens}
      />

      <KpiStrip metrics={headline_metrics} />

      <div className="overview-two-column overview-two-column--operations">
        <RiskPanel risks={top_risks} />
        <QuickActions actions={analysis_actions} />
      </div>

      {nowcast_forecast ? (
        <div className="overview-nowcast-column">
          {dfmState.status === 'degraded' ? (
            <NowcastBanner
              errorKind={dfmErrorKind(dfmState.error)}
              errorDetail={dfmErrorDetail(dfmState.error)}
              onRetry={refetchDfm}
            />
          ) : null}
          <NowcastForecastBlock
            chart={displayedNowcastChart}
            headerSlot={
              <TrustStateLabel
                id={displayedNowcastTrustId}
                tone={useLiveDfmNowcastChart ? 'success' : 'warn'}
              />
            }
            statusSlot={
              dfmState.status === 'loading' ? (
                <p className="overview-nowcast-refreshing" role="status" aria-live="polite">
                  {t('overview.nowcast.refreshing')}
                </p>
              ) : null
            }
          />
        </div>
      ) : null}

      <IndicatorPanelGrid groups={indicator_groups} />

      <CaveatPanel caveats={caveats} exportedAt={generated_at} />
      <OverviewFeeds activityFeed={activity_feed} />
      <ReferencesFooter references={references} exportedAt={generated_at} />
    </PageContainer>
  )
}
