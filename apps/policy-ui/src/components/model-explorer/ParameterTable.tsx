import { useTranslation } from 'react-i18next'
import type { ModelParameter } from '../../contracts/data-contract'
import { SymbolText } from './SymbolText.js'

type ParameterTableProps = {
  parameters: ModelParameter[]
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  const { t } = useTranslation()
  if (parameters.length === 0) {
    return <p className="empty-state">{t('modelExplorer.parameters.empty')}</p>
  }
  return (
    <table className="param-table">
      <thead>
        <tr>
          <th>{t('modelExplorer.parameters.symbol')}</th>
          <th>{t('modelExplorer.parameters.name')}</th>
          <th>{t('modelExplorer.parameters.value')}</th>
          <th>{t('modelExplorer.parameters.range')}</th>
        </tr>
      </thead>
      <tbody>
        {parameters.map((parameter) => (
          <tr key={`${parameter.symbol}-${parameter.name}`}>
            <td className="sym">
              <SymbolText text={parameter.symbol} />
            </td>
            <td>{parameter.name}</td>
            <td className={`val${parameter.inactive ? ' issue' : ''}`}>{parameter.value}</td>
            <td className="val">{parameter.range}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
