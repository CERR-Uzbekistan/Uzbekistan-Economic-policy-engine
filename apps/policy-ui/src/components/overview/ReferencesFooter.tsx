import { useTranslation } from 'react-i18next'

type ReferencesFooterProps = {
  references: string[]
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
          {references.map((reference) => (
            <li key={reference} className="overview-references__item">
              {reference}
            </li>
          ))}
        </ul>
      </details>
    </footer>
  )
}
