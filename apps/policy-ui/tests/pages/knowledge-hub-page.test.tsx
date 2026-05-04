import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const KNOWLEDGE_HUB_PAGE_SOURCE = fileURLToPath(
  new URL('../../../src/pages/KnowledgeHubPage.tsx', import.meta.url),
)

describe('Knowledge Hub page', () => {
  it('renders only PageHeader and PendingSurface instead of hidden content surfaces', () => {
    const source = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')
    const renderedComponentTags = Array.from(
      source.matchAll(/^\s*<([A-Z][A-Za-z0-9]*)\b/gm),
      ([, tag]) => tag,
    )

    assert.deepEqual(renderedComponentTags, ['PageContainer', 'PageHeader', 'PendingSurface'])
    assert.match(source, /<PageHeader\s+[\s\S]*title=\{t\('pages\.knowledgeHub\.title'\)\}/)
    assert.match(source, /description=\{t\('pages\.knowledgeHub\.description'\)\}/)
    assert.match(source, /<PendingSurface\s+[\s\S]*title=\{t\('knowledgeHub\.pending\.title'\)\}/)
    assert.match(source, /message=\{t\('knowledgeHub\.pending\.message'\)\}/)
    assert.match(source, /reasonLabel=\{t\('knowledgeHub\.pending\.status'\)\}/)
    assert.match(source, /nextStep=\{t\('knowledgeHub\.pending\.nextStep'\)\}/)

    assert.doesNotMatch(source, /KnowledgeHubContentView/)
    assert.doesNotMatch(source, /ReformTimeline/)
    assert.doesNotMatch(source, /BriefCard/)
    assert.doesNotMatch(source, /ResearchBriefList/)
    assert.doesNotMatch(source, /knowledge-hub-static-banner/)
    assert.doesNotMatch(source, /hub-grid/)
    assert.doesNotMatch(source, /knowledge-hub-reform-timeline-title/)
  })

  it('routes the page through PendingSurface instead of static reform and brief cards', () => {
    const source = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.match(source, /import\s+\{\s*PageHeader\s*\}/)
    assert.match(source, /import\s+\{\s*PendingSurface\s*\}/)
    assert.match(source, /<PendingSurface/)
    assert.match(source, /knowledgeHub\.pending\.message/)
    assert.match(source, /knowledgeHub\.pending\.reason/)
    assert.doesNotMatch(source, /import\s+\{\s*KnowledgeHubContentView\s*\}/)
    assert.doesNotMatch(source, /from ['"].*KnowledgeHubContentView/)
    assert.doesNotMatch(source, /KnowledgeHubContentView/)
    assert.doesNotMatch(source, /loadKnowledgeHubSourceState/)
    assert.doesNotMatch(source, /TrustStateLabel/)
  })
})
