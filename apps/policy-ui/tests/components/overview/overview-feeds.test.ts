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
    assert.match(source, /useSyncExternalStore/)
    assert.match(source, /listScenarios/)
    assert.match(source, /subscribeScenarioStore/)
    assert.doesNotMatch(source, /activityFeed\.policy_actions/)
    assert.match(source, /overview_artifact/)
    assert.match(source, /overview\.feeds\.savedScenarios\.title/)
    assert.match(source, /overview\.feeds\.savedScenarios\.openLab/)
    assert.match(source, /overview\.feeds\.savedScenarios\.type/)
    assert.doesNotMatch(source, /feed-col--note/)
    assert.doesNotMatch(source, /overview\.feeds\.note/)
  })

  it('builds the latest reform preview from Knowledge Hub packages newest first', () => {
    const preview = buildKnowledgeHubReformPreview(loadKnowledgeHubContent(), 'en')
    const dates = preview.map((item) => item.date)

    assert.equal(preview.length, 3)
    assert.deepEqual(dates, [...dates].sort().reverse())
    assert.ok(preview.every((item) => item.title.length > 0))
    assert.ok(preview.every((item) => item.changed.length > 0))
  })

  it('uses official-language Knowledge Hub titles when available', () => {
    const englishPreview = buildKnowledgeHubReformPreview(loadKnowledgeHubContent(), 'en')
    const preview = buildKnowledgeHubReformPreview(loadKnowledgeHubContent(), 'ru')

    assert.equal(preview.length, 3)
    assert.ok(preview.some((item, index) => item.title !== englishPreview[index]?.title))
  })
})
