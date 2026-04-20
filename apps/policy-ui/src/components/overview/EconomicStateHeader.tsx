import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { OverviewOutputAction } from '../../contracts/data-contract.js'
import type { LanguageCode } from '../../state/language-context.js'
import { useLanguage } from '../../state/useLanguage.js'

type EconomicStateHeaderProps = {
  summary: string
  updatedAt: string
  modelIds: string[]
  outputAction: OverviewOutputAction
  reviewerInfo?: { reviewerName: string; reviewedAt: string }
}

const LOCALE_BY_LANGUAGE: Record<LanguageCode, string> = {
  en: 'en-GB',
  ru: 'ru-RU',
  uz: 'uz-UZ',
}

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

export function EconomicStateHeader({
  summary,
  updatedAt,
  modelIds,
  outputAction,
  reviewerInfo,
}: EconomicStateHeaderProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const locale = LOCALE_BY_LANGUAGE[language]
  const renderedModelList = modelIds.map(toModelCode).filter(Boolean).join(' + ')
  const modelList = renderedModelList.length > 0 ? renderedModelList : t('overview.header.modelListFallback')
  const formattedUpdatedAt = formatDateTime(updatedAt, locale)

  return (
    <section className="state-header overview-state-header" aria-labelledby="overview-state-header-title">
      <p id="overview-state-header-title" className="overview-section-kicker">
        {t('overview.header.kicker')}
      </p>
      <div className="state-header__body overview-state-header__body">
        <p className="overview-state-header__summary">{summary}</p>
        <Link className="ui-secondary-action" to={outputAction.target_href}>
          {outputAction.title}
        </Link>
      </div>
      <p className="state-header__meta overview-state-header__meta">
        <span>{t('overview.header.draftedFrom', { models: modelList })}</span>
        <span>{t('overview.header.updatedAt', { date: formattedUpdatedAt })}</span>
      </p>
      {/* TA-9 / TB-P3 gate: reviewerInfo is intentionally not rendered until governance adoption. */}
      {reviewerInfo ? null : null}
    </section>
  )
}
