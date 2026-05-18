import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type {
  KnowledgeHubActiveModelLensId,
  KnowledgeHubContentLanguage,
  KnowledgeHubContent,
  KnowledgeHubGatedModelLensId,
  KnowledgeHubLiteratureItem,
  ReformPackage,
  ReformPackageDigest,
  ReformPackageMilestone,
  ReformPackageSourceEvent,
} from '../../contracts/data-contract.js'
import {
  dateSortKey,
  sortMilestonesChronologically,
  sortReformPackagesNewestFirst,
  sortResearchUpdatesNewestFirst,
} from './knowledge-hub-ordering.js'

type KnowledgeHubContentViewProps = {
  content: KnowledgeHubContent
}

type KnowledgeHubSectionId = 'reformTracker' | 'researchUpdates' | 'literatureHub'
type ReformTrackerViewId = 'latestChanges' | 'register' | 'upcomingDates'
type LabelNamespace = 'eventType' | 'evidenceType'
type ModelLensId = KnowledgeHubActiveModelLensId | KnowledgeHubGatedModelLensId
type DossierFilters = {
  search: string
  policyArea: string
  stage: string
  sourceHost: string
}

const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const

const HUB_SECTIONS: KnowledgeHubSectionId[] = ['reformTracker', 'researchUpdates', 'literatureHub']
const REFORM_TRACKER_VIEWS: ReformTrackerViewId[] = ['latestChanges', 'register', 'upcomingDates']

function formatDisplayDate(value: string | undefined): string {
  if (!value) return 'n/a'
  if (/^\d{4}$/.test(value)) return value
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function normalizeContentLanguage(value: string | undefined): KnowledgeHubContentLanguage {
  if (value === 'ru' || value?.startsWith('ru-')) return 'ru'
  if (value === 'uz' || value?.startsWith('uz-')) return 'uz'
  return 'en'
}

function localizedText(
  values: Partial<Record<KnowledgeHubContentLanguage, string>> | undefined,
  language: KnowledgeHubContentLanguage,
): string | undefined {
  return values?.[language] ?? (language !== 'en' ? values?.en : undefined)
}

function localizedList(
  values: Partial<Record<KnowledgeHubContentLanguage, string[]>> | undefined,
  language: KnowledgeHubContentLanguage,
): string[] | undefined {
  return values?.[language] ?? (language !== 'en' ? values?.en : undefined)
}

function localizedPackageField(
  reformPackage: ReformPackage,
  field: 'title' | 'short_summary' | 'policy_area' | 'current_stage' | 'next_milestone' | 'legal_basis' | 'official_basis' | 'financing_or_incentive' | 'why_tracked',
  language: KnowledgeHubContentLanguage,
): string | undefined {
  return localizedText(reformPackage.localized?.[field], language)
}

function packageDigest(reformPackage: ReformPackage, language: KnowledgeHubContentLanguage): ReformPackageDigest {
  return {
    ...reformPackage.digest,
    ...(reformPackage.localized?.digest?.[language] ?? {}),
  }
}

function sourceEventText(
  sourceEvent: ReformPackageSourceEvent | undefined,
  field: 'title' | 'summary' | 'source_url',
  language: KnowledgeHubContentLanguage,
): string | undefined {
  if (!sourceEvent) return undefined
  return localizedText(sourceEvent.localized?.[field], language) ?? sourceEvent[field]
}

function referenceTime(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function hostLabel(value: string | undefined): string {
  if (!value) return 'n/a'
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function formatCount(value: number | undefined): string {
  return String(value ?? 0)
}

function isFutureDate(value: string, reference: number): boolean {
  const parsed = Date.parse(dateSortKey(value))
  return Number.isFinite(parsed) && parsed > reference
}

function packageTimeline(reformPackage: ReformPackage): ReformPackageMilestone[] {
  return sortMilestonesChronologically(reformPackage.implementation_milestones)
}

function flattenMilestones(packages: ReformPackage[]): ReformPackageMilestone[] {
  return packages
    .flatMap((reformPackage) => reformPackage.implementation_milestones)
    .sort((left, right) => dateSortKey(left.date).localeCompare(dateSortKey(right.date)))
}

type UpcomingMilestoneRow = {
  id: string
  date: string
  packageTitle: string
  action: string
  status: string
  sourceTitle?: string
  sourceUrl?: string
}

function upcomingMilestoneRows(
  packages: ReformPackage[],
  generatedAt: string | undefined,
  language: KnowledgeHubContentLanguage,
): UpcomingMilestoneRow[] {
  const generatedReference = referenceTime(generatedAt)
  return packages
    .flatMap((reformPackage) =>
      packageTimeline(reformPackage)
        .filter((milestone) => isFutureDate(milestone.date, generatedReference))
        .map((milestone) => {
          const sourceEvent = sourceById(reformPackage, milestone.source_event_ids[0] ?? '')
          const sourceUrl = sourceEventText(sourceEvent, 'source_url', language)
          return {
            id: `${reformPackage.package_id}:${milestone.id}`,
            date: milestone.date,
            packageTitle: dossierDisplayTitle(reformPackage, packages, language),
            action: milestoneDisplayLabel(milestone, sourceEvent, language),
            status: localizedPackageField(reformPackage, 'current_stage', language) ?? reformPackage.current_stage,
            sourceTitle: sourceEventText(sourceEvent, 'title', language),
            sourceUrl,
          }
        }),
    )
    .sort((left, right) => dateSortKey(left.date).localeCompare(dateSortKey(right.date)))
}

function hasDuplicateTitle(
  reformPackage: ReformPackage,
  packages: ReformPackage[],
  language: KnowledgeHubContentLanguage,
): boolean {
  const title = localizedPackageField(reformPackage, 'title', language) ?? reformPackage.title
  const normalizedTitle = title.trim().toLowerCase()
  return packages.filter((item) => {
    const itemTitle = localizedPackageField(item, 'title', language) ?? item.title
    return itemTitle.trim().toLowerCase() === normalizedTitle
  }).length > 1
}

function isGenericDossierTitle(title: string): boolean {
  return /^policy implementation reform$/i.test(title.trim())
}

function dossierDisplayTitle(
  reformPackage: ReformPackage,
  packages: ReformPackage[],
  language: KnowledgeHubContentLanguage,
): string {
  const title = localizedPackageField(reformPackage, 'title', language) ?? reformPackage.title
  if (!isGenericDossierTitle(title) && !hasDuplicateTitle(reformPackage, packages, language)) {
    return title
  }

  return `${title}: ${localizedPackageField(reformPackage, 'policy_area', language) ?? reformPackage.policy_area}`
}

function sourceById(reformPackage: ReformPackage, id: string): ReformPackageSourceEvent | undefined {
  return reformPackage.official_source_events.find((event) => event.id === id)
}

function trackerLabel(t: TFunction, namespace: LabelNamespace, value: string): string {
  return t(`knowledgeHub.reformTracker.labels.${namespace}.${value}`)
}

function humanizeMachineToken(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function displayEvidenceType(t: TFunction, value: string): string {
  const translated = trackerLabel(t, 'evidenceType', value)
  return translated === `knowledgeHub.reformTracker.labels.evidenceType.${value}`
    ? humanizeMachineToken(value)
    : translated
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((left, right) =>
    left.localeCompare(right),
  )
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function cleanDossierText(value: string): string {
  const withoutTrackerLead = value.replace(/^Tracks an?\s+/i, (match) =>
    /^Tracks an/i.test(match) ? 'An ' : 'A ',
  )
  const usefulSentences = splitSentences(withoutTrackerLead).filter(
    (sentence) =>
      !/not as an independently verified legal registry/i.test(sentence) &&
      !/not an official legal registry/i.test(sentence) &&
      !/not as disbursement verification/i.test(sentence),
  )
  return usefulSentences.join(' ')
}

function dossierSummary(reformPackage: ReformPackage, language: KnowledgeHubContentLanguage): string {
  const shortSummary = localizedPackageField(reformPackage, 'short_summary', language) ?? reformPackage.short_summary
  if (shortSummary) return cleanDossierText(shortSummary)
  const sourceSummary = splitSentences(sourceEventText(reformPackage.official_source_events[0], 'summary', language) ?? '')
  const summary = sourceSummary.slice(0, 2).join(' ')
  return summary || cleanDossierText(localizedPackageField(reformPackage, 'why_tracked', language) ?? reformPackage.why_tracked)
}

function compactUniqueList(values: string[]): string[] {
  const entries = values.reduce<string[]>((accumulator, value) => {
    const normalized = value.trim()
    if (normalized.length > 0 && !accumulator.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
      accumulator.push(normalized)
    }
    return accumulator
  }, [])

  return entries.filter((value, index) => {
    const normalized = value.toLowerCase()
    return !entries.some((other, otherIndex) => otherIndex !== index && other.toLowerCase().includes(normalized))
  })
}

function displayParameter(t: TFunction, value: string): string {
  const evidenceTypeMatch = value.match(/^Evidence type:\s*([a-z_]+)$/i)
  if (evidenceTypeMatch) {
    return `${t('knowledgeHub.reformTracker.timeline.evidenceType')}: ${displayEvidenceType(t, evidenceTypeMatch[1])}`
  }

  return value.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (token) => humanizeMachineToken(token).toLowerCase())
}

const HIDDEN_MEASURE_PATTERNS = [
  /^(Evidence type|Source event date|Source event dates|Verified official source event date|Legal act registered|Official source event published):/i,
  /No future implementation deadline/i,
  /Tracks one verified official source event/i,
  /Tracks \d+ verified official source events?/i,
  /Official detail page did not expose/i,
]

function isVisibleMeasure(value: string): boolean {
  const normalized = value.trim()
  return !HIDDEN_MEASURE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function parameterList(reformPackage: ReformPackage, t: TFunction, language: KnowledgeHubContentLanguage): string[] {
  const parameters = (localizedList(reformPackage.localized?.parameters_or_amounts, language) ?? reformPackage.parameters_or_amounts ?? []).filter(
    isVisibleMeasure,
  )
  const derived = [localizedPackageField(reformPackage, 'financing_or_incentive', language) ?? reformPackage.financing_or_incentive]
  return compactUniqueList([...parameters, ...derived].filter((value): value is string => Boolean(value))).map((value) =>
    displayParameter(t, value),
  )
}

function digestChangeText(reformPackage: ReformPackage, t: TFunction, language: KnowledgeHubContentLanguage): string {
  return packageDigest(reformPackage, language).changed ?? parameterList(reformPackage, t, language)[0] ?? dossierSummary(reformPackage, language)
}

function changeBullets(
  reformPackage: ReformPackage,
  t: TFunction,
  language: KnowledgeHubContentLanguage,
  limit?: number,
): string[] {
  const primaryChange = digestChangeText(reformPackage, t, language)
  const bullets = parameterList(reformPackage, t, language).filter((value) => value !== primaryChange)
  const items = compactUniqueList([primaryChange, ...bullets])
  return typeof limit === 'number' ? items.slice(0, limit) : items
}

function stageTone(stage: string): 'green' | 'amber' | 'blue' {
  const normalized = stage.toLowerCase()
  if (normalized.includes('adopt') || normalized.includes('approved')) return 'amber'
  if (normalized.includes('verified')) return 'blue'
  return 'green'
}

function compactTimelineLabel(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 150 ? `${normalized.slice(0, 147)}...` : normalized
}

function isGenericMilestoneLabel(value: string): boolean {
  return /^(official measure recorded|official measure approved|implementation measure recorded|tax incentive source event recorded|previous rule superseded)$/i.test(
    value.trim(),
  )
}

function milestoneDisplayLabel(
  milestone: ReformPackageMilestone,
  sourceEvent: ReformPackageSourceEvent | undefined,
  language: KnowledgeHubContentLanguage,
): string {
  const localizedTitle = sourceEventText(sourceEvent, 'title', language)
  if (isGenericMilestoneLabel(milestone.label) && localizedTitle) {
    return compactTimelineLabel(localizedTitle)
  }

  return compactTimelineLabel(humanizeMachineToken(milestone.label))
}

function sourceHosts(packages: ReformPackage[]): string[] {
  return uniqueSorted(
    packages.flatMap((reformPackage) => reformPackage.official_source_events.map((event) => hostLabel(event.source_url))),
  )
}

function localizedFilterLabel(
  packages: ReformPackage[],
  field: 'policy_area' | 'current_stage',
  value: string,
  language: KnowledgeHubContentLanguage,
): string {
  const packageMatch = packages.find((item) => item[field] === value)
  if (!packageMatch) return value
  const localizedField = field === 'policy_area' ? 'policy_area' : 'current_stage'
  return localizedPackageField(packageMatch, localizedField, language) ?? value
}

function packagePrimarySource(reformPackage: ReformPackage): ReformPackageSourceEvent | undefined {
  return reformPackage.official_source_events[0]
}

function packageSearchText(
  reformPackage: ReformPackage,
  displayTitle: string,
  language: KnowledgeHubContentLanguage,
): string {
  return [
    displayTitle,
    localizedPackageField(reformPackage, 'policy_area', language) ?? reformPackage.policy_area,
    localizedPackageField(reformPackage, 'current_stage', language) ?? reformPackage.current_stage,
    localizedPackageField(reformPackage, 'legal_basis', language) ?? reformPackage.legal_basis,
    localizedPackageField(reformPackage, 'official_basis', language) ?? reformPackage.official_basis,
    localizedPackageField(reformPackage, 'financing_or_incentive', language) ?? reformPackage.financing_or_incentive ?? '',
    reformPackage.responsible_institutions.join(' '),
    reformPackage.measure_tracks.map((track) => `${track.label} ${track.status ?? ''}`).join(' '),
    (localizedList(reformPackage.localized?.parameters_or_amounts, language) ?? reformPackage.parameters_or_amounts)?.join(' ') ?? '',
    reformPackage.official_source_events
      .map((event) => `${sourceEventText(event, 'title', language) ?? event.title} ${event.source_institution}`)
      .join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

function packageMatchesFilters(
  reformPackage: ReformPackage,
  filters: DossierFilters,
  allPackages: ReformPackage[],
  language: KnowledgeHubContentLanguage,
): boolean {
  const displayTitle = dossierDisplayTitle(reformPackage, allPackages, language)
  const query = filters.search.trim().toLowerCase()
  const primaryHost = hostLabel(packagePrimarySource(reformPackage)?.source_url)
  return (
    (!query || packageSearchText(reformPackage, displayTitle, language).includes(query)) &&
    (!filters.policyArea || reformPackage.policy_area === filters.policyArea) &&
    (!filters.stage || reformPackage.current_stage === filters.stage) &&
    (!filters.sourceHost || primaryHost === filters.sourceHost)
  )
}

function sourceDiagnosticsSummary(content: KnowledgeHubContent) {
  const diagnostics = content.source_diagnostics ?? []
  return {
    sourceCount: content.meta.sources_configured ?? content.sources?.length ?? diagnostics.length,
    checkedCount: diagnostics.filter((diagnostic) => diagnostic.ok).length,
    brokenLinkCount: diagnostics.reduce((sum, diagnostic) => sum + diagnostic.link_invalid_count, 0),
  }
}

function modelLensMap(content: KnowledgeHubContent): Map<string, KnowledgeHubActiveModelLensId[]> {
  return new Map(
    (content.model_impact_map?.package_links ?? []).map((link) => [
      link.package_id,
      uniqueSorted(link.active_lenses.map((lens) => lens.model_id)) as KnowledgeHubActiveModelLensId[],
    ]),
  )
}

function gatedLenses(content: KnowledgeHubContent): KnowledgeHubGatedModelLensId[] {
  return (content.model_impact_map?.gated_lenses ?? []).map((lens) => lens.id as KnowledgeHubGatedModelLensId)
}

function MetricIcon({ type }: { type: 'dossier' | 'sources' | 'calendar' }) {
  const paths = {
    dossier: 'M7 3h7l4 4v14H7V3zm7 0v5h5M10 12h6M10 16h6',
    sources: 'M4 20h16M6 18V9l6-4 6 4v9M9 18v-6M12 18v-6M15 18v-6M5 9h14',
    calendar: 'M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2zM8 13h3M13 13h3M8 17h3M13 17h3',
  }

  return (
    <svg className="tracker-metric__icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[type]} />
    </svg>
  )
}

function MetricStrip({ content, packages }: { content: KnowledgeHubContent; packages: ReformPackage[] }) {
  const { t } = useTranslation()
  const sourceSummary = sourceDiagnosticsSummary(content)
  const generatedReference = referenceTime(content.generated_at)
  const upcomingMilestones = flattenMilestones(packages).filter((milestone) =>
    isFutureDate(milestone.date, generatedReference),
  ).length
  const metrics = [
    {
      icon: 'dossier' as const,
      label: t('knowledgeHub.reformTracker.metrics.dossiers'),
      value: String(packages.length),
    },
    {
      icon: 'sources' as const,
      label: t('knowledgeHub.reformTracker.metrics.officialSources'),
      value: String(sourceSummary.sourceCount),
    },
    {
      icon: 'calendar' as const,
      label: t('knowledgeHub.reformTracker.metrics.upcomingMilestones'),
      value: String(upcomingMilestones),
    },
  ]

  return (
    <section aria-label={t('knowledgeHub.reformTracker.metrics.aria')} className="tracker-summary">
      {metrics.map((metric) => (
        <div key={metric.label} className="tracker-metric">
          <MetricIcon type={metric.icon} />
          <span className="tracker-summary__value">{metric.value}</span>
          <span className="tracker-summary__label">{metric.label}</span>
        </div>
      ))}
    </section>
  )
}

function LatestChangesSection({
  packages,
  allPackages,
  content,
  language,
}: {
  packages: ReformPackage[]
  allPackages: ReformPackage[]
  content: KnowledgeHubContent
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  const latestPackages = packages.slice(0, 3)
  const upcomingRows = upcomingMilestoneRows(packages, content.generated_at, language)
  const sourceSummary = sourceDiagnosticsSummary(content)

  return (
    <section className="latest-changes" aria-label={t('knowledgeHub.reformTracker.latestChanges.aria')}>
      <header className="section-header section-header--compact">
        <div>
          <h2>{t('knowledgeHub.reformTracker.latestChanges.title')}</h2>
          <p>{t('knowledgeHub.reformTracker.latestChanges.description')}</p>
        </div>
      </header>
      <div className="latest-change-layout">
        <div className="latest-change-list">
          {latestPackages.map((reformPackage) => {
            const sourceEvent = packagePrimarySource(reformPackage)
            const displayTitle = dossierDisplayTitle(reformPackage, allPackages, language)
            const bullets = changeBullets(reformPackage, t, language, 6)
            const sourceUrl = sourceEventText(sourceEvent, 'source_url', language)
            const sourceTitle = sourceEventText(sourceEvent, 'title', language)
            const digest = packageDigest(reformPackage, language)

            return (
              <article key={reformPackage.package_id} className="latest-change-card">
                <header>
                  <span className="latest-change-card__meta">
                    <time dateTime={reformPackage.current_stage_date}>{formatDisplayDate(reformPackage.current_stage_date)}</time>
                    <span>{hostLabel(sourceUrl ?? sourceEvent?.source_url)}</span>
                  </span>
                  <h3>{displayTitle}</h3>
                </header>
                <ul className="change-bullet-list">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p className="latest-change-source">
                  {sourceEvent && sourceUrl ? (
                    <a href={sourceUrl} className="text-source-link" {...EXTERNAL_LINK_PROPS}>
                      {digest.document ?? sourceTitle ?? t('knowledgeHub.reformTracker.archive.openSource')}
                    </a>
                  ) : (
                    digest.document ?? localizedPackageField(reformPackage, 'official_basis', language) ?? reformPackage.official_basis
                  )}
                </p>
              </article>
            )
          })}
        </div>
        <aside className="latest-change-sidebar" aria-label={t('knowledgeHub.reformTracker.upcoming.previewAria')}>
          <UpcomingDatesPreview rows={upcomingRows.slice(0, 5)} />
          <SourceChecksStrip
            reformCount={packages.length}
            brokenLinkCount={sourceSummary.brokenLinkCount}
            sourceCount={sourceSummary.sourceCount}
          />
        </aside>
      </div>
      <RegisterPreviewTable packages={packages.slice(0, 5)} allPackages={allPackages} language={language} />
    </section>
  )
}

function UpcomingDatesPreview({ rows }: { rows: UpcomingMilestoneRow[] }) {
  const { t } = useTranslation()
  return (
    <section className="upcoming-preview">
      <h3>{t('knowledgeHub.reformTracker.upcoming.title')}</h3>
      {rows.length > 0 ? (
        <ol>
          {rows.map((row) => (
            <li key={row.id}>
              <time dateTime={row.date}>{formatDisplayDate(row.date)}</time>
              <span>{row.action}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state empty-state--compact">{t('knowledgeHub.reformTracker.upcoming.empty')}</p>
      )}
    </section>
  )
}

function SourceChecksStrip({
  reformCount,
  brokenLinkCount,
  sourceCount,
}: {
  reformCount: number
  brokenLinkCount: number
  sourceCount: number
}) {
  const { t } = useTranslation()
  const checks = [
    { value: reformCount, label: t('knowledgeHub.reformTracker.sourceChecks.reforms') },
    { value: brokenLinkCount, label: t('knowledgeHub.reformTracker.sourceChecks.brokenLinks') },
    { value: sourceCount, label: t('knowledgeHub.reformTracker.sourceChecks.sources') },
  ]
  return (
    <section className="source-checks-strip" aria-label={t('knowledgeHub.reformTracker.sourceChecks.aria')}>
      {checks.map((check) => (
        <span key={check.label}>
          <strong>{check.value}</strong>
          {check.label}
        </span>
      ))}
    </section>
  )
}

function RegisterPreviewTable({
  packages,
  allPackages,
  language,
}: {
  packages: ReformPackage[]
  allPackages: ReformPackage[]
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  return (
    <section className="register-preview" aria-label={t('knowledgeHub.reformTracker.registerPreview.aria')}>
      <header className="section-header section-header--compact">
        <div>
          <h2>{t('knowledgeHub.reformTracker.registerPreview.title')}</h2>
          <p>{t('knowledgeHub.reformTracker.registerPreview.description')}</p>
        </div>
      </header>
      <div className="register-preview__table-wrap">
        <table className="register-preview__table">
          <thead>
            <tr>
              <th scope="col">{t('knowledgeHub.reformTracker.table.package')}</th>
              <th scope="col">{t('knowledgeHub.reformTracker.table.policyArea')}</th>
              <th scope="col">{t('knowledgeHub.reformTracker.table.currentStage')}</th>
              <th scope="col">{t('knowledgeHub.reformTracker.archive.source')}</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((reformPackage) => {
              const sourceEvent = packagePrimarySource(reformPackage)
              const sourceUrl = sourceEventText(sourceEvent, 'source_url', language)
              return (
                <tr key={reformPackage.package_id}>
                  <td>{dossierDisplayTitle(reformPackage, allPackages, language)}</td>
                  <td>{localizedPackageField(reformPackage, 'policy_area', language) ?? reformPackage.policy_area}</td>
                  <td>{localizedPackageField(reformPackage, 'current_stage', language) ?? reformPackage.current_stage}</td>
                  <td>{hostLabel(sourceUrl ?? sourceEvent?.source_url)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TrackerControlsPanel({
  filters,
  onFiltersChange,
  packages,
  language,
}: {
  filters: DossierFilters
  onFiltersChange: (filters: DossierFilters) => void
  packages: ReformPackage[]
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  const policyAreas = uniqueSorted(packages.map((item) => item.policy_area))
  const stages = uniqueSorted(packages.map((item) => item.current_stage))
  const hosts = sourceHosts(packages)

  function updateFilter(key: keyof DossierFilters, value: string) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <section className="tracker-controls" aria-label={t('knowledgeHub.reformTracker.filters.aria')}>
      <label className="tracker-controls__search">
        <span>{t('knowledgeHub.reformTracker.filters.search')}</span>
        <input
          type="search"
          value={filters.search}
          placeholder={t('knowledgeHub.reformTracker.filters.searchPlaceholder')}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
      </label>
      <details className="tracker-controls__advanced">
        <summary>{t('knowledgeHub.reformTracker.filters.more')}</summary>
        <div className="tracker-controls__advanced-grid">
          <label>
            <span>{t('knowledgeHub.reformTracker.filters.policyArea')}</span>
            <select value={filters.policyArea} onChange={(event) => updateFilter('policyArea', event.target.value)}>
              <option value="">{t('knowledgeHub.reformTracker.filters.allAreas')}</option>
              {policyAreas.map((area) => (
                <option key={area} value={area}>
                  {localizedFilterLabel(packages, 'policy_area', area, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('knowledgeHub.reformTracker.filters.status')}</span>
            <select value={filters.stage} onChange={(event) => updateFilter('stage', event.target.value)}>
              <option value="">{t('knowledgeHub.reformTracker.filters.allStages')}</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {localizedFilterLabel(packages, 'current_stage', stage, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('knowledgeHub.reformTracker.filters.source')}</span>
            <select value={filters.sourceHost} onChange={(event) => updateFilter('sourceHost', event.target.value)}>
              <option value="">{t('knowledgeHub.reformTracker.filters.allSources')}</option>
              {hosts.map((host) => (
                <option key={host} value={host}>
                  {host}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tracker-controls__clear"
            onClick={() => onFiltersChange({ search: '', policyArea: '', stage: '', sourceHost: '' })}
          >
            {t('knowledgeHub.reformTracker.filters.clearAll')}
          </button>
        </div>
      </details>
    </section>
  )
}

function TimelineChips({
  reformPackage,
  language,
}: {
  reformPackage: ReformPackage
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  const milestones = packageTimeline(reformPackage)

  if (milestones.length === 0) {
    return <p className="empty-state empty-state--compact">{t('knowledgeHub.reformTracker.archive.noTimeline')}</p>
  }

  return (
    <div className="timeline-chip-list">
      {milestones.slice(0, 5).map((milestone) => {
        const sourceEvent = sourceById(reformPackage, milestone.source_event_ids[0] ?? '')
        return (
          <span key={milestone.id} className="timeline-chip">
            <time dateTime={milestone.date}>{formatDisplayDate(milestone.date)}</time>
            <span>{milestoneDisplayLabel(milestone, sourceEvent, language)}</span>
          </span>
        )
      })}
    </div>
  )
}

function ModelLensChips({
  activeLenses,
  plannedLenses,
}: {
  activeLenses: KnowledgeHubActiveModelLensId[]
  plannedLenses: KnowledgeHubGatedModelLensId[]
}) {
  const { t } = useTranslation()

  return (
    <div className="model-lens-strip">
      <div>
        <span className="model-lens-strip__label">{t('knowledgeHub.reformTracker.archive.possibleLenses')}</span>
        <div className="chip-row">
          {activeLenses.length > 0 ? (
            activeLenses.map((lens) => (
              <span key={lens} className="model-chip model-chip--active">
                {lens}
              </span>
            ))
          ) : (
            <span className="model-chip">{t('knowledgeHub.reformTracker.archive.noActiveLens')}</span>
          )}
        </div>
      </div>
      <div>
        <span className="model-lens-strip__label">{t('knowledgeHub.reformTracker.archive.plannedLenses')}</span>
        <div className="chip-row">
          {plannedLenses.map((lens) => (
            <span key={lens} className="model-chip model-chip--planned">
              {lens}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReformArchive({
  packages,
  allPackages,
  content,
  onClearFilters,
  language,
}: {
  packages: ReformPackage[]
  allPackages: ReformPackage[]
  content: KnowledgeHubContent
  onClearFilters: () => void
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  const activeLensMap = modelLensMap(content)
  const plannedLenses = gatedLenses(content)

  if (packages.length === 0) {
    return (
      <section className="reform-archive reform-archive--empty" aria-label={t('knowledgeHub.reformTracker.archive.aria')}>
        <p className="empty-state empty-state--compact">{t('knowledgeHub.reformTracker.archive.empty')}</p>
        <button type="button" className="ui-secondary-action" onClick={onClearFilters}>
          {t('knowledgeHub.reformTracker.filters.clearAll')}
        </button>
      </section>
    )
  }

  return (
    <section className="reform-archive" aria-label={t('knowledgeHub.reformTracker.archive.aria')}>
      <header className="section-header section-header--compact">
        <div>
          <h2>{t('knowledgeHub.reformTracker.archive.title')}</h2>
          <p>{t('knowledgeHub.reformTracker.archive.showing', { count: packages.length, total: allPackages.length })}</p>
        </div>
      </header>
      <div className="archive-list">
        {packages.map((reformPackage, index) => {
          const sourceEvent = packagePrimarySource(reformPackage)
          const sourceUrl = sourceEventText(sourceEvent, 'source_url', language)
          const sourceTitle = sourceEventText(sourceEvent, 'title', language)
          const displayTitle = dossierDisplayTitle(reformPackage, allPackages, language)
          const changeItems = changeBullets(reformPackage, t, language)
          const previewItems = changeItems.slice(0, 2)
          const currentStage = localizedPackageField(reformPackage, 'current_stage', language) ?? reformPackage.current_stage
          return (
            <details key={reformPackage.package_id} className="archive-item" open={index === 0}>
              <summary className="archive-summary">
                <span className="archive-summary__main">
                  <span className="archive-summary__title">{displayTitle}</span>
                  {previewItems.length > 0 ? (
                    <span className="archive-summary__preview">
                      {previewItems.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </span>
                  ) : null}
                  <span className="archive-summary__meta">
                    <span>{hostLabel(sourceEvent?.source_url)}</span>
                    <time dateTime={reformPackage.current_stage_date}>{formatDisplayDate(reformPackage.current_stage_date)}</time>
                  </span>
                </span>
                <span className={`ui-chip ui-chip--${stageTone(reformPackage.current_stage)}`}>
                  {currentStage}
                </span>
                <span className="archive-summary__chevron" aria-hidden="true">
                </span>
              </summary>
              <div className="archive-body">
                <section className="archive-change-section">
                  <h3>{t('knowledgeHub.reformTracker.archive.reformChanges')}</h3>
                  <ul className="change-bullet-list change-bullet-list--archive">
                    {changeItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="archive-source-row">
                  <div>
                    <h3>{t('knowledgeHub.reformTracker.archive.source')}</h3>
                    <p>{sourceEvent?.source_institution ?? localizedPackageField(reformPackage, 'official_basis', language) ?? reformPackage.official_basis}</p>
                  </div>
                  {sourceEvent && sourceUrl ? (
                    <a
                      href={sourceUrl}
                      className="external-source-link"
                      aria-label={t('knowledgeHub.reformTracker.dossier.openOfficialSourceAria', {
                        title: sourceTitle ?? sourceEvent.title,
                      })}
                      {...EXTERNAL_LINK_PROPS}
                    >
                      <span>{t('knowledgeHub.reformTracker.archive.openSource')}</span>
                      <span>{t('knowledgeHub.reformTracker.dossier.sourceLinkMeta', { host: hostLabel(sourceUrl) })}</span>
                    </a>
                  ) : null}
                </section>
                <section>
                  <h3>{t('knowledgeHub.reformTracker.archive.timeline')}</h3>
                  <TimelineChips reformPackage={reformPackage} language={language} />
                </section>
                <section>
                  <h3>{t('knowledgeHub.reformTracker.archive.modelLenses')}</h3>
                  <ModelLensChips
                    activeLenses={activeLensMap.get(reformPackage.package_id) ?? []}
                    plannedLenses={plannedLenses}
                  />
                </section>
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}

function SupportingInfo({ content, packages }: { content: KnowledgeHubContent; packages: ReformPackage[] }) {
  const { t } = useTranslation()
  const sourceSummary = sourceDiagnosticsSummary(content)
  const rulebook = content.rulebook

  return (
    <section className="tracker-support" aria-label={t('knowledgeHub.reformTracker.support.aria')}>
      <details className="support-panel">
        <summary>{t('knowledgeHub.reformTracker.support.sourcesTitle')}</summary>
        <div className="support-stat-grid">
          <div>
            <strong>{formatCount(sourceSummary.sourceCount)}</strong>
            <span>{t('knowledgeHub.reformTracker.support.sourcesChecked')}</span>
          </div>
          <div>
            <strong>{formatCount(packages.length)}</strong>
            <span>{t('knowledgeHub.reformTracker.support.reforms')}</span>
          </div>
          <div>
            <strong>{formatCount(sourceSummary.brokenLinkCount)}</strong>
            <span>{t('knowledgeHub.reformTracker.support.brokenLinks')}</span>
          </div>
        </div>
      </details>
      <details className="support-panel">
        <summary>{t('knowledgeHub.reformTracker.support.selectionTitle')}</summary>
        <p>{rulebook?.actual_reform_definition ?? t('knowledgeHub.reformTracker.support.selectionFallback')}</p>
      </details>
    </section>
  )
}

function ReformTrackerViewTabs({
  activeView,
  onChange,
}: {
  activeView: ReformTrackerViewId
  onChange: (viewId: ReformTrackerViewId) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="reform-view-tabs" role="group" aria-label={t('knowledgeHub.reformTracker.views.aria')}>
      {REFORM_TRACKER_VIEWS.map((viewId) => (
        <button
          key={viewId}
          type="button"
          aria-pressed={activeView === viewId}
          className={activeView === viewId ? 'is-active' : ''}
          onClick={() => onChange(viewId)}
        >
          {t(`knowledgeHub.reformTracker.views.${viewId}`)}
        </button>
      ))}
    </div>
  )
}

function UpcomingDatesSection({
  packages,
  content,
  language,
}: {
  packages: ReformPackage[]
  content: KnowledgeHubContent
  language: KnowledgeHubContentLanguage
}) {
  const { t } = useTranslation()
  const rows = upcomingMilestoneRows(packages, content.generated_at, language)

  return (
    <section className="upcoming-dates-panel" aria-label={t('knowledgeHub.reformTracker.upcoming.aria')}>
      <header className="section-header section-header--compact">
        <div>
          <h2>{t('knowledgeHub.reformTracker.upcoming.title')}</h2>
          <p>{t('knowledgeHub.reformTracker.upcoming.description')}</p>
        </div>
      </header>
      {rows.length > 0 ? (
        <div className="upcoming-date-list">
          {rows.map((row) => (
            <article key={row.id} className="upcoming-date-row">
              <time dateTime={row.date}>{formatDisplayDate(row.date)}</time>
              <div>
                <h3>{row.action}</h3>
                <p>{row.packageTitle}</p>
              </div>
              <span className={`ui-chip ui-chip--${stageTone(row.status)}`}>{row.status}</span>
              {row.sourceUrl ? (
                <a
                  href={row.sourceUrl}
                  className="text-source-link"
                  aria-label={t('knowledgeHub.reformTracker.dossier.openOfficialSourceAria', {
                    title: row.sourceTitle ?? row.packageTitle,
                  })}
                  {...EXTERNAL_LINK_PROPS}
                >
                  {t('knowledgeHub.reformTracker.archive.openSource')}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state empty-state--compact">{t('knowledgeHub.reformTracker.upcoming.empty')}</p>
      )}
    </section>
  )
}

function ReformTrackerDesk({ content }: { content: KnowledgeHubContent }) {
  const { i18n } = useTranslation()
  const language = normalizeContentLanguage(i18n.resolvedLanguage ?? i18n.language)
  const packages = useMemo(() => content.reform_packages ?? [], [content.reform_packages])
  const [activeView, setActiveView] = useState<ReformTrackerViewId>('latestChanges')
  const [filters, setFilters] = useState<DossierFilters>({
    search: '',
    policyArea: '',
    stage: '',
    sourceHost: '',
  })
  const sortedPackages = useMemo(() => sortReformPackagesNewestFirst(packages), [packages])
  const filteredPackages = useMemo(
    () => sortedPackages.filter((reformPackage) => packageMatchesFilters(reformPackage, filters, sortedPackages, language)),
    [filters, language, sortedPackages],
  )
  const clearFilters = () => setFilters({ search: '', policyArea: '', stage: '', sourceHost: '' })

  return (
    <>
      <ReformTrackerViewTabs activeView={activeView} onChange={setActiveView} />
      {activeView === 'latestChanges' ? (
        <LatestChangesSection
          packages={sortedPackages}
          allPackages={sortedPackages}
          content={content}
          language={language}
        />
      ) : null}
      {activeView === 'register' ? (
        <>
          <TrackerControlsPanel filters={filters} onFiltersChange={setFilters} packages={sortedPackages} language={language} />
          <ReformArchive
            packages={filteredPackages}
            allPackages={sortedPackages}
            content={content}
            onClearFilters={clearFilters}
            language={language}
          />
          <SupportingInfo content={content} packages={packages} />
        </>
      ) : null}
      {activeView === 'upcomingDates' ? (
        <>
          <UpcomingDatesSection packages={sortedPackages} content={content} language={language} />
          <MetricStrip content={content} packages={packages} />
        </>
      ) : null}
    </>
  )
}

function ResearchUpdatesSection({ content }: { content: KnowledgeHubContent }) {
  const { t } = useTranslation()
  const updates = useMemo(() => sortResearchUpdatesNewestFirst(content.research_updates ?? []), [content.research_updates])

  return (
    <section className="hub-detail-panel research-updates-panel" aria-label={t('knowledgeHub.researchUpdates.aria')}>
      <header className="hub-detail-panel__head">
        <div>
          <h2>{t('knowledgeHub.researchUpdates.title')}</h2>
          <p>{t('knowledgeHub.researchUpdates.description')}</p>
        </div>
      </header>

      {updates.length > 0 ? (
        <div className="research-update-list">
          {updates.map((update) => (
            <article key={update.id} className="research-update-row">
              <time dateTime={update.published_at ?? update.as_of_date}>
                {formatDisplayDate(update.published_at ?? update.as_of_date)}
              </time>
              <div className="research-update-row__main">
                <h3>{update.title}</h3>
                <p>{update.why_relevant}</p>
                <a href={update.source_url} className="text-source-link" {...EXTERNAL_LINK_PROPS}>
                  {update.source_title}
                </a>
              </div>
              <dl className="research-update-facts">
                <div>
                  <dt>{t('knowledgeHub.researchUpdates.models')}</dt>
                  <dd>{update.model_ids.join(', ')}</dd>
                </div>
                <div>
                  <dt>{t('knowledgeHub.researchUpdates.methods')}</dt>
                  <dd>{update.methods.join(', ')}</dd>
                </div>
                <div>
                  <dt>{t('knowledgeHub.researchUpdates.source')}</dt>
                  <dd>{update.source_institution}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state empty-state--compact">{t('knowledgeHub.researchUpdates.empty')}</p>
      )}
    </section>
  )
}

function LiteratureHubSection({ content }: { content: KnowledgeHubContent }) {
  const { t } = useTranslation()
  const [selectedModel, setSelectedModel] = useState<ModelLensId | 'all'>('all')
  const literatureItems = useMemo(() => content.literature_items ?? [], [content.literature_items])
  const modelOptions = useMemo<Array<ModelLensId | 'all'>>(
    () => ['all', ...uniqueSorted(literatureItems.flatMap((item) => item.model_ids))] as Array<ModelLensId | 'all'>,
    [literatureItems],
  )
  const items = literatureItems.filter((item) => selectedModel === 'all' || item.model_ids.includes(selectedModel))
  const showModelFilter = modelOptions.length > 2

  return (
    <section className="hub-detail-panel literature-hub-panel" aria-label={t('knowledgeHub.literatureHub.aria')}>
      <header className="hub-detail-panel__head">
        <div>
          <h2>{t('knowledgeHub.literatureHub.title')}</h2>
          <p>{t('knowledgeHub.literatureHub.description')}</p>
        </div>
      </header>

      {showModelFilter ? (
        <div className="literature-filter" role="group" aria-label={t('knowledgeHub.literatureHub.filterAria')}>
          {modelOptions.map((modelId) => (
            <button
              key={modelId}
              type="button"
              className={selectedModel === modelId ? 'is-active' : ''}
              onClick={() => setSelectedModel(modelId)}
            >
              {modelId === 'all' ? t('knowledgeHub.literatureHub.allModels') : modelId}
            </button>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="literature-table-wrap">
          <table className="literature-table">
            <thead>
              <tr>
                <th scope="col">{t('knowledgeHub.literatureHub.model')}</th>
                <th scope="col">{t('knowledgeHub.literatureHub.method')}</th>
                <th scope="col">{t('knowledgeHub.literatureHub.year')}</th>
                <th scope="col">{t('knowledgeHub.literatureHub.source')}</th>
                <th scope="col">{t('knowledgeHub.literatureHub.referenceTitle')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <LiteratureTableRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state empty-state--compact">{t('knowledgeHub.literatureHub.empty')}</p>
      )}
    </section>
  )
}

function LiteratureTableRow({ item }: { item: KnowledgeHubLiteratureItem }) {
  return (
    <tr>
      <td>{item.model_ids.join(', ')}</td>
      <td>{item.methods.join(', ')}</td>
      <td>{item.year}</td>
      <td>{item.source}</td>
      <td>
        <a href={item.url} className="text-source-link" {...EXTERNAL_LINK_PROPS}>
          {item.title}
        </a>
        {item.authors ? <span>{item.authors}</span> : null}
        <p>{item.note}</p>
      </td>
    </tr>
  )
}

export function KnowledgeHubContentView({ content }: KnowledgeHubContentViewProps) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<KnowledgeHubSectionId>('reformTracker')

  return (
    <>
      <div className="hub-section-tabs" role="group" aria-label={t('knowledgeHub.sections.aria')}>
        {HUB_SECTIONS.map((sectionId) => (
          <button
            key={sectionId}
            type="button"
            aria-pressed={activeSection === sectionId}
            className={activeSection === sectionId ? 'is-active' : ''}
            onClick={() => setActiveSection(sectionId)}
          >
            {t(`knowledgeHub.sections.${sectionId}`)}
          </button>
        ))}
      </div>
      {activeSection === 'reformTracker' ? <ReformTrackerDesk content={content} /> : null}
      {activeSection === 'researchUpdates' ? <ResearchUpdatesSection content={content} /> : null}
      {activeSection === 'literatureHub' ? <LiteratureHubSection content={content} /> : null}
    </>
  )
}
