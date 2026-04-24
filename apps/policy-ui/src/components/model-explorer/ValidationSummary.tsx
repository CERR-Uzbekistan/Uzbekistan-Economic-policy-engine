import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

type ValidationSummaryProps = {
  paragraphs: string[]
}

const SME_CONTENT_PENDING = '[SME content pending]'

export function ValidationSummary({ paragraphs }: ValidationSummaryProps) {
  const { t } = useTranslation()
  if (paragraphs.length === 0) {
    return null
  }
  return (
    <div className="validation-summary">
      {paragraphs.map((paragraph, index) =>
        paragraph === SME_CONTENT_PENDING ? (
          <p key={index}>
            <span
              className="ui-chip ui-chip--warn"
              aria-label={t('modelExplorer.validation.smePendingAria')}
            >
              {t('modelExplorer.validation.smePendingChip')}
            </span>
          </p>
        ) : (
          <Fragment key={index}>
            <p>{paragraph}</p>
          </Fragment>
        ),
      )}
    </div>
  )
}
