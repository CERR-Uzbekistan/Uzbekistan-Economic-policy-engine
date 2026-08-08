import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModelEquation } from '../../contracts/data-contract'

type EquationBlockProps = {
  equation: ModelEquation
  jsx?: ReactNode
}

export function EquationBlock({ equation, jsx }: EquationBlockProps) {
  const { t } = useTranslation()
  return (
    <div className="equation-block">
      <span className="eq-label">{equation.label}</span>
      {jsx ?? (
        <span
          className="ui-chip ui-chip--warn"
          aria-label={t('modelExplorer.equations.smePendingAria')}
        >
          {t('modelExplorer.equations.smePendingChip')}
        </span>
      )}
    </div>
  )
}
