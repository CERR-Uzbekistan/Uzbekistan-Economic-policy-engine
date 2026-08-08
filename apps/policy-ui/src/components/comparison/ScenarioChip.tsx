import { useTranslation } from 'react-i18next'
import type { ScenarioRole } from '../../contracts/data-contract'

type ScenarioChipProps = {
  name: string
  role: ScenarioRole
  onRemove?: () => void
  removable?: boolean
}

const ROLE_COLOR_VAR: Record<ScenarioRole, string> = {
  baseline: 'var(--color-baseline)',
  alternative: 'var(--color-alternative)',
  downside: 'var(--color-downside)',
  upside: 'var(--color-upside)',
}

export function ScenarioChip({ name, role, onRemove, removable = true }: ScenarioChipProps) {
  const { t } = useTranslation()
  return (
    <span className="scenario-chip" data-role={role}>
      <span className="dot" style={{ background: ROLE_COLOR_VAR[role] }} aria-hidden="true" />
      {name}
      {removable && onRemove ? (
        <button
          type="button"
          className="close"
          aria-label={t('comparison.chip.remove', { name })}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  )
}
