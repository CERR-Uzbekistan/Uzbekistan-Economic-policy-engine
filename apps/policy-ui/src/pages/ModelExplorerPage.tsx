import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelCatalogCard } from '../components/model-explorer/ModelCatalogCard'
import { ModelDetail, type ModelExplorerTab } from '../components/model-explorer/ModelDetail'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { modelCatalogEntries, modelCatalogMeta } from '../data/mock/model-catalog'
import './model-explorer.css'

export function ModelExplorerPage() {
  const { t } = useTranslation()
  const [selectedModelId, setSelectedModelId] = useState(modelCatalogEntries[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState<ModelExplorerTab>('overview')

  const selectedEntry =
    modelCatalogEntries.find((entry) => entry.id === selectedModelId) ?? modelCatalogEntries[0]

  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('modelExplorer.header.eyebrow')}</span>
      <span>
        {t('modelExplorer.header.meta.modelsLabel')} {t('overview.common.middleDot')}{' '}
        <strong>
          {t('modelExplorer.header.meta.modelsLive', { count: modelCatalogMeta.models_live })}
        </strong>
      </span>
      <span>
        {t('modelExplorer.header.meta.lastAuditLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{modelCatalogMeta.last_calibration_audit_label}</strong>
      </span>
      <span>
        {t('modelExplorer.header.meta.openIssuesLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{modelCatalogMeta.open_methodology_issues}</strong>
      </span>
    </>
  )

  return (
    <PageContainer className="model-explorer-page">
      <PageHeader
        title={t('pages.modelExplorer.title')}
        description={t('pages.modelExplorer.description')}
        meta={pageHeaderMeta}
      />

      <div className="model-catalog">
        {modelCatalogEntries.map((entry) => (
          <ModelCatalogCard
            key={entry.id}
            entry={entry}
            isActive={entry.id === (selectedEntry?.id ?? '')}
            onSelect={() => {
              setSelectedModelId(entry.id)
              setActiveTab('overview')
            }}
          />
        ))}
      </div>

      {selectedEntry ? (
        <ModelDetail entry={selectedEntry} activeTab={activeTab} onTabChange={setActiveTab} />
      ) : (
        <p className="empty-state">{t('pages.modelExplorer.emptyState')}</p>
      )}
    </PageContainer>
  )
}
