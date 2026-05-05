import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  buildKnowledgeHubCandidateArtifact,
  buildKnowledgeHubCandidateArtifactWithDiagnostics,
  extractCandidateDecisionsFromSource,
  extractCandidatesFromSource,
  FIXTURE_DEMO_EXTRACTION_MODE,
  KNOWLEDGE_HUB_SCHEMA_VERSION,
  REFORM_INTAKE_RULEBOOK,
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
    assert.equal(candidate.reform_category, 'monetary_policy')
    assert.deepEqual(candidate.evidence_types, ['regulatory_parameter_change', 'official_policy_announcement', 'consultation_notice'])
    assert.equal(candidate.relevance_score, 90)
    assert.deepEqual(candidate.matched_include_rules, ['monetary-or-financial-parameter', 'formal-consultation-or-draft'])
    assert.match(candidate.inclusion_reason, /Included by Monetary or financial-sector parameter/)
    assert.equal(candidate.source_institution, 'Test Institution')
    assert.equal(candidate.source_url, 'https://example.test/policy-rate')
    assert.equal(candidate.extracted_at, '2026-05-05T08:00:00.000Z')
  })

  it('defines the reform intake rulebook with include, exclude, evidence, category, score, and reason rules', () => {
    assert.equal(REFORM_INTAKE_RULEBOOK.version, 'knowledge-hub-reform-intake-rulebook.v1')
    assert.ok(REFORM_INTAKE_RULEBOOK.include_rules.some((rule) => rule.id === 'legal-or-regulatory-change'))
    assert.ok(REFORM_INTAKE_RULEBOOK.exclude_rules.some((rule) => rule.id === 'routine-meeting-without-policy-measure'))
    assert.ok(REFORM_INTAKE_RULEBOOK.evidence_types.includes('legal_text'))
    assert.ok(REFORM_INTAKE_RULEBOOK.reform_categories.includes('trade_customs'))
    assert.equal(REFORM_INTAKE_RULEBOOK.relevance_scoring.include_threshold, 40)
    assert.ok(REFORM_INTAKE_RULEBOOK.exclusion_reasons.some((reason) => reason.id === 'routine_meeting_without_policy_measure'))
  })

  it('excludes routine meetings and cooperation news when no policy measure is present', () => {
    const html = `
      <article>
        <time datetime="2026-05-03">3 May 2026</time>
        <h2><a href="/meeting">Discussions Held on Prospects for Expanding Cooperation with JBIC</a></h2>
        <p>A meeting was held on the sidelines of an international forum to exchange views on future cooperation.</p>
      </article>
    `
    const decisions = extractCandidateDecisionsFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(decisions.candidates.length, 0)
    assert.equal(decisions.exclusions.length, 1)
    assert.equal(decisions.exclusions[0].exclusion_reason, 'routine_meeting_without_policy_measure')
    assert.deepEqual(decisions.exclusions[0].matched_include_rules, [])
    assert.ok(decisions.exclusions[0].matched_exclude_rules.includes('routine-meeting-without-policy-measure'))
  })

  it('excludes policy-rate review previews that do not announce a parameter change', () => {
    const html = `
      <article>
        <time datetime="2026-04-25">25 April 2026</time>
        <h2><a href="/rate-review">Monetary policy rate review announced for the next Board meeting</a></h2>
        <p>The Central Bank published materials on inflation conditions, policy rate options, and transmission risks for the upcoming rate decision.</p>
      </article>
    `
    const decisions = extractCandidateDecisionsFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(decisions.candidates.length, 0)
    assert.equal(decisions.exclusions.length, 1)
    assert.equal(decisions.exclusions[0].exclusion_reason, 'routine_meeting_without_policy_measure')
    assert.deepEqual(decisions.exclusions[0].matched_include_rules, [])
    assert.ok(decisions.exclusions[0].matched_exclude_rules.includes('routine-meeting-without-policy-measure'))
  })

  it('retains explicit legal and policy changes even when announced in meeting coverage', () => {
    const html = `
      <article>
        <time datetime="2026-05-04">4 May 2026</time>
        <h2><a href="/customs-resolution">Meeting held on approved customs regulation amendments</a></h2>
        <p>The Cabinet resolution approved amendments introducing risk-based customs clearance rules and electronic declarations.</p>
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

    assert.equal(candidate.title, 'Meeting held on approved customs regulation amendments')
    assert.equal(candidate.reform_category, 'trade_customs')
    assert.ok(candidate.evidence_types.includes('legal_text'))
    assert.ok(candidate.matched_include_rules.includes('legal-or-regulatory-change'))
    assert.ok(candidate.matched_include_rules.includes('trade-customs-modernization'))
    assert.equal(candidate.extraction_state, 'source-extracted')
    assert.equal(candidate.review_state, 'unreviewed')
  })

  it('builds a deterministic static artifact from source fixtures', async () => {
    const artifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })

    assert.equal(artifact.schema_version, KNOWLEDGE_HUB_SCHEMA_VERSION)
    assert.equal(artifact.extraction_mode, FIXTURE_DEMO_EXTRACTION_MODE)
    assert.equal(artifact.extraction_mode_label, 'Fixture/demo intake')
    assert.equal(artifact.rulebook.version, REFORM_INTAKE_RULEBOOK.version)
    assert.equal(artifact.sources.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(artifact.candidates.length, 12)
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_state === 'source-extracted'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_state === 'unreviewed'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_status === 'needs_review'))
    assert.ok(artifact.candidates.every((candidate) => candidate.inclusion_reason.length > 0))
    assert.ok(artifact.candidates.every((candidate) => candidate.evidence_types.length > 0))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('Fixture/demo mode')))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('not an official reviewed policy database')))
  })

  it('configures official source coverage for the requested next batch', () => {
    const sourceIds = REFORM_SOURCE_DEFINITIONS.map((source) => source.id)

    assert.ok(sourceIds.includes('lex-official-legal-acts'))
    assert.ok(sourceIds.includes('president-reform-news'))
    assert.ok(sourceIds.includes('gov-portal-reform-news'))
    assert.ok(sourceIds.includes('tax-committee-news'))
    assert.ok(sourceIds.includes('customs-committee-news'))
    assert.ok(sourceIds.includes('energy-ministry-news'))
    assert.ok(sourceIds.includes('investment-trade-ministry-news'))
    assert.ok(sourceIds.includes('justice-ministry-news'))
    assert.ok(REFORM_SOURCE_DEFINITIONS.every((source) => source.fixture_path))
    assert.ok(REFORM_SOURCE_DEFINITIONS.every((source) => source.url.startsWith('https://')))
  })

  it('has deterministic fixtures and extraction diagnostics for every configured source', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })

    assert.equal(diagnostics.source_results.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(diagnostics.source_results.reduce((sum, source) => sum + source.candidate_count, 0), 13)
    assert.equal(diagnostics.artifact.candidates.length, 12)
    assert.equal(diagnostics.source_failures.length, 0)

    for (const source of REFORM_SOURCE_DEFINITIONS) {
      const fixture = readFileSync(source.fixture_path, 'utf8')
      const decisions = extractCandidateDecisionsFromSource(source, fixture, '2026-05-05T08:00:00.000Z')
      const result = diagnostics.source_results.find((entry) => entry.id === source.id)

      assert.ok(result, `missing diagnostics for ${source.id}`)
      assert.equal(result.ok, true)
      assert.equal(result.parser, source.parser ?? 'auto')
      assert.equal(result.fetch_url, source.api_url ?? source.url)
      assert.equal(result.candidate_count, decisions.candidates.length)
      assert.equal(result.excluded_count, decisions.exclusions.length)
      assert.ok(decisions.candidates.length + decisions.exclusions.length > 0, `fixture should classify ${source.id}`)
    }
  })

  it('uses the current official gov.uz Ministry News source for MEF intake', () => {
    const mefSource = REFORM_SOURCE_DEFINITIONS.find((source) => source.id === 'mef-policy-news')

    assert.equal(mefSource.url, 'https://gov.uz/en/imv/news/news')
    assert.equal(mefSource.api_url, 'https://api-portal.gov.uz/authorities/news/category?code_name=news&page=1')
    assert.deepEqual(mefSource.api_headers, {
      code: 'imv',
      language: 'en',
    })
    assert.equal(mefSource.parser, 'govuz-api')
  })

  it('extracts MEF candidates from the official gov.uz Ministry News API shape', () => {
    const payload = JSON.stringify({
      data: [
        {
          id: 161792,
          date: '2026-05-05 14:25:00',
          title: 'Resolution approved on tax administration amendments for agriculture and fisheries',
          anons: 'The resolution introduces tax reporting amendments and budget monitoring rules for the sector.',
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

    assert.equal(candidate.title, 'Resolution approved on tax administration amendments for agriculture and fisheries')
    assert.equal(candidate.source_url, 'https://gov.uz/en/imv/news/view/161792')
    assert.equal(candidate.source_published_at, '2026-05-05 14:25:00')
    assert.equal(candidate.source_institution, 'Ministry of Economy and Finance of Uzbekistan')
    assert.equal(candidate.reform_category, 'fiscal_tax')
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
    assert.equal(diagnostics.source_results[0].excluded_count, 0)
    assert.equal(diagnostics.source_results[1].ok, false)
    assert.equal(diagnostics.source_failures.length, 1)
    assert.equal(diagnostics.artifact.candidates[0].source_institution, 'OK Institution')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('configured sources failed')))
  })

  it('deduplicates repeated candidates across source definitions before artifact output', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'duplicate-source-a',
          institution: 'Duplicate Institution A',
          url: 'https://example.test/news/',
          fixture_path: REFORM_SOURCE_DEFINITIONS[0].fixture_path,
        },
        {
          id: 'duplicate-source-b',
          institution: 'Duplicate Institution B',
          url: 'https://mirror.example.test/news/',
          fixture_path: REFORM_SOURCE_DEFINITIONS[0].fixture_path,
        },
      ],
    })

    const candidateIds = diagnostics.artifact.candidates.map((candidate) => candidate.id)
    assert.equal(candidateIds.length, new Set(candidateIds).size)
    assert.equal(diagnostics.source_results[0].candidate_count, diagnostics.source_results[1].candidate_count)
    assert.equal(diagnostics.artifact.candidates.length, diagnostics.source_results[0].candidate_count)
  })
})
