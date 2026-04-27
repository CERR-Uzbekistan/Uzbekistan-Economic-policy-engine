import { useTranslation } from 'react-i18next'
import type { Caveat } from '../../contracts/data-contract'

type CaveatPanelProps = {
  caveats: Caveat[]
  exportedAt?: string
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return 'n/a'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed))
}

function uniqueCaveats(caveats: Caveat[]): Caveat[] {
  const seen = new Set<string>()
  const unique: Caveat[] = []
  for (const caveat of caveats) {
    const key = caveat.message.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(caveat)
  }
  return unique
}

function pluralKey(baseKey: string, count: number): string {
  return count === 1 ? baseKey : `${baseKey}Plural`
}

export function CaveatPanel({ caveats, exportedAt }: CaveatPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  if (caveats.length === 0) {
    return null
  }

  const sorted = uniqueCaveats(caveats).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
  const warningMetricCount = new Set(
    caveats
      .filter((caveat) => caveat.severity === 'warning' || caveat.severity === 'critical')
      .flatMap((caveat) => caveat.affected_metrics),
  ).size
  const noteCount = sorted.length

  return (
    <section className="overview-caveats overview-data-notes" aria-labelledby="overview-caveats-title">
      <div className="overview-caveats__head page-section-head">
        <h2 id="overview-caveats-title">{t('overview.dataNotes.title')}</h2>
        <p>{t('overview.dataNotes.description')}</p>
      </div>
      <details className="overview-data-notes__details">
        <summary className="overview-data-notes__summary">
          <span>
            {t(pluralKey('overview.dataNotes.warningMetricCount', warningMetricCount), {
              count: warningMetricCount,
            })}
          </span>
          <span>{t(pluralKey('overview.dataNotes.noteCount', noteCount), { count: noteCount })}</span>
          <span>{t('overview.dataNotes.exportedAt', { date: formatDate(exportedAt, locale) })}</span>
        </summary>
        <ul className="overview-caveats__list">
          {sorted.map((caveat) => (
            <li
              key={caveat.caveat_id}
              className={`overview-caveat overview-caveat--${caveat.severity}`}
            >
              <div className="overview-caveat__header">
                <span
                  className={`overview-caveat__severity overview-caveat__severity--${caveat.severity}`}
                >
                  {t(`overview.caveats.severity.${caveat.severity}`)}
                </span>
                {caveat.affected_models.length > 0 ? (
                  <span className="overview-caveat__models">
                    {caveat.affected_models.join(' · ')}
                  </span>
                ) : null}
              </div>
              <p className="overview-caveat__message">{caveat.message}</p>
              {caveat.affected_metrics.length > 0 ? (
                <p className="overview-caveat__metrics">
                  {t('overview.caveats.affectedMetrics', {
                    metrics: caveat.affected_metrics.join(', '),
                  })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
