import { useTranslation } from 'react-i18next'

export type NowcastBannerErrorKind = 'transport' | 'validation'

type NowcastBannerProps = {
  errorKind: NowcastBannerErrorKind
  errorDetail?: string
  onRetry: () => void
}

export function NowcastBanner({ errorKind, errorDetail, onRetry }: NowcastBannerProps) {
  const { t } = useTranslation()
  const technicalLine = errorDetail
    ? `${errorKind}: ${errorDetail}`
    : errorKind

  return (
    <div className="overview-nowcast-banner" role="alert">
      <div className="overview-nowcast-banner__body">
        <p className="overview-nowcast-banner__title">{t('overview.nowcast.banner.title')}</p>
        <p className="overview-nowcast-banner__subtitle">{t('overview.nowcast.banner.subtitle')}</p>
        <p className="overview-nowcast-banner__detail">{technicalLine}</p>
      </div>
      <button type="button" className="ui-secondary-action" onClick={onRetry}>
        {t('overview.nowcast.banner.retry')}
      </button>
    </div>
  )
}
