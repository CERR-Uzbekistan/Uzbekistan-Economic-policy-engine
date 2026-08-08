import { useTranslation } from 'react-i18next'
import { getTrustStateLabelKey, type TrustStateLabelId, type TrustStateTone } from './trust-state-labels.js'

type TrustStateLabelProps = {
  id: TrustStateLabelId
  tone?: TrustStateTone
  className?: string
}

export function TrustStateLabel({ id, tone = 'neutral', className }: TrustStateLabelProps) {
  const { t } = useTranslation()
  const classes = ['trust-state-label', `trust-state-label--${tone}`, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{t(getTrustStateLabelKey(id))}</span>
}
