import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import {
  KnowledgeHubContentView,
} from '../../src/components/knowledge-hub/KnowledgeHubContentView.js'
import {
  sortMilestonesChronologically,
  sortReformPackagesNewestFirst,
  sortResearchUpdatesNewestFirst,
} from '../../src/components/knowledge-hub/knowledge-hub-ordering.js'
import { knowledgeHubArtifactToContent } from '../../src/data/adapters/knowledge-hub.js'

const KNOWLEDGE_HUB_PAGE_SOURCE = fileURLToPath(
  new URL('../../../src/pages/KnowledgeHubPage.tsx', import.meta.url),
)
const KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE = fileURLToPath(
  new URL('../../../src/components/knowledge-hub/KnowledgeHubContentView.tsx', import.meta.url),
)
const LOCALE_SOURCES = ['en', 'ru', 'uz'].map((locale) =>
  fileURLToPath(new URL(`../../../src/locales/${locale}/common.json`, import.meta.url)),
)
const PUBLIC_KNOWLEDGE_HUB_ARTIFACT = fileURLToPath(
  new URL('../../../public/data/knowledge-hub.json', import.meta.url),
)

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

function visibleReformCopy(reformPackage: {
  short_summary?: string
  parameters_or_amounts?: string[]
  financing_or_incentive?: string
  digest?: Record<string, string>
}): string {
  return collectStrings({
    short_summary: reformPackage.short_summary,
    parameters_or_amounts: reformPackage.parameters_or_amounts,
    financing_or_incentive: reformPackage.financing_or_incentive,
    digest: reformPackage.digest,
  }).join('\n')
}

function datesNewestFirst(values: string[]): boolean {
  return values.every((value, index) => index === 0 || value <= values[index - 1])
}

async function createKnowledgeHubTestI18n(language = 'en') {
  const instance = i18next.createInstance()
  const resources = Object.fromEntries(
    ['en', language].map((locale) => {
      const localePath = fileURLToPath(new URL(`../../../src/locales/${locale}/common.json`, import.meta.url))
      return [locale, { common: JSON.parse(readFileSync(localePath, 'utf8')) }]
    }),
  )
  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources,
  })
  return instance
}

describe('Knowledge Hub page', () => {
  it('loads the public artifact into the Knowledge Hub route', () => {
    const source = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.match(source, /<PageHeader\s+[\s\S]*title=\{t\('pages\.knowledgeHub\.title'\)\}/)
    assert.match(source, /description=\{t\('pages\.knowledgeHub\.description'\)\}/)
    assert.match(source, /loadKnowledgeHubSourceState/)
    assert.match(source, /KnowledgeHubContentView/)
    assert.match(source, /reformTracker\.header\.packages/)
    assert.match(source, /reformTracker\.header\.sources/)
    assert.match(source, /reformTracker\.header\.updated/)
    assert.match(source, /formatHeaderDate/)

    assert.doesNotMatch(source, /PendingSurface/)
    assert.doesNotMatch(source, /knowledgeHub\.pending/)
    assert.doesNotMatch(source, /candidateCount/)
  })

  it('renders exactly three visible Knowledge Hub subpages', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /KnowledgeHubSectionId = 'reformTracker' \| 'researchUpdates' \| 'literatureHub'/)
    assert.match(contentViewSource, /const HUB_SECTIONS: KnowledgeHubSectionId\[\] = \['reformTracker', 'researchUpdates', 'literatureHub'\]/)
    assert.match(contentViewSource, /activeSection === 'reformTracker'/)
    assert.match(contentViewSource, /activeSection === 'researchUpdates'/)
    assert.match(contentViewSource, /activeSection === 'literatureHub'/)

    assert.doesNotMatch(contentViewSource, /activeSection === 'sourceLibrary'/)
    assert.doesNotMatch(contentViewSource, /activeSection === 'methodology'/)
    assert.doesNotMatch(contentViewSource, /activeSection === 'modelImpactMap'/)
    assert.doesNotMatch(contentViewSource, /SourceLibrarySection/)
    assert.doesNotMatch(contentViewSource, /MethodologySection/)
    assert.doesNotMatch(contentViewSource, /ModelImpactMapSection/)
    assert.doesNotMatch(contentViewSource, /ReformCandidateList/)
  })

  it('splits the Reform Tracker into latest changes, register, and upcoming dates views', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /ReformTrackerViewId = 'latestChanges' \| 'register' \| 'upcomingDates'/)
    assert.match(contentViewSource, /const REFORM_TRACKER_VIEWS: ReformTrackerViewId\[\] = \['latestChanges', 'register', 'upcomingDates'\]/)
    assert.match(contentViewSource, /ReformTrackerViewTabs/)
    assert.match(contentViewSource, /UpcomingDatesSection/)
    assert.match(contentViewSource, /upcomingMilestoneRows/)
  })

  it('keeps the public artifact package-only and source-verified', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))

    assert.ok(artifact.reform_packages.length > 4)
    assert.deepEqual(artifact.candidates, [])
    assert.deepEqual(artifact.accepted_reforms, [])
    assert.ok(
      artifact.reform_packages.every((reformPackage: { official_source_events?: { source_url_status?: string }[] }) =>
        reformPackage.official_source_events?.every((sourceEvent) => sourceEvent.source_url_status === 'verified'),
      ),
    )
  })

  it('renders a CorpInfo-style latest-changes digest as compact change bullets', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /LatestChangesSection/)
    assert.match(contentViewSource, /latestPackages = packages\.slice\(0, 3\)/)
    assert.match(contentViewSource, /changeBullets\(reformPackage, t, language, 6\)/)
    assert.match(contentViewSource, /className="change-bullet-list"/)
    assert.match(contentViewSource, /className="latest-change-source"/)
    assert.match(contentViewSource, /UpcomingDatesPreview/)
    assert.match(contentViewSource, /SourceChecksStrip/)
    assert.match(contentViewSource, /RegisterPreviewTable/)
    assert.match(contentViewSource, /digestChangeText\(reformPackage, t, language\)/)
    assert.match(contentViewSource, /packageDigest\(reformPackage, language\)/)
    assert.doesNotMatch(contentViewSource, /latest-change-card__summary/)
    assert.doesNotMatch(contentViewSource, /const firstMeasure = parameterList\(reformPackage, t\)\[0\]/)
  })

  it('sorts reform packages newest to oldest for latest changes and archive display', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')
    const sorted = sortReformPackagesNewestFirst(artifact.reform_packages)
    const sortedDates = sorted.map((reformPackage) => reformPackage.current_stage_date)

    assert.ok(sorted.length > 4)
    assert.equal(datesNewestFirst(sortedDates), true)
    assert.match(contentViewSource, /sortReformPackagesNewestFirst\(packages\)/)
    assert.match(contentViewSource, /<LatestChangesSection[\s\S]*packages=\{sortedPackages\}/)
    assert.match(contentViewSource, /packages=\{filteredPackages\}/)
    assert.match(contentViewSource, /activeView === 'latestChanges'/)
    assert.match(contentViewSource, /activeView === 'register'/)
    assert.match(contentViewSource, /activeView === 'upcomingDates'/)
    assert.match(contentViewSource, /<RegisterPreviewTable packages=\{packages\.slice\(0, 5\)\}/)
  })

  it('sorts Research Updates newest to oldest before rendering', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')
    const sorted = sortResearchUpdatesNewestFirst(artifact.research_updates)
    const sortedDates = sorted
      .map((update) => update.published_at ?? update.as_of_date)
      .filter((value): value is string => typeof value === 'string')

    assert.ok(sorted.length >= 4)
    assert.deepEqual(
      sorted.map((update) => update.id),
      [...sorted].sort((first, second) => {
        const firstDate = first.published_at ?? first.as_of_date ?? ''
        const secondDate = second.published_at ?? second.as_of_date ?? ''
        if (firstDate !== secondDate) return secondDate.localeCompare(firstDate)
        return first.title.localeCompare(second.title)
      }).map((update) => update.id),
    )
    assert.equal(datesNewestFirst(sortedDates), true)
    assert.match(contentViewSource, /sortResearchUpdatesNewestFirst\(content\.research_updates \?\? \[\]\)/)
  })

  it('keeps individual reform milestones in natural chronological sequence', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const urbanization = artifact.reform_packages.find(
      (reformPackage: { package_id: string }) =>
        reformPackage.package_id === 'pkg-urbanization-construction-permits-housing-2026',
    )
    const sorted = sortMilestonesChronologically(urbanization.implementation_milestones)

    assert.deepEqual(
      sorted.map((milestone) => `${milestone.date}:${milestone.event_type}`),
      [
        '2026-06-01:effective_date',
        '2026-06:target_deadline',
        '2026-07-01:effective_date',
        '2026-07:target_deadline',
        '2026:target_deadline',
      ],
    )
  })

  it('keeps the register archive as source-style reform change bullets without old dossier labels', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /ReformArchive/)
    assert.match(contentViewSource, /change-bullet-list--archive/)
    assert.match(contentViewSource, /archive-summary__preview/)
    assert.doesNotMatch(contentViewSource, /Who is affected/)
    assert.doesNotMatch(contentViewSource, /Effective date \/ status/)
    assert.doesNotMatch(contentViewSource, /New rule \/ measure/)
    assert.doesNotMatch(contentViewSource, /Amounts \/ thresholds \/ deadlines/)
    assert.doesNotMatch(
      contentViewSource,
      /Who is affected|New rule \/ measure|Amounts \/ thresholds \/ deadlines|Effective date \/ status/i,
    )
  })

  it('uses official-language reform content when the artifact provides it', async () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const firstPackage = artifact.reform_packages[0]
    firstPackage.localized = {
      title: { ru: 'Русское название реформы из официального источника' },
      parameters_or_amounts: {
        ru: ['С 1 июля 2026 года меняется порядок лицензирования медицинской деятельности.'],
      },
      digest: {
        ru: {
          changed: 'С 1 июля 2026 года меняется порядок лицензирования медицинской деятельности.',
          document: 'Русский официальный документ',
        },
      },
    }
    firstPackage.official_source_events[0].localized = {
      title: { ru: 'Русский официальный документ' },
      source_url: { ru: 'https://president.uz/ru/lists/view/9164' },
      source_url_status: { ru: 'verified' },
    }

    const content = knowledgeHubArtifactToContent(artifact)
    const i18n = await createKnowledgeHubTestI18n('ru')
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KnowledgeHubContentView content={content} />
      </I18nextProvider>,
    )

    assert.match(html, /Русское название реформы из официального источника/)
    assert.match(html, /С 1 июля 2026 года меняется порядок лицензирования медицинской деятельности\./)
    assert.match(html, /https:\/\/president\.uz\/ru\/lists\/view\/9164/)
  })

  it('keeps visible reform summaries and Key Measures copy short and change-focused', async () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const visibleCopy = artifact.reform_packages.map(visibleReformCopy).join('\n')
    const content = knowledgeHubArtifactToContent(artifact)
    const i18n = await createKnowledgeHubTestI18n()
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KnowledgeHubContentView content={content} />
      </I18nextProvider>,
    )

    assert.match(visibleCopy, /From 2026-07-01, medical licensing procedures change/)
    assert.match(visibleCopy, /Platform screen doors will be tested at Shahriston metro station/)
    assert.match(visibleCopy, /The “zero bureaucracy” principle is proposed for 783 public services/)
    assert.match(visibleCopy, /550 public services are to be converted to electronic format/)
    assert.ok(
      artifact.reform_packages.every((reformPackage: { short_summary?: string }) =>
        (reformPackage.short_summary ?? '').split(/(?<=[.!?])\s+/).filter(Boolean).length <= 1,
      ),
    )
    assert.doesNotMatch(
      `${visibleCopy}\n${html}`,
      /\b(Tracks|source-backed|source verified|verified official source event|without inferring|dossier|measure recorded|source event recorded|Source-reported)\b/i,
    )
    assert.doesNotMatch(
      `${visibleCopy}\n${html}`,
      /Digital public-service procedures are updated|Legal-service processes are simplified|Administrative burden reduction is the stated channel/i,
    )
    assert.doesNotMatch(`${visibleCopy}\n${html}`, /&(laquo|raquo|ndash|mdash|amp);/i)
    assert.doesNotMatch(`${visibleCopy}\n${html}`, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \/ Презентации/i)
  })

  it('renders search and compact archive controls instead of a selected-dossier desk', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /TrackerControlsPanel/)
    assert.match(contentViewSource, /type="search"/)
    assert.match(contentViewSource, /tracker-controls__advanced/)
    assert.match(contentViewSource, /sourceHost/)
    assert.match(contentViewSource, /ReformArchive/)
    assert.match(contentViewSource, /className="archive-item"/)
    assert.match(contentViewSource, /<details/)
    assert.match(contentViewSource, /TimelineChips/)
    assert.match(contentViewSource, /ModelLensChips/)

    assert.doesNotMatch(contentViewSource, /DossierDetail/)
    assert.doesNotMatch(contentViewSource, /selectedPackageId/)
    assert.doesNotMatch(contentViewSource, /dossier-desk/)
    assert.doesNotMatch(contentViewSource, /dossier-rail/)
  })

  it('keeps source checks and selection rules as compact supporting disclosures', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /SupportingInfo/)
    assert.match(contentViewSource, /sourceDiagnosticsSummary/)
    assert.match(contentViewSource, /support\.sourcesTitle/)
    assert.match(contentViewSource, /support\.selectionTitle/)
    assert.match(contentViewSource, /rulebook\?\.actual_reform_definition/)
    assert.doesNotMatch(contentViewSource, /methodology-rules/)
    assert.doesNotMatch(contentViewSource, /source-library-list/)
  })

  it('renders research updates and literature hub without exposing old policy-brief or model-map tabs', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.ok(artifact.research_updates.length >= 3)
    assert.ok(artifact.literature_items.length >= 3)
    assert.match(contentViewSource, /ResearchUpdatesSection/)
    assert.match(contentViewSource, /research-update-row/)
    assert.match(contentViewSource, /content\.research_updates/)
    assert.match(contentViewSource, /why_relevant/)
    assert.match(contentViewSource, /model_ids/)
    assert.match(contentViewSource, /LiteratureHubSection/)
    assert.match(contentViewSource, /content\.literature_items/)
    assert.match(contentViewSource, /literature-table/)

    assert.doesNotMatch(contentViewSource, /PolicyBriefsSection/)
    assert.doesNotMatch(contentViewSource, /policy-brief-card/)
    assert.doesNotMatch(contentViewSource, /impact-package-card/)
    assert.doesNotMatch(contentViewSource, /BriefPackageList/)
  })

  it('shows active model lenses and muted planned model lenses', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')
    const activeIds = artifact.model_impact_map.active_lenses.map((lens: { id: string; status: string }) => `${lens.id}:${lens.status}`)
    const gatedIds = artifact.model_impact_map.gated_lenses.map((lens: { id: string; status: string }) => `${lens.id}:${lens.status}`)

    assert.deepEqual(activeIds.sort(), ['CGE:experimental_reference', 'DFM:possible_lens', 'I-O:possible_lens', 'PE:possible_lens', 'QPM:possible_lens'].sort())
    assert.deepEqual(
      gatedIds.sort(),
      ['FPP:planned_gated', 'HFI:planned_gated', 'Synthesis:planned_gated'].sort(),
    )
    assert.ok(
      artifact.model_impact_map.package_links.every((link: { active_lenses: { model_id: string }[] }) =>
        link.active_lenses.every((lens) => ['QPM', 'DFM', 'I-O', 'PE', 'CGE'].includes(lens.model_id)),
      ),
    )
    assert.match(contentViewSource, /model-chip--active/)
    assert.match(contentViewSource, /model-chip--planned/)
    assert.match(contentViewSource, /model-chip--experimental/)
    assert.match(contentViewSource, /experimentalReference/)
    assert.match(contentViewSource, /gatedLenses\(content\)/)
  })

  it('covers visible Knowledge Hub v3 strings in EN, RU, and UZ locales', () => {
    for (const localePath of LOCALE_SOURCES) {
      const locale = JSON.parse(readFileSync(localePath, 'utf8'))
      assert.equal(typeof locale.pages.knowledgeHub.title, 'string')
      assert.equal(typeof locale.pages.knowledgeHub.description, 'string')
      assert.equal(typeof locale.knowledgeHub.sections.reformTracker, 'string')
      assert.equal(typeof locale.knowledgeHub.sections.researchUpdates, 'string')
      assert.equal(typeof locale.knowledgeHub.sections.literatureHub, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.filters.search, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.filters.more, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.filters.status, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.filters.source, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.views.latestChanges, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.views.register, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.views.upcomingDates, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.archive.title, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.archive.reformChanges, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.archive.modelLenses, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.registerPreview.title, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.upcoming.title, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.sourceChecks.reforms, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.support.sourcesTitle, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.support.selectionTitle, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.title, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.topic, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.models, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.methods, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.relevance, 'string')
      assert.equal(typeof locale.knowledgeHub.researchUpdates.source, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.title, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.model, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.method, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.year, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.source, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.referenceTitle, 'string')
      assert.equal(typeof locale.knowledgeHub.literatureHub.openSource, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.dossier.openOfficialSourceAria, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.dossier.sourceLinkMeta, 'string')
    }
  })

  it('keeps internal or LLM-style wording out of the visible Knowledge Hub v3 copy', () => {
    const locale = JSON.parse(readFileSync(LOCALE_SOURCES[0], 'utf8'))
    const visibleCopy = collectStrings({
      page: locale.pages.knowledgeHub,
      header: locale.knowledgeHub.reformTracker.header,
      metrics: locale.knowledgeHub.reformTracker.metrics,
      filters: locale.knowledgeHub.reformTracker.filters,
      views: locale.knowledgeHub.reformTracker.views,
      latestChanges: locale.knowledgeHub.reformTracker.latestChanges,
      registerPreview: locale.knowledgeHub.reformTracker.registerPreview,
      upcoming: locale.knowledgeHub.reformTracker.upcoming,
      sourceChecks: locale.knowledgeHub.reformTracker.sourceChecks,
      archive: locale.knowledgeHub.reformTracker.archive,
      support: locale.knowledgeHub.reformTracker.support,
      researchUpdates: locale.knowledgeHub.researchUpdates,
      literatureHub: locale.knowledgeHub.literatureHub,
      sections: {
        reformTracker: locale.knowledgeHub.sections.reformTracker,
        researchUpdates: locale.knowledgeHub.sections.researchUpdates,
        literatureHub: locale.knowledgeHub.sections.literatureHub,
      },
    }).join('\n')

    assert.doesNotMatch(visibleCopy, /\b(candidate|review queue|RSS|intelligence feed|artifact|configured-source|source-backed|diagnostics|intake|rulebook|guarded export|model-output)\b/i)
    assert.doesNotMatch(visibleCopy, /\b(why it matters|insight|AI)\b/i)
  })

  it('does not render selected enum values as raw visible UI strings', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.doesNotMatch(contentViewSource, />\s*high\s*</)
    assert.doesNotMatch(contentViewSource, />\s*instructions_issued\s*</)
    assert.doesNotMatch(contentViewSource, />\s*official_policy_announcement\s*</)
  })

  it('opens official and literature source links outside the SPA', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /target: '_blank'/)
    assert.match(contentViewSource, /rel: 'noopener noreferrer'/)
    assert.match(contentViewSource, /href=\{sourceUrl\}/)
    assert.match(contentViewSource, /href=\{update\.source_url\}/)
    assert.match(contentViewSource, /href=\{item\.url\}/)
    assert.match(contentViewSource, /openOfficialSourceAria/)
    assert.match(contentViewSource, /sourceLinkMeta/)
  })
})
