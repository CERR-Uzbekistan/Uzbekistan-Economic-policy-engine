import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { buildKnowledgeHubReformPreview } from '../../../src/components/overview/overview-reform-preview.js'
import { knowledgeHubArtifactToContent } from '../../../src/data/adapters/knowledge-hub.js'
import type { KnowledgeHubArtifact } from '../../../src/data/knowledge-hub/artifact-types.js'

const OVERVIEW_FEEDS_SOURCE = join(process.cwd(), 'src', 'components', 'overview', 'OverviewFeeds.tsx')
const PUBLIC_KNOWLEDGE_HUB_ARTIFACT = join(process.cwd(), 'public', 'data', 'knowledge-hub.json')

function loadKnowledgeHubContent() {
  return knowledgeHubArtifactToContent(
    JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8')) as KnowledgeHubArtifact,
  )
}

describe('OverviewFeeds Knowledge Hub reform preview', () => {
  it('loads reforms from the Knowledge Hub source instead of Overview policy_actions', () => {
    const source = readFileSync(OVERVIEW_FEEDS_SOURCE, 'utf8')

    assert.match(source, /loadKnowledgeHubSourceState/)
    assert.match(source, /buildKnowledgeHubReformPreview\(knowledgeHubState\.content/)
    assert.doesNotMatch(source, /activityFeed\.policy_actions/)
    assert.match(source, /overview_artifact/)
  })

  it('builds the latest reform preview from Knowledge Hub packages newest first', () => {
    const preview = buildKnowledgeHubReformPreview(loadKnowledgeHubContent(), 'en')

    assert.equal(preview.length, 3)
    assert.equal(preview[0].date, '2026-05-14')
    assert.match(preview[0].title, /Digital public service|bureaucracy/i)
    assert.match(preview[0].changed, /Eliminating Bureaucracy|state-body functions/i)
    assert.equal(preview[1].date, '2026-05-13')
    assert.equal(preview[2].date, '2026-05-12')
  })

  it('uses official-language Knowledge Hub titles when available', () => {
    const preview = buildKnowledgeHubReformPreview(loadKnowledgeHubContent(), 'ru')

    assert.equal(preview.length, 3)
    assert.match(preview[0].title, /Рассмотрены меры/)
    assert.doesNotMatch(preview[0].title, /Digital public service/)
  })
})
