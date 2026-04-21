import { useTranslation } from 'react-i18next'

type ReferencesFooterProps = {
  references: string[]
}

export function ReferencesFooter({ references }: ReferencesFooterProps) {
  const { t } = useTranslation()

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
      <ul className="overview-references__list">
        {references.map((reference) => (
          <li key={reference} className="overview-references__item">
            {reference}
          </li>
        ))}
      </ul>
    </footer>
  )
}
