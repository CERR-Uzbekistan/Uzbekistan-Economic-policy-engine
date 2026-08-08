import { useTranslation } from 'react-i18next'
import type { OverviewSourceReference } from '../../contracts/data-contract.js'

type ReferencesFooterProps = {
  references: Array<string | OverviewSourceReference>
  exportedAt?: string
}

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

export function ReferencesFooter({ references, exportedAt }: ReferencesFooterProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  if (references.length === 0) {
    return null
  }

  return (
    <footer
      className="overview-references"
      aria-labelledby="overview-references-title"
    >
      <h2
        id="overview-references-title"
        className="overview-references__title"
      >
        {t('overview.references.title')}
      </h2>
      <details className="overview-references__details">
        <summary className="overview-references__summary">
          {t('overview.references.summary', {
            count: references.length,
            date: formatDate(exportedAt, locale),
          })}
        </summary>
        <ul className="overview-references__list">
          {references.map((reference) => {
            if (typeof reference === 'string') {
              return <li key={reference} className="overview-references__item">{reference}</li>
            }
            const key = `${reference.url ?? reference.label}|${reference.period}`
            return (
              <li key={key} className="overview-references__item">
                <div>
                  {reference.url ? (
                    <a href={reference.url} target="_blank" rel="noopener noreferrer">
                      {reference.label}
                    </a>
                  ) : (
                    reference.label
                  )}
                  {' · '}{reference.period}
                </div>
                {reference.observed_at ? (
                  <span className="overview-references__meta">
                    {t('overview.references.sourceDate', { date: formatDate(reference.observed_at, locale) })}
                  </span>
                ) : null}
                {reference.transformation ? (
                  <span className="overview-references__meta">{reference.transformation}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </details>
    </footer>
  )
}
