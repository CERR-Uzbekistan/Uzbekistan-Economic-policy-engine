import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EconomicStateHeader } from '../components/overview/EconomicStateHeader'
import { KpiStrip } from '../components/overview/KpiStrip'
import { NowcastForecastBlock } from '../components/overview/NowcastForecastBlock'
import { OverviewFeeds } from '../components/overview/OverviewFeeds'
import { QuickActions } from '../components/overview/QuickActions'
import { RiskPanel } from '../components/overview/RiskPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import {
  getInitialOverviewSourceState,
  loadOverviewSourceState,
} from '../data/overview/source'
import { beginRetry } from '../data/source-state'
import { setPageFreshness } from '../state/pageFreshness'
import './overview.css'

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

  const uniqueModelsInMetrics = useMemo(() => {
    const modelIds = headlineMetrics.flatMap((metric) =>
      metric.model_attribution.map((attribution) => attribution.model_id),
    )
    return Array.from(new Set(modelIds)).length
  }, [headlineMetrics])

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
  } = overviewData


  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('overview.meta.eyebrow')}</span>
      <span>
        <strong>{t('overview.meta.vintageLabel')}</strong> {t('overview.common.middleDot')}{' '}
        {formatDate(generated_at, locale)}
      </span>
      <span>
        <strong>{t('overview.meta.modelsLabel')}</strong> {t('overview.common.middleDot')}{' '}
        {t('overview.meta.modelsLive', { count: uniqueModelsInMetrics })}
      </span>
      {latestAttributionTimestamp ? (
        <span>
          <strong>{t('overview.meta.lastRefreshLabel')}</strong> {t('overview.common.middleDot')}{' '}
          {formatDate(latestAttributionTimestamp, locale)}
        </span>
      ) : null}
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
      />

      <KpiStrip metrics={headline_metrics} />

      {nowcast_forecast ? (
        <div className="overview-two-column">
          <NowcastForecastBlock chart={nowcast_forecast} />
          <RiskPanel risks={top_risks} />
        </div>
      ) : null}

      <QuickActions actions={analysis_actions} />
      <OverviewFeeds headlineMetrics={headline_metrics} />
    </PageContainer>
  )
}
