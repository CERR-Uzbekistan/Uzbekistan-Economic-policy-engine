import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const KNOWLEDGE_HUB_PAGE_SOURCE = fileURLToPath(
  new URL('../../../src/pages/KnowledgeHubPage.tsx', import.meta.url),
)

describe('Knowledge Hub page', () => {
  it('loads and renders tracker artifact content instead of the pending surface', () => {
    const source = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.match(source, /<PageHeader\s+[\s\S]*title=\{t\('pages\.knowledgeHub\.title'\)\}/)
    assert.match(source, /description=\{t\('pages\.knowledgeHub\.description'\)\}/)
    assert.match(source, /loadKnowledgeHubSourceState/)
    assert.match(source, /KnowledgeHubContentView/)
    assert.match(source, /extractionModeLabel/)
    assert.match(source, /accepted records separated from candidates/)
    assert.match(source, /Accepted reforms/)
    assert.match(source, /extracted_at/)

    assert.doesNotMatch(source, /PendingSurface/)
    assert.doesNotMatch(source, /knowledgeHub\.pending/)
  })

  it('keeps hidden mock reform and brief components out of the page route', () => {
    const pageSource = readFileSync(KNOWLEDGE_HUB_PAGE_SOURCE, 'utf8')

    assert.doesNotMatch(pageSource, /BriefCard/)
    assert.doesNotMatch(pageSource, /ResearchBriefList/)
    assert.doesNotMatch(pageSource, /knowledge-hub-static-banner/)
    assert.doesNotMatch(pageSource, /hub-grid/)
  })
})
