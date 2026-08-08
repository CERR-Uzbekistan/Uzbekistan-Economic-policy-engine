import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageContainer } from '../layout/PageContainer.js'
import { PageHeader } from '../layout/PageHeader.js'
import { TrustStateLabel } from '../system/TrustStateLabel.js'
import { REGISTRY_FILTERS, getFilteredRegistry } from '../../data/data-registry/source.js'
import type {
  DataRegistry,
  RegistryArtifact,
  RegistryFilter,
  RegistryRow,
  RegistryStatus,
  RegistryWarning,
} from '../../data/data-registry/source.js'

const STATUS_ORDER: RegistryStatus[] = ['valid', 'warning', 'failed', 'missing', 'unavailable', 'planned']

function statusClass(status: RegistryStatus): string {
  return `data-registry-status data-registry-status--${status}`
}

function formatRegistrySourceLabel(value: string, t: (key: string) => string): string {
  if (value.includes('/data/overview.json')) return t('dataRegistry.sourceLabels.overview')
  if (value.includes('/data/qpm.json') || value === 'qpm') return t('dataRegistry.sourceLabels.qpm')
  if (value.includes('/data/dfm.json') || value.includes('dfm_nowcast')) return t('dataRegistry.sourceLabels.dfm')
  if (value.includes('/data/io.json') || value.includes('io_model') || value.includes('mcp_server')) {
    return t('dataRegistry.sourceLabels.io')
  }
  if (value.includes('/data/knowledge-hub.json')) return t('dataRegistry.sourceLabels.knowledgeHub')
  return value
}

function formatRegistrySystemLabel(value: string, t: (key: string) => string): string {
  if (value === 'overview_artifact') return t('dataRegistry.sourceLabels.overviewSystem')
  if (value === 'qpm') return t('dataRegistry.sourceLabels.qpmSystem')
  if (value.includes('dfm')) return t('dataRegistry.sourceLabels.dfmSystem')
  if (value.includes('I-O')) return value
  return value
}

export function DataRegistryContent(props: {
  registry: DataRegistry
  isLoading?: boolean
  title: string
  description: string
  loadingLabel: string
  pageHeaderMeta?: ReactNode
}) {
  const { t } = useTranslation()
  const { registry, isLoading = false, title, description, loadingLabel, pageHeaderMeta } = props
  const [activeFilter, setActiveFilter] = useState<RegistryFilter>('all')
  const visibleRegistry = getFilteredRegistry(registry, activeFilter)

  return (
    <PageContainer className="data-registry-page">
      <PageHeader title={title} description={description} meta={pageHeaderMeta} />

      {isLoading ? (
        <p className="empty-state" role="status" aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}

      <section className="data-registry-summary" aria-label={t('dataRegistry.summary.aria')}>
        {STATUS_ORDER.map((status) => (
          <div className="data-registry-summary__item" key={status}>
            <span className={statusClass(status)}>{t(`dataRegistry.status.${status}`)}</span>
            <strong>{registry.summaryCounts[status]}</strong>
          </div>
        ))}
      </section>

      <section className="data-registry-filters" aria-label={t('dataRegistry.filters.aria')}>
        {REGISTRY_FILTERS.map((filter) => (
          <button
            type="button"
            key={filter}
            className="data-registry-filter"
            aria-pressed={filter === activeFilter}
            onClick={() => setActiveFilter(filter)}
          >
            {t(`dataRegistry.filters.${filter}`)}
          </button>
        ))}
      </section>

      <section
        className="data-registry-status-matrix"
        aria-label={t('dataRegistry.sections.bridgeOutputs.title')}
      >
        {visibleRegistry.artifacts.map((artifact) => (
          <article className="data-registry-status-card" key={`matrix-${artifact.id}`}>
            <div className="data-registry-status-card__head">
              <h2>{artifact.modelArea}</h2>
              <span className={statusClass(artifact.status)}>{t(`dataRegistry.status.${artifact.status}`)}</span>
            </div>
            <dl>
              <div>
                <dt>{t('dataRegistry.artifact.sourceVintage')}</dt>
                <dd>{artifact.sourceVintage}</dd>
              </div>
              <div>
                <dt>{t('dataRegistry.artifact.exportTimestamp')}</dt>
                <dd>{artifact.exportTimestamp}</dd>
              </div>
              <div>
                <dt>{t('dataRegistry.artifact.lastValidationCheck')}</dt>
                <dd>{registry.generatedAt}</dd>
              </div>
            </dl>
            <p>{artifact.statusDetail}</p>
          </article>
        ))}
        {visibleRegistry.artifacts.length === 0 ? (
          <p className="empty-state">{t('dataRegistry.filters.empty')}</p>
        ) : null}
      </section>

      <section className="data-registry-legend" aria-labelledby="data-registry-legend-title">
        <h2 id="data-registry-legend-title">{t('dataRegistry.legend.title')}</h2>
        <dl>
          <div>
            <dt><TrustStateLabel id="artifactGuardChecked" tone="success" /></dt>
            <dd>{t('dataRegistry.legend.valid.description')}</dd>
          </div>
          <div>
            <dt>{t('dataRegistry.legend.warning.label')}</dt>
            <dd>{t('dataRegistry.legend.warning.description')}</dd>
          </div>
          <div>
            <dt><TrustStateLabel id="planned" tone="warn" /></dt>
            <dd>{t('dataRegistry.legend.planned.description')}</dd>
          </div>
          <div>
            <dt><TrustStateLabel id="lastValidationCheck" /></dt>
            <dd>{t('dataRegistry.legend.lastValidationCheck.description')}</dd>
          </div>
        </dl>
      </section>

      <RegistrySection
        title={t('dataRegistry.sections.dataSources.title')}
        description={t('dataRegistry.sections.dataSources.description')}
      >
        <RegistryTable rows={visibleRegistry.dataSources} />
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.modelInputs.title')}
        description={t('dataRegistry.sections.modelInputs.description')}
      >
        <RegistryTable rows={visibleRegistry.modelInputs} />
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.bridgeOutputs.title')}
        description={t('dataRegistry.sections.bridgeOutputs.description')}
      >
        <RegistryTable rows={visibleRegistry.bridgeOutputs} />
        <div className="data-registry-artifacts">
          {visibleRegistry.artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} generatedAt={visibleRegistry.generatedAt} />
          ))}
        </div>
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.plannedArtifacts.title')}
        description={t('dataRegistry.sections.plannedArtifacts.description')}
      >
        <PlannedArtifactCards rows={visibleRegistry.plannedArtifacts} />
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.vintages.title')}
        description={t('dataRegistry.sections.vintages.description')}
      >
        <p className="data-registry-note">{t('dataRegistry.vintages.boundary')}</p>
        <RegistryTable rows={visibleRegistry.vintages} />
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.validation.title')}
        description={t('dataRegistry.sections.validation.description')}
      >
        <RegistryTable rows={visibleRegistry.updateStatuses} />
      </RegistrySection>

      <RegistrySection
        title={t('dataRegistry.sections.warnings.title')}
        description={t('dataRegistry.sections.warnings.description')}
      >
        <WarningsList warnings={visibleRegistry.warnings} />
      </RegistrySection>
    </PageContainer>
  )
}

function RegistrySection(props: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="data-registry-section">
      <div className="page-section-head">
        <h2>{props.title}</h2>
        <p>{props.description}</p>
      </div>
      {props.children}
    </section>
  )
}

function RegistryTable({ rows }: { rows: RegistryRow[] }) {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return <p className="empty-state">{t('dataRegistry.filters.empty')}</p>
  }

  return (
    <div className="data-registry-table-wrap">
      <table className="data-registry-table">
        <thead>
          <tr>
            <th>{t('dataRegistry.table.type')}</th>
            <th>{t('dataRegistry.table.domain')}</th>
            <th>{t('dataRegistry.table.status')}</th>
            <th>{t('dataRegistry.table.vintage')}</th>
            <th>{t('dataRegistry.table.export')}</th>
            <th>{t('dataRegistry.table.source')}</th>
            <th>{t('dataRegistry.table.owner')}</th>
            <th>{t('dataRegistry.table.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.id}-${row.label}-${row.domain}`}>
              <td>{t(`dataRegistry.registryType.${row.registryType}`)}</td>
              <th scope="row">
                <span>{row.label}</span>
                <small>{row.domain}</small>
              </th>
              <td>
                <span className={statusClass(row.status)}>{t(`dataRegistry.status.${row.status}`)}</span>
              </td>
              <td>{row.dataVintage}</td>
              <td>{row.exportTimestamp}</td>
              <td>
                <span>{formatRegistrySourceLabel(row.source, t)}</span>
                <small>{formatRegistrySystemLabel(row.sourceSystem, t)}</small>
              </td>
              <td>{row.owner}</td>
              <td>
                <span>{row.notes}</span>
                <details className="data-registry-row-detail">
                  <summary>{t('dataRegistry.detail.summary')}</summary>
                  <dl>
                    <div>
                      <dt>{t('dataRegistry.detail.validationScope')}</dt>
                      <dd>{row.validationScope}</dd>
                    </div>
                    <div>
                      <dt>{t('dataRegistry.detail.freshnessRule')}</dt>
                      <dd>{row.freshnessRule}</dd>
                    </div>
                    <div>
                      <dt>{t('dataRegistry.detail.caveats')}</dt>
                      <dd>{row.caveats}</dd>
                    </div>
                    <div>
                      <dt>{t('dataRegistry.detail.sourceVsExport')}</dt>
                      <dd>{row.sourceExportExplanation}</dd>
                    </div>
                  </dl>
                </details>
                {row.modelExplorerHref ? (
                  <Link className="data-registry-inline-link" to={row.modelExplorerHref}>
                    {t('dataRegistry.links.modelExplorer')}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArtifactCard({ artifact, generatedAt }: { artifact: RegistryArtifact; generatedAt: string }) {
  const { t } = useTranslation()

  return (
    <article className="data-registry-artifact">
      <div className="data-registry-artifact__head">
        <div>
          <p className="data-registry-artifact__path">{formatRegistrySourceLabel(artifact.artifactPath, t)}</p>
          <h3>{artifact.modelArea}</h3>
        </div>
        <span className={statusClass(artifact.status)}>{t(`dataRegistry.status.${artifact.status}`)}</span>
      </div>

      <p className="data-registry-artifact__detail">{artifact.statusDetail}</p>

      <dl className="data-registry-facts">
        <div>
          <dt>{t('dataRegistry.artifact.dataVintage')}</dt>
          <dd>{artifact.dataVintage}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.exportTimestamp')}</dt>
          <dd>{artifact.exportTimestamp}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.sourceVintage')}</dt>
          <dd>{artifact.sourceVintage}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.lastValidationCheck')}</dt>
          <dd>{generatedAt}</dd>
        </div>
        {artifact.checksum ? (
          <div>
            <dt>{t('dataRegistry.artifact.checksum')}</dt>
            <dd>{artifact.checksum}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('dataRegistry.artifact.owner')}</dt>
          <dd>{artifact.owner}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.sourceSystem')}</dt>
          <dd>{formatRegistrySystemLabel(artifact.sourceSystem, t)}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.solver')}</dt>
          <dd>{artifact.solverVersion}</dd>
        </div>
        <div>
          <dt>{t('dataRegistry.artifact.caveats')}</dt>
          <dd>
            {artifact.caveatCount} {t('overview.common.middleDot')} {artifact.highestCaveatSeverity}
          </dd>
        </div>
        {artifact.facts.map((fact) => (
          <div key={`${artifact.id}-${fact.label}`}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {artifact.issues.length > 0 ? (
        <ul className="data-registry-issues">
          {artifact.issues.map((issue) => (
            <li key={`${issue.path}-${issue.message}`}>
              <strong>{issue.path}</strong>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="data-registry-detail">
        <summary>{t('dataRegistry.detail.summary')}</summary>
        <dl>
          <div>
            <dt>{t('dataRegistry.detail.validationScope')}</dt>
            <dd>{artifact.validationScope}</dd>
          </div>
          <div>
            <dt>{t('dataRegistry.detail.freshnessRule')}</dt>
            <dd>{artifact.freshnessRule}</dd>
          </div>
          <div>
            <dt>{t('dataRegistry.detail.caveats')}</dt>
            <dd>{artifact.caveatsSummary}</dd>
          </div>
          <div>
            <dt>{t('dataRegistry.detail.sourceVsExport')}</dt>
            <dd>{artifact.sourceExportExplanation}</dd>
          </div>
        </dl>
      </details>

      <div className="data-registry-consumers" aria-label={t('dataRegistry.artifact.consumers')}>
        {artifact.consumers.map((consumer) => (
          <Link key={consumer.href} to={consumer.href}>
            {consumer.label}
          </Link>
        ))}
      </div>
    </article>
  )
}

function PlannedArtifactCards({ rows }: { rows: RegistryRow[] }) {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return <p className="empty-state">{t('dataRegistry.filters.empty')}</p>
  }

  return (
    <div className="data-registry-planned">
      {rows.map((row) => (
        <article className="data-registry-planned-card" key={`planned-${row.id}`}>
          <div className="data-registry-artifact__head">
            <div>
              <p className="data-registry-artifact__path">{t(`dataRegistry.registryType.${row.registryType}`)}</p>
              <h3>{row.label}</h3>
            </div>
            <span className={statusClass(row.status)}>{t(`dataRegistry.status.${row.status}`)}</span>
          </div>
          <dl className="data-registry-facts">
            <div>
              <dt>{t('dataRegistry.table.owner')}</dt>
              <dd>{row.owner}</dd>
            </div>
            <div>
              <dt>{t('dataRegistry.table.source')}</dt>
              <dd>{row.source}</dd>
            </div>
            <div>
              <dt>{t('dataRegistry.table.vintage')}</dt>
              <dd>{row.dataVintage}</dd>
            </div>
            <div>
              <dt>{t('dataRegistry.table.export')}</dt>
              <dd>{row.exportTimestamp}</dd>
            </div>
          </dl>
          <p className="data-registry-artifact__detail">{row.notes}</p>
          <details className="data-registry-detail">
            <summary>{t('dataRegistry.detail.summary')}</summary>
            <dl>
              <div>
                <dt>{t('dataRegistry.detail.validationScope')}</dt>
                <dd>{row.validationScope}</dd>
              </div>
              <div>
                <dt>{t('dataRegistry.detail.freshnessRule')}</dt>
                <dd>{row.freshnessRule}</dd>
              </div>
              <div>
                <dt>{t('dataRegistry.detail.caveats')}</dt>
                <dd>{row.caveats}</dd>
              </div>
              <div>
                <dt>{t('dataRegistry.detail.sourceVsExport')}</dt>
                <dd>{row.sourceExportExplanation}</dd>
              </div>
            </dl>
          </details>
        </article>
      ))}
    </div>
  )
}

function WarningsList({ warnings }: { warnings: RegistryWarning[] }) {
  const { t } = useTranslation()

  if (warnings.length === 0) {
    return <p className="empty-state">{t('dataRegistry.warnings.empty')}</p>
  }

  return (
    <ul className="data-registry-warning-list">
      {warnings.map((warning) => (
        <li key={warning.id}>
          <span className={statusClass(warning.status)}>{t(`dataRegistry.status.${warning.status}`)}</span>
          <div>
            <strong>{warning.title}</strong>
            <p>{warning.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
