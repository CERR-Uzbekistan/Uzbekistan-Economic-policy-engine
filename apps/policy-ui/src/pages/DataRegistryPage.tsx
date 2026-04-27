import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataRegistryContent } from '../components/data-registry/DataRegistryContent.js'
import { TrustStateLabel } from '../components/system/TrustStateLabel.js'
import {
  getInitialDataRegistry,
  loadDataRegistry,
  type DataRegistry,
} from '../data/data-registry/source.js'
import './data-registry.css'

export function DataRegistryPage() {
  const { t } = useTranslation()
  const [registry, setRegistry] = useState<DataRegistry | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDataRegistry().then((nextRegistry) => {
      if (!cancelled) {
        setRegistry(nextRegistry)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const effectiveRegistry = registry ?? getInitialDataRegistry()
  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('dataRegistry.header.eyebrow')}</span>
      <TrustStateLabel id="artifactGuardChecked" tone="success" />
      <span>
        {t('dataRegistry.header.meta.expectedArtifacts')} {t('overview.common.middleDot')}{' '}
        <strong>{effectiveRegistry.artifacts.length}</strong>
      </span>
      <span>
        {t('dataRegistry.header.meta.plannedFamilies')} {t('overview.common.middleDot')}{' '}
        <strong>{effectiveRegistry.summaryCounts.planned}</strong>
      </span>
      <span>
        {t('trustState.labels.registryGenerated')} {t('overview.common.middleDot')}{' '}
        <strong>{effectiveRegistry.generatedAt}</strong>
      </span>
    </>
  )

  return (
    <DataRegistryContent
      registry={effectiveRegistry}
      isLoading={!registry}
      title={t('pages.dataRegistry.title')}
      description={t('pages.dataRegistry.description')}
      loadingLabel={t('states.loading.dataRegistry')}
      pageHeaderMeta={pageHeaderMeta}
    />
  )
}
