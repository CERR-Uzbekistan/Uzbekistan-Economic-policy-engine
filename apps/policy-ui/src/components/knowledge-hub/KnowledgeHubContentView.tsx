import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type {
  KnowledgeHubContent,
  ReformPackage,
  ReformPackageMilestone,
  ReformPackageSourceEvent,
} from '../../contracts/data-contract.js'

type KnowledgeHubContentViewProps = {
  content: KnowledgeHubContent
}

type TrackerTab = 'packages' | 'timeline'
type LabelNamespace = 'sourceConfidence' | 'eventType' | 'evidenceType'

type TimelineMilestone = {
  milestone: ReformPackageMilestone
  reformPackage: ReformPackage
  sourceEvent: ReformPackageSourceEvent | undefined
}

function dateSortKey(value: string): string {
  if (/^\d{4}$/.test(value)) return `${value}-01-01`
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  return value
}

function formatDisplayDate(value: string | undefined): string {
  if (!value) return 'n/a'
  if (/^\d{4}$/.test(value)) return value
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function milestonePeriod(milestone: ReformPackageMilestone): string {
  if (milestone.date_precision === 'year') return milestone.date
  const parsed = new Date(dateSortKey(milestone.date))
  if (!Number.isFinite(parsed.getTime())) return milestone.date
  const year = parsed.getUTCFullYear()
  const quarter = Math.floor(parsed.getUTCMonth() / 3) + 1
  return `${year} Q${quarter}`
}

function sourceById(reformPackage: ReformPackage, id: string): ReformPackageSourceEvent | undefined {
  return reformPackage.official_source_events.find((event) => event.id === id)
}

function flattenMilestones(packages: ReformPackage[]): TimelineMilestone[] {
  return packages
    .flatMap((reformPackage) =>
      reformPackage.implementation_milestones.map((milestone) => ({
        milestone,
        reformPackage,
        sourceEvent: sourceById(reformPackage, milestone.source_event_ids[0] ?? ''),
      })),
    )
    .sort((left, right) => dateSortKey(left.milestone.date).localeCompare(dateSortKey(right.milestone.date)))
}

function groupMilestones(items: TimelineMilestone[]): Array<[string, TimelineMilestone[]]> {
  const groups = new Map<string, TimelineMilestone[]>()
  for (const item of items) {
    const key = milestonePeriod(item.milestone)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return Array.from(groups.entries())
}

function trackerLabel(t: TFunction, namespace: LabelNamespace, value: string): string {
  return t(`knowledgeHub.reformTracker.labels.${namespace}.${value}`)
}

function MetricStrip({ content, packages }: { content: KnowledgeHubContent; packages: ReformPackage[] }) {
  const { t } = useTranslation()
  const sourceDiagnostics = content.source_diagnostics ?? []
  const sourceEvents = packages.flatMap((item) => item.official_source_events)
  const verifiedLinks = sourceEvents.filter((event) => event.source_url_status === 'verified').length
  const referenceTime = content.generated_at ? Date.parse(content.generated_at) : Number.NEGATIVE_INFINITY
  const upcomingMilestones = flattenMilestones(packages).filter(
    (item) => new Date(dateSortKey(item.milestone.date)).getTime() >= referenceTime,
  ).length
  const metrics = [
    [t('knowledgeHub.reformTracker.metrics.activePackages'), String(packages.length)],
    [t('knowledgeHub.reformTracker.metrics.upcomingMilestones'), String(upcomingMilestones)],
    [t('knowledgeHub.reformTracker.metrics.officialSources'), String(content.meta.sources_configured ?? sourceDiagnostics.length)],
    [t('knowledgeHub.reformTracker.metrics.verifiedLinks'), String(verifiedLinks)],
    [t('knowledgeHub.reformTracker.metrics.lastFetch'), formatDisplayDate(content.generated_at)],
  ]

  return (
    <section aria-label={t('knowledgeHub.reformTracker.metrics.aria')} className="tracker-summary">
      {metrics.map(([label, value]) => (
        <div key={label}>
          <span className="tracker-summary__value">{value}</span>
          <span className="tracker-summary__label">{label}</span>
        </div>
      ))}
    </section>
  )
}

function DossierPanel({ reformPackage }: { reformPackage: ReformPackage }) {
  const { t } = useTranslation()
  const sourceEvent = reformPackage.official_source_events[0]

  return (
    <aside className="reform-dossier" aria-label={t('knowledgeHub.reformTracker.dossier.aria')}>
      <div className="reform-dossier__head">
        <span className="ui-chip ui-chip--accent">{reformPackage.current_stage}</span>
        <h2>{reformPackage.title}</h2>
        <p>{reformPackage.policy_area}</p>
      </div>
      <dl className="reform-dossier__meta">
        <div>
          <dt>{t('knowledgeHub.reformTracker.dossier.status')}</dt>
          <dd>{`${reformPackage.current_stage} · ${formatDisplayDate(reformPackage.current_stage_date)}`}</dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.dossier.officialSource')}</dt>
          <dd>
            <a href={sourceEvent?.source_url}>{sourceEvent?.source_institution ?? reformPackage.official_basis}</a>
          </dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.dossier.policyArea')}</dt>
          <dd>{reformPackage.policy_area}</dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.dossier.financing')}</dt>
          <dd>{reformPackage.financing_or_incentive ?? t('format.notAvailable')}</dd>
        </div>
      </dl>
      <section>
        <h3>{t('knowledgeHub.reformTracker.dossier.whyTracked')}</h3>
        <p>{reformPackage.why_tracked}</p>
      </section>
      <section>
        <h3>{t('knowledgeHub.reformTracker.dossier.measureTracks')}</h3>
        <ul className="compact-list">
          {reformPackage.measure_tracks.map((track) => (
            <li key={track.id}>
              <span>{track.label}</span>
              {track.status ? <span className="ui-chip">{track.status}</span> : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>{t('knowledgeHub.reformTracker.dossier.upcomingMilestones')}</h3>
        <ul className="compact-list">
          {reformPackage.implementation_milestones.map((milestone) => (
            <li key={milestone.id}>
              <span>{milestone.label}</span>
              <span className="mono-date">{formatDisplayDate(milestone.date)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>{t('knowledgeHub.reformTracker.dossier.evidence')}</h3>
        <ul className="compact-list">
          {reformPackage.official_source_events.map((event) => (
            <li key={event.id}>
              <a href={event.source_url}>{event.title}</a>
              <span className="mono-date">{`${formatDisplayDate(event.source_published_at)} · ${trackerLabel(t, 'eventType', event.event_type)}`}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>{t('knowledgeHub.reformTracker.dossier.modelRelevance')}</h3>
        <div className="chip-row">
          {reformPackage.model_relevance.map((ref) => (
            <span key={ref} className="attribution-badge">
              {ref}
            </span>
          ))}
        </div>
      </section>
      <p className="tracker-methodology__note">{reformPackage.caveat}</p>
    </aside>
  )
}

function ReformPackagesView({ packages }: { packages: ReformPackage[] }) {
  const { t } = useTranslation()
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.package_id ?? '')
  const selectedPackage = packages.find((item) => item.package_id === selectedPackageId) ?? packages[0]

  if (packages.length === 0) {
    return <p className="empty-state">{t('knowledgeHub.reformTracker.packages.empty')}</p>
  }

  return (
    <section className="reform-packages-layout" aria-label={t('knowledgeHub.reformTracker.packages.aria')}>
      <div className="reform-table-wrap">
        <table className="reform-package-table">
          <thead>
            <tr>
              <th>{t('knowledgeHub.reformTracker.table.package')}</th>
              <th>{t('knowledgeHub.reformTracker.table.policyArea')}</th>
              <th>{t('knowledgeHub.reformTracker.table.currentStage')}</th>
              <th>{t('knowledgeHub.reformTracker.table.nextMilestone')}</th>
              <th>{t('knowledgeHub.reformTracker.table.institution')}</th>
              <th>{t('knowledgeHub.reformTracker.table.financing')}</th>
              <th>{t('knowledgeHub.reformTracker.table.legalBasis')}</th>
              <th>{t('knowledgeHub.reformTracker.table.confidence')}</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((reformPackage) => (
              <tr
                key={reformPackage.package_id}
                className={reformPackage.package_id === selectedPackage.package_id ? 'is-selected' : ''}
              >
                <td>
                  <button
                    type="button"
                    className="reform-row-button"
                    onClick={() => setSelectedPackageId(reformPackage.package_id)}
                  >
                    {reformPackage.title}
                  </button>
                </td>
                <td>{reformPackage.policy_area}</td>
                <td>{`${reformPackage.current_stage} · ${formatDisplayDate(reformPackage.current_stage_date)}`}</td>
                <td>{`${reformPackage.next_milestone} · ${formatDisplayDate(reformPackage.next_milestone_date)}`}</td>
                <td>{reformPackage.responsible_institutions.join('; ')}</td>
                <td>{reformPackage.financing_or_incentive ?? t('format.notAvailable')}</td>
                <td>{reformPackage.legal_basis}</td>
                <td>
                  <span className="ui-chip ui-chip--accent">
                    {trackerLabel(t, 'sourceConfidence', reformPackage.source_confidence)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DossierPanel reformPackage={selectedPackage} />
    </section>
  )
}

function TimelineDetail({ item }: { item: TimelineMilestone }) {
  const { t } = useTranslation()
  const related = item.milestone.related_next_milestone_ids
    ?.map((id) => item.reformPackage.implementation_milestones.find((milestone) => milestone.id === id))
    .filter((milestone): milestone is ReformPackageMilestone => Boolean(milestone))

  return (
    <aside className="timeline-detail" aria-label={t('knowledgeHub.reformTracker.timeline.detailAria')}>
      <span className="ui-chip ui-chip--accent">{trackerLabel(t, 'eventType', item.milestone.event_type)}</span>
      <h2>{item.milestone.label}</h2>
      <dl className="reform-dossier__meta">
        <div>
          <dt>{t('knowledgeHub.reformTracker.timeline.package')}</dt>
          <dd>{item.reformPackage.title}</dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.timeline.source')}</dt>
          <dd>
            <a href={item.sourceEvent?.source_url}>{item.sourceEvent?.source_institution ?? item.reformPackage.official_basis}</a>
          </dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.timeline.evidenceType')}</dt>
          <dd>{trackerLabel(t, 'evidenceType', item.milestone.evidence_type)}</dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.timeline.institution')}</dt>
          <dd>{item.milestone.responsible_institutions.join('; ')}</dd>
        </div>
        <div>
          <dt>{t('knowledgeHub.reformTracker.timeline.confidence')}</dt>
          <dd>{trackerLabel(t, 'sourceConfidence', item.milestone.confidence)}</dd>
        </div>
      </dl>
      {related && related.length > 0 ? (
        <section>
          <h3>{t('knowledgeHub.reformTracker.timeline.relatedNext')}</h3>
          <ul className="compact-list">
            {related.map((milestone) => (
              <li key={milestone.id}>
                <span>{milestone.label}</span>
                <span className="mono-date">{formatDisplayDate(milestone.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}

function ImplementationTimelineView({ packages }: { packages: ReformPackage[] }) {
  const { t } = useTranslation()
  const timeline = useMemo(() => flattenMilestones(packages), [packages])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(timeline[0]?.milestone.id ?? '')
  const selected = timeline.find((item) => item.milestone.id === selectedMilestoneId) ?? timeline[0]
  const groups = groupMilestones(timeline)

  if (timeline.length === 0) {
    return <p className="empty-state">{t('knowledgeHub.reformTracker.timeline.empty')}</p>
  }

  return (
    <section className="implementation-layout" aria-label={t('knowledgeHub.reformTracker.timeline.aria')}>
      <div className="timeline-lanes">
        {groups.map(([period, items]) => (
          <section key={period} className="timeline-period">
            <h2>{period}</h2>
            {items.map((item) => (
              <button
                key={item.milestone.id}
                type="button"
                className={`timeline-milestone${item.milestone.id === selected.milestone.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedMilestoneId(item.milestone.id)}
              >
                <span className="mono-date">{formatDisplayDate(item.milestone.date)}</span>
                <span>{item.milestone.label}</span>
                <span>{item.reformPackage.policy_area}</span>
                <span className="ui-chip">{trackerLabel(t, 'eventType', item.milestone.event_type)}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      <TimelineDetail item={selected} />
    </section>
  )
}

function MethodologyNote({ content }: { content: KnowledgeHubContent }) {
  const { t } = useTranslation()
  const diagnostics = content.source_diagnostics ?? []
  const invalidLinks = diagnostics.reduce((sum, source) => sum + source.link_invalid_count, 0)

  return (
    <details className="tracker-methodology">
      <summary>{t('knowledgeHub.reformTracker.methodology.title')}</summary>
      <div className="tracker-methodology__grid">
        <div>
          <h3>{t('knowledgeHub.reformTracker.methodology.includedTitle')}</h3>
          <p>{t('knowledgeHub.reformTracker.methodology.included')}</p>
        </div>
        <div>
          <h3>{t('knowledgeHub.reformTracker.methodology.excludedTitle')}</h3>
          <p>{t('knowledgeHub.reformTracker.methodology.excluded')}</p>
        </div>
      </div>
      <p className="tracker-methodology__note">{t('knowledgeHub.reformTracker.methodology.caveat')}</p>
      {diagnostics.length > 0 ? (
        <div className="source-diagnostics-compact">
          <span>{t('knowledgeHub.reformTracker.methodology.diagnostics')}</span>
          <span>{t('knowledgeHub.reformTracker.methodology.sourcesChecked', { count: diagnostics.length })}</span>
          <span>{t('knowledgeHub.reformTracker.methodology.invalidLinksBlocked', { count: invalidLinks })}</span>
        </div>
      ) : null}
    </details>
  )
}

export function KnowledgeHubContentView({ content }: KnowledgeHubContentViewProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TrackerTab>('packages')
  const packages = content.reform_packages ?? []

  return (
    <>
      <MetricStrip content={content} packages={packages} />
      <div className="tracker-tabs" role="tablist" aria-label={t('knowledgeHub.reformTracker.tabs.aria')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'packages'}
          className={activeTab === 'packages' ? 'is-active' : ''}
          onClick={() => setActiveTab('packages')}
        >
          {t('knowledgeHub.reformTracker.tabs.packages')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeline'}
          className={activeTab === 'timeline' ? 'is-active' : ''}
          onClick={() => setActiveTab('timeline')}
        >
          {t('knowledgeHub.reformTracker.tabs.timeline')}
        </button>
      </div>
      {activeTab === 'packages' ? <ReformPackagesView packages={packages} /> : <ImplementationTimelineView packages={packages} />}
      <MethodologyNote content={content} />
    </>
  )
}
