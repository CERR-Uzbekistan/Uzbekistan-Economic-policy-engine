import { useTranslation } from 'react-i18next'
import type { ModelDataSource } from '../../contracts/data-contract'

type DataSourceListProps = {
  dataSources: ModelDataSource[]
}

export function DataSourceList({ dataSources }: DataSourceListProps) {
  const { t } = useTranslation()
  if (dataSources.length === 0) {
    return <p className="empty-state">{t('modelExplorer.dataSources.empty')}</p>
  }
  return (
    <div className="source-list">
      {dataSources.map((source, index) => (
        <div key={`${source.institution}-${index}`} className="source-item">
          <span className="inst">{source.institution}</span>
          <span className="desc">{source.description}</span>
          <span className="vintage">{source.vintage_label}</span>
        </div>
      ))}
    </div>
  )
}
