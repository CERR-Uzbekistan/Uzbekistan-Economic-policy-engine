import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  knowledgeHubArtifactToContent,
  toKnowledgeHubContent,
} from '../../../src/data/adapters/knowledge-hub.js'
import { validateKnowledgeHubArtifact } from '../../../src/data/knowledge-hub/artifact-guard.js'
import { KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION } from '../../../src/data/knowledge-hub/artifact-types.js'
import { loadKnowledgeHubSourceState } from '../../../src/data/knowledge-hub/source.js'
import { knowledgeHubContentMock } from '../../../src/data/mock/knowledge-hub.js'

const KNOWLEDGE_HUB_SOURCE_PATH = fileURLToPath(
  new URL('../../../../src/data/knowledge-hub/source.ts', import.meta.url),
)
const PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH = fileURLToPath(
  new URL('../../../../public/data/knowledge-hub.json', import.meta.url),
)
const originalFetch = globalThis.fetch
const originalKnowledgeHubArtifactUrl = process.env.VITE_KNOWLEDGE_HUB_ARTIFACT_URL

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalKnowledgeHubArtifactUrl === undefined) {
    delete process.env.VITE_KNOWLEDGE_HUB_ARTIFACT_URL
  } else {
    process.env.VITE_KNOWLEDGE_HUB_ARTIFACT_URL = originalKnowledgeHubArtifactUrl
  }
})

describe('knowledge hub adapter', () => {
  it('maps raw payload into KnowledgeHubContent shape', () => {
    const raw = {
      meta: { reforms_tracked: 2, research_briefs: 1, literature_items: 5 },
      reforms: [
        {
          id: 'r-1',
          date_label: '10 Jan 2026',
          status: 'in_progress',
          title: 'Reform 1',
          mechanism: 'Mechanism',
          domain_tag: 'Trade',
          model_refs: ['PE', 'CGE'],
        },
      ],
      briefs: [
        {
          id: 'b-1',
          byline: { ai_drafted: true, reviewed_by: 'CERR', date_label: '05 Mar' },
          title: 'Brief 1',
          summary: 'Summary',
          model_refs: ['QPM'],
        },
      ],
    }
    const content = toKnowledgeHubContent(raw)

    assert.equal(content.reforms.length, 1)
    assert.equal(content.reforms[0].status, 'in_progress')
    assert.deepEqual(content.reforms[0].model_refs, ['PE', 'CGE'])
    assert.equal(content.briefs.length, 1)
    assert.equal(content.briefs[0].byline.ai_drafted, true)
    assert.equal(content.briefs[0].byline.reviewed_by, 'CERR')
    assert.equal(content.meta.literature_items, 5)
  })

  it('maps source-extracted candidate payload fields without mock reform conversion', () => {
    const content = toKnowledgeHubContent({
      meta: { candidate_items: 1, sources_configured: 1 },
      extraction_mode: 'fixture-demo',
      extraction_mode_label: 'Fixture/demo intake',
      candidates: [
        {
          id: 'candidate-1',
          extraction_state: 'source-extracted',
          review_state: 'unreviewed',
          review_status: 'needs_review',
          title: 'Policy rate consultation',
          summary: 'Consultation summary.',
          domain_tag: 'Monetary',
          reform_category: 'monetary_policy',
          evidence_types: ['regulatory_parameter_change'],
          relevance_score: 50,
          inclusion_reason: 'Included by Monetary or financial-sector parameter.',
          matched_include_rules: ['monetary-or-financial-parameter'],
          source_institution: 'Central Bank of Uzbekistan',
          source_url: 'https://cbu.uz/example',
          source_published_at: '2026-04-25',
          extracted_at: '2026-05-05T08:00:00.000Z',
          caveats: ['Unreviewed candidate.'],
        },
      ],
    })

    assert.equal(content.reforms.length, 0)
    assert.equal(content.briefs.length, 0)
    assert.equal(content.candidates?.length, 1)
    assert.equal(content.candidates?.[0].extraction_state, 'source-extracted')
    assert.equal(content.candidates?.[0].review_status, 'needs_review')
    assert.equal(content.extraction_mode, 'fixture-demo')
    assert.equal(content.extraction_mode_label, 'Fixture/demo intake')
    assert.equal(content.meta.candidate_items, 1)
    assert.equal(content.meta.sources_configured, 1)
  })

  it('defaults status to planned and applies safe fallbacks on missing fields', () => {
    const content = toKnowledgeHubContent({
      reforms: [{}],
      briefs: [{}],
    })

    assert.equal(content.reforms[0].status, 'planned')
    assert.equal(content.reforms[0].title, 'Untitled reform')
    assert.equal(content.briefs[0].title, 'Untitled brief')
    assert.equal(content.briefs[0].byline.ai_drafted, false)
  })

  it('prototype seed mock carries 4 reforms, 3 briefs, one AI-drafted brief', () => {
    assert.equal(knowledgeHubContentMock.reforms.length, 4)
    assert.equal(knowledgeHubContentMock.briefs.length, 3)
    const aiDrafted = knowledgeHubContentMock.briefs.filter((brief) => brief.byline.ai_drafted)
    assert.equal(aiDrafted.length, 1)
    assert.equal(aiDrafted[0].byline.reviewed_by, 'CERR Trade Desk')
    const planned = knowledgeHubContentMock.reforms.filter((reform) => reform.status === 'planned')
    assert.equal(planned.length, 1)
    assert.equal(planned[0].title, 'WTO accession · final tariff schedule')
  })

  it('validates and adapts the generated public candidate artifact', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    const validation = validateKnowledgeHubArtifact(artifact)

    assert.equal(validation.ok, true)
    assert.equal(validation.ok ? validation.value.schema_version : null, KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION)
    assert.equal(validation.ok ? validation.value.extraction_mode : null, 'fixture-demo')
    assert.equal(validation.ok ? validation.value.extraction_mode_label : null, 'Fixture/demo intake')
    assert.ok(validation.ok && validation.value.rulebook.include_rules.length > 0)
    assert.ok(validation.ok && validation.value.rulebook.exclude_rules.length > 0)
    assert.ok(validation.ok && validation.value.rulebook.exclusion_reasons.length > 0)
    assert.ok(validation.ok && validation.value.candidates.length > 0)
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.extraction_state === 'source-extracted'))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.review_state === 'unreviewed'))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.review_status === 'needs_review'))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.inclusion_reason.length > 0))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.evidence_types.length > 0))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.matched_include_rules.length > 0))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.source_institution.length > 0))
    assert.ok(validation.ok && validation.value.candidates.every((candidate) => candidate.source_url.startsWith('https://')))

    const content = knowledgeHubArtifactToContent(validation.ok ? validation.value : artifact)
    assert.equal(content.reforms.length, 0)
    assert.equal(content.briefs.length, 0)
    assert.equal(content.candidates?.length, validation.ok ? validation.value.candidates.length : 0)
    assert.equal(content.meta.candidate_items, validation.ok ? validation.value.candidates.length : 0)
    assert.equal(content.meta.sources_configured, 10)
    assert.equal(content.meta.candidate_items, 12)
    assert.equal(content.extraction_mode_label, 'Fixture/demo intake')
    assert.ok(content.caveats?.some((caveat) => caveat.includes('Fixture/demo mode')))
    assert.ok(content.caveats?.some((caveat) => caveat.includes('not an official reviewed policy database')))
  })

  it('loads Knowledge Hub from the static artifact and does not import hidden mock content', async () => {
    const source = readFileSync(KNOWLEDGE_HUB_SOURCE_PATH, 'utf8')
    const beforeMockSnapshot = JSON.stringify(knowledgeHubContentMock)
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    let fetchCalls = 0

    globalThis.fetch = (async () => {
      fetchCalls += 1
      return new Response(JSON.stringify(artifact), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const state = await loadKnowledgeHubSourceState()

    assert.doesNotMatch(source, /knowledgeHubContentMock/)
    assert.equal(state.status, 'ready')
    assert.equal(state.mode, 'artifact')
    assert.equal(fetchCalls, 1)
    assert.equal(state.content?.meta.reforms_tracked, 0)
    assert.equal(state.content?.meta.research_briefs, 0)
    assert.equal(state.content?.meta.literature_items, 0)
    assert.equal(state.content?.meta.candidate_items, artifact.candidates.length)
    assert.equal(state.content?.reforms.length, 0)
    assert.equal(state.content?.briefs.length, 0)
    assert.equal(state.content?.extraction_mode, 'fixture-demo')
    assert.equal(state.content?.extraction_mode_label, 'Fixture/demo intake')
    assert.equal(state.content?.candidates?.[0].extraction_state, 'source-extracted')
    assert.equal(JSON.stringify(knowledgeHubContentMock), beforeMockSnapshot)
  })
})
