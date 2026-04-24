import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type {
  NarrativeSegment,
  OverviewOutputAction,
  StateProvenance,
} from '../../contracts/data-contract.js'
import type { LanguageCode } from '../../state/language-context.js'
import { useLanguage } from '../../state/useLanguage.js'

type EconomicStateHeaderProps = {
  summary: string | NarrativeSegment[]
  updatedAt: string
  modelIds: string[]
  outputAction: OverviewOutputAction
  provenance?: StateProvenance
}

const LOCALE_BY_LANGUAGE: Record<LanguageCode, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
  uz: 'uz-UZ',
}

const SME_CONTENT_PENDING = '[SME content pending]'

function formatDateTime(value: string, locale: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function toModelCode(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized) {
    return ''
  }
  const compact = normalized.toUpperCase()
  if (/^[A-Z0-9]{2,8}$/.test(compact)) {
    return compact
  }
  const head = normalized.split(/[_-\s]+/).find(Boolean) ?? normalized
  return head.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function renderSummary(summary: string | NarrativeSegment[]) {
  if (typeof summary === 'string') {
    return summary
  }
  return summary.map((segment, index) =>
    segment.emphasize ? (
      <em key={index}>{segment.text}</em>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    ),
  )
}

export function EconomicStateHeader({
  summary,
  updatedAt,
  modelIds,
  outputAction,
  provenance,
}: EconomicStateHeaderProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const locale = LOCALE_BY_LANGUAGE[language]
  const renderedModelList = modelIds.map(toModelCode).filter(Boolean).join(' + ')
  const modelList = renderedModelList.length > 0 ? renderedModelList : t('overview.header.modelListFallback')
  const formattedUpdatedAt = formatDateTime(updatedAt, locale)

  const draftedFrom = provenance?.drafted_from ?? modelList
  const reviewDate = provenance?.reviewed_at ?? ''
  const reviewerName = provenance?.reviewer_name ?? ''
  const reviewerIsSentinel = reviewerName === SME_CONTENT_PENDING
  const hasReviewerName = reviewerName.length > 0 && !reviewerIsSentinel
  const provenanceAssistedLabel = provenance?.ai_assisted
    ? t('overview.header.provenance.aiAssisted')
    : t('overview.header.provenance.humanAuthored')

  return (
    <section className="state-header overview-state-header" aria-labelledby="overview-state-header-title">
      <p id="overview-state-header-title" className="overview-section-kicker">
        {t('overview.header.kicker')}
      </p>
      <div className="state-header__body overview-state-header__body">
        <p className="overview-state-header__summary">{renderSummary(summary)}</p>
        <Link className="ui-secondary-action" to={outputAction.target_href}>
          {outputAction.title}
        </Link>
      </div>
      {provenance ? (
        <div className="state-header__provenance overview-state-header__provenance">
          <p className="overview-state-header__provenance-line">
            {t('overview.header.provenance.draftedFromLabel')}{' '}
            {t('overview.common.middleDot')} {draftedFrom}
          </p>
          <p className="overview-state-header__provenance-line">
            {provenanceAssistedLabel}
            {reviewDate ? (
              <>
                {' '}
                {t('overview.common.middleDot')}{' '}
                {t('overview.header.provenance.reviewedAt', { date: reviewDate })}
              </>
            ) : null}{' '}
            {t('overview.common.middleDot')}{' '}
            {hasReviewerName ? (
              reviewerName
            ) : (
              <span className="ui-chip ui-chip--warn" aria-label={t('overview.header.provenance.reviewerPendingAria')}>
                {t('overview.header.provenance.reviewerPendingChip')}
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="state-header__meta overview-state-header__meta">
          <span>{t('overview.header.draftedFrom', { models: modelList })}</span>
          <span>{t('overview.header.updatedAt', { date: formattedUpdatedAt })}</span>
        </p>
      )}
    </section>
  )
}
