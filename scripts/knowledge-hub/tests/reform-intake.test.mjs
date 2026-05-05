import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildKnowledgeHubCandidateArtifact,
  buildKnowledgeHubCandidateArtifactWithDiagnostics,
  extractCandidatesFromSource,
  FIXTURE_DEMO_EXTRACTION_MODE,
  KNOWLEDGE_HUB_SCHEMA_VERSION,
  REFORM_SOURCE_DEFINITIONS,
} from '../reform-intake.mjs'

describe('Knowledge Hub reform intake', () => {
  it('extracts only reform-like candidates from configured source text', () => {
    const html = `
      <article>
        <time datetime="2026-05-01">1 May 2026</time>
        <h2><a href="/policy-rate">Policy rate decision framework consultation</a></h2>
        <p class="summary">A policy rate transmission reform consultation.</p>
      </article>
      <article>
        <time datetime="2026-05-02">2 May 2026</time>
        <h2><a href="/training">Staff training calendar</a></h2>
        <p>Training only.</p>
      </article>
    `
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.title, 'Policy rate decision framework consultation')
    assert.equal(candidate.extraction_state, 'source-extracted')
    assert.equal(candidate.review_state, 'unreviewed')
    assert.equal(candidate.review_status, 'needs_review')
    assert.equal(candidate.source_institution, 'Test Institution')
    assert.equal(candidate.source_url, 'https://example.test/policy-rate')
    assert.equal(candidate.extracted_at, '2026-05-05T08:00:00.000Z')
  })

  it('builds a deterministic static artifact from source fixtures', async () => {
    const artifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })

    assert.equal(artifact.schema_version, KNOWLEDGE_HUB_SCHEMA_VERSION)
    assert.equal(artifact.extraction_mode, FIXTURE_DEMO_EXTRACTION_MODE)
    assert.equal(artifact.extraction_mode_label, 'Fixture/demo intake')
    assert.equal(artifact.sources.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(artifact.candidates.length, 4)
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_state === 'source-extracted'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_status === 'needs_review'))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('Fixture/demo mode')))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('not an official reviewed policy database')))
  })

  it('uses the current official gov.uz Ministry News source for MEF intake', () => {
    const mefSource = REFORM_SOURCE_DEFINITIONS.find((source) => source.id === 'mef-policy-news')

    assert.equal(mefSource.url, 'https://gov.uz/en/imv/news/news')
    assert.equal(mefSource.api_url, 'https://api-portal.gov.uz/authorities/news/category?code_name=news&page=1')
    assert.deepEqual(mefSource.api_headers, {
      code: 'imv',
      language: 'en',
    })
  })

  it('extracts MEF candidates from the official gov.uz Ministry News API shape', () => {
    const payload = JSON.stringify({
      data: [
        {
          id: 161792,
          date: '2026-05-05 14:25:00',
          title: 'Analytical Report on the Fulfillment of Target Indicators in Agriculture, Forestry, and Fisheries',
          anons: 'Budget and finance policy indicators were reviewed for the first quarter.',
        },
        {
          id: 161541,
          date: '2026-05-04 19:50:00',
          title: 'Meeting held with international partners',
          anons: 'Protocol meeting only.',
        },
      ],
    })
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'mef-policy-news',
        institution: 'Ministry of Economy and Finance of Uzbekistan',
        url: 'https://gov.uz/en/imv/news/news',
      },
      payload,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.title, 'Analytical Report on the Fulfillment of Target Indicators in Agriculture, Forestry, and Fisheries')
    assert.equal(candidate.source_url, 'https://gov.uz/en/imv/news/view/161792')
    assert.equal(candidate.source_published_at, '2026-05-05 14:25:00')
    assert.equal(candidate.source_institution, 'Ministry of Economy and Finance of Uzbekistan')
    assert.equal(candidate.review_status, 'needs_review')
  })

  it('reports configured-source fetch counts and failures without dropping successful candidates', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'ok-source',
          institution: 'OK Institution',
          url: 'https://example.test/ok',
        },
        {
          id: 'failed-source',
          institution: 'Failed Institution',
          url: 'https://example.test/fail',
        },
      ],
      fetchImpl: async (url) => {
        if (url.includes('/fail')) {
          throw new Error('synthetic fetch failure')
        }
        return new Response(`
          <article>
            <time datetime="2026-05-03">3 May 2026</time>
            <h2><a href="/tax">Tax administration reform notice</a></h2>
            <p>Tax and budget reform candidate text.</p>
          </article>
        `)
      },
    })

    assert.equal(diagnostics.candidate_count, 1)
    assert.equal(diagnostics.source_results.length, 2)
    assert.equal(diagnostics.source_results[0].ok, true)
    assert.equal(diagnostics.source_results[0].candidate_count, 1)
    assert.equal(diagnostics.source_results[1].ok, false)
    assert.equal(diagnostics.source_failures.length, 1)
    assert.equal(diagnostics.artifact.candidates[0].source_institution, 'OK Institution')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('configured sources failed')))
  })

  it('deduplicates repeated source candidates by candidate id before artifact output', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'duplicate-source',
          institution: 'Duplicate Institution',
          url: 'https://example.test/news/',
          fixture_path: REFORM_SOURCE_DEFINITIONS[0].fixture_path,
        },
      ],
    })

    const candidateIds = diagnostics.artifact.candidates.map((candidate) => candidate.id)
    assert.equal(candidateIds.length, new Set(candidateIds).size)
  })
})
