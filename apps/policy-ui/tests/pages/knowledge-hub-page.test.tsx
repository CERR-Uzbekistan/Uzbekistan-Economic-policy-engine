import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const KNOWLEDGE_HUB_PAGE_SOURCE = fileURLToPath(
  new URL('../../../src/pages/KnowledgeHubPage.tsx', import.meta.url),
)
const KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE = fileURLToPath(
  new URL('../../../src/components/knowledge-hub/KnowledgeHubContentView.tsx', import.meta.url),
)
const LOCALE_SOURCES = ['en', 'ru', 'uz'].map((locale) =>
  fileURLToPath(new URL(`../../../src/locales/${locale}/common.json`, import.meta.url)),
)

describe('Knowledge Hub page', () => {
  it('loads and renders tracker artifact content instead of the pending surface', () => {
    const source = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.match(source, /<PageHeader\s+[\s\S]*title=\{t\('pages\.knowledgeHub\.title'\)\}/)
    assert.match(source, /description=\{t\('pages\.knowledgeHub\.description'\)\}/)
    assert.match(source, /loadKnowledgeHubSourceState/)
    assert.match(source, /KnowledgeHubContentView/)
    assert.match(source, /extractionModeLabel/)
    assert.match(source, /reformTracker\.header\.automaticTracker/)
    assert.match(source, /reformTracker\.header\.packages/)
    assert.match(source, /reformTracker\.header\.lastFetch/)

    assert.doesNotMatch(source, /PendingSurface/)
    assert.doesNotMatch(source, /knowledgeHub\.pending/)
    assert.doesNotMatch(source, /candidateCount/)
  })

  it('renders package and implementation timeline views without a visible review queue', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.match(contentViewSource, /TrackerTab = 'packages' \| 'timeline'/)
    assert.match(contentViewSource, /ReformPackagesView/)
    assert.match(contentViewSource, /ImplementationTimelineView/)
    assert.match(contentViewSource, /reform-package-table/)
    assert.match(contentViewSource, /reform-dossier/)
    assert.match(contentViewSource, /timeline-milestone/)
    assert.match(contentViewSource, /methodology\.included/)
    assert.match(contentViewSource, /methodology\.excluded/)
    assert.match(contentViewSource, /trackerLabel\(t, 'sourceConfidence'/)
    assert.match(contentViewSource, /trackerLabel\(t, 'eventType'/)
    assert.match(contentViewSource, /trackerLabel\(t, 'evidenceType'/)

    assert.doesNotMatch(contentViewSource, /ReformCandidateList/)
    assert.doesNotMatch(contentViewSource, /Unreviewed candidates/)
    assert.doesNotMatch(contentViewSource, /Review Queue/)
    assert.doesNotMatch(contentViewSource, /\{reformPackage\.source_confidence\}/)
    assert.doesNotMatch(contentViewSource, /\{item\.milestone\.event_type\}/)
    assert.doesNotMatch(contentViewSource, /\{item\.milestone\.evidence_type\}/)
  })

  it('keeps hidden mock reform, brief, and candidate components out of the page route', () => {
    const pageSource = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.doesNotMatch(pageSource, /BriefCard/)
    assert.doesNotMatch(pageSource, /ResearchBriefList/)
    assert.doesNotMatch(pageSource, /ReformCandidateList/)
    assert.doesNotMatch(pageSource, /knowledge-hub-static-banner/)
    assert.doesNotMatch(pageSource, /hub-grid/)
  })

  it('covers visible Reform Tracker strings in EN, RU, and UZ locales', () => {
    for (const localePath of LOCALE_SOURCES) {
      const locale = JSON.parse(readFileSync(localePath, 'utf8'))
      assert.equal(typeof locale.knowledgeHub.reformTracker.tabs.packages, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.tabs.timeline, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.table.package, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.dossier.measureTracks, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.timeline.relatedNext, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.labels.sourceConfidence.high, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.labels.eventType.instructions_issued, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.labels.evidenceType.official_policy_announcement, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.methodology.included, 'string')
      assert.equal(typeof locale.knowledgeHub.reformTracker.methodology.excluded, 'string')
    }
  })

  it('does not render selected enum values as raw visible UI strings', () => {
    const contentViewSource = readFileSync(KNOWLEDGE_HUB_CONTENT_VIEW_SOURCE, 'utf8')

    assert.doesNotMatch(contentViewSource, />\s*high\s*</)
    assert.doesNotMatch(contentViewSource, />\s*instructions_issued\s*</)
    assert.doesNotMatch(contentViewSource, />\s*official_policy_announcement\s*</)
  })
})
