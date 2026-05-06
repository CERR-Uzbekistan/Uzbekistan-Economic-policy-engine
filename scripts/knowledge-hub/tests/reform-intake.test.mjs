import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  buildKnowledgeHubCandidateArtifact,
  buildKnowledgeHubCandidateArtifactWithDiagnostics,
  classifyReformCandidateText,
  CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
  extractCandidateDecisionsFromSource,
  extractCandidatesFromSource,
  FIXTURE_DEMO_REFORM_PACKAGES,
  FIXTURE_DEMO_EXTRACTION_MODE,
  KNOWLEDGE_HUB_SCHEMA_VERSION,
  REFORM_INTAKE_RULEBOOK,
  REFORM_SOURCE_DEFINITIONS,
  assembleReformPackagesFromCandidates,
} from '../reform-intake.mjs'

describe('Knowledge Hub reform intake', () => {
  it('excludes consultations without adopted measures or parameter changes', () => {
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

    assert.equal(candidate, undefined)
  })

  it('extracts only hard reform candidates from configured source text', () => {
    const html = `
      <article>
        <time datetime="2026-05-01">1 May 2026</time>
        <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
        <p class="summary">The committee announced amended tax reporting rules, electronic declarations, and budget monitoring steps for taxpayers.</p>
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

    assert.equal(candidate.title, 'Tax administration amendments introduced for electronic VAT reporting')
    assert.equal(candidate.extraction_state, 'source_extracted')
    assert.equal(candidate.review_state, 'candidate')
    assert.equal(candidate.review_status, 'needs_review')
    assert.equal(candidate.reform_category, 'fiscal_tax')
    assert.deepEqual(candidate.evidence_types, [
      'legal_text',
      'official_policy_announcement',
      'implementation_program',
      'budget_tax_measure',
      'regulatory_parameter_change',
    ])
    assert.equal(candidate.relevance_score, 100)
    assert.ok(candidate.matched_include_rules.includes('legal-or-regulatory-change'))
    assert.ok(candidate.matched_include_rules.includes('adopted-policy-measure'))
    assert.ok(candidate.matched_include_rules.includes('fiscal-tax-budget-measure'))
    assert.match(candidate.inclusion_reason, /hard reform signal/)
    assert.equal(candidate.source_institution, 'Test Institution')
    assert.equal(candidate.source_url, 'https://example.test/tax')
    assert.equal(candidate.extracted_at, '2026-05-05T08:00:00.000Z')
  })

  it('defines the reform intake rulebook with include, exclude, evidence, category, score, and reason rules', () => {
    assert.equal(REFORM_INTAKE_RULEBOOK.version, 'knowledge-hub-reform-intake-rulebook.v2')
    assert.match(REFORM_INTAKE_RULEBOOK.actual_reform_definition, /legal or policy instrument/)
    assert.ok(REFORM_INTAKE_RULEBOOK.include_rules.some((rule) => rule.id === 'legal-or-regulatory-change'))
    assert.ok(REFORM_INTAKE_RULEBOOK.include_rules.some((rule) => rule.id === 'adopted-policy-measure'))
    assert.ok(REFORM_INTAKE_RULEBOOK.exclude_rules.some((rule) => rule.id === 'routine-meeting-without-policy-measure'))
    assert.ok(REFORM_INTAKE_RULEBOOK.exclude_rules.some((rule) => rule.id === 'analytical-report-only'))
    assert.ok(REFORM_INTAKE_RULEBOOK.evidence_types.includes('legal_text'))
    assert.ok(REFORM_INTAKE_RULEBOOK.reform_categories.includes('trade_customs'))
    assert.equal(REFORM_INTAKE_RULEBOOK.relevance_scoring.include_threshold, 50)
    assert.ok(REFORM_INTAKE_RULEBOOK.exclusion_reasons.some((reason) => reason.id === 'routine_meeting_without_policy_measure'))
  })

  it('excludes routine meetings and cooperation news when no policy measure is present', () => {
    const html = `
      <article>
        <time datetime="2026-05-03">3 May 2026</time>
        <h2><a href="/meeting">Discussions Held on Prospects for Expanding Cooperation with JBIC</a></h2>
        <p>A meeting was held on the sidelines to exchange views on future cooperation.</p>
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

  it('classifies roundtables, analytical reports, training, cooperation, and generic announcements as exclusions', () => {
    const examples = [
      ['A roundtable discussion was held on SME development', 'routine_meeting_without_policy_measure'],
      ['Analytical Report on the Fulfillment of Target Indicators in Agriculture', 'analytical_report_only'],
      ['Ensuring the implementation of the resolution: training seminar held', 'training_or_outreach_only'],
      ['A new stage of international cooperation will be discussed', 'cooperation_news_without_policy_measure'],
      ['Consultation opens on customs digital corridor', 'generic_announcement_without_policy_action'],
    ]

    for (const [text, reason] of examples) {
      const decision = classifyReformCandidateText(text)

      assert.equal(decision.included, false, text)
      assert.equal(decision.exclusion_reason, reason, text)
    }
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
    assert.equal(decisions.exclusions[0].exclusion_reason, 'analytical_report_only')
    assert.deepEqual(decisions.exclusions[0].matched_include_rules, [])
    assert.ok(decisions.exclusions[0].matched_exclude_rules.includes('analytical-report-only'))
  })

  it('does not treat grant, loan, or financing amounts as parameter changes', () => {
    const examples = [
      'A €9 million grant was announced for regional green development.',
      'A $50 million loan will finance infrastructure preparation.',
      'Financing of 120 million dollars was discussed with partners.',
    ]

    for (const text of examples) {
      const decision = classifyReformCandidateText(text)

      assert.equal(decision.included, false, text)
      assert.ok(!decision.matched_actual_reform_signals.includes('parameter_change'), text)
    }
  })

  it('requires signed financing to be tied to a named adopted program with implementation measures', () => {
    const weakGrantDecision = classifyReformCandidateText(
      'An agreement was signed with GIZ to attract a €9 million grant to strengthen green economic development in the regions of Uzbekistan based on master plans.',
    )

    assert.equal(weakGrantDecision.included, false)
    assert.ok(!weakGrantDecision.matched_actual_reform_signals.includes('binding_financing_program'))
    assert.ok(!weakGrantDecision.matched_actual_reform_signals.includes('parameter_change'))

    const bindingProgramDecision = classifyReformCandidateText(
      'A financing agreement was signed for implementation of the approved Green Regions master plan with implementation measures and an action plan for regional rollout.',
    )

    assert.equal(bindingProgramDecision.included, true)
    assert.ok(bindingProgramDecision.matched_include_rules.includes('binding-international-financing-or-agreement'))
    assert.ok(bindingProgramDecision.matched_actual_reform_signals.includes('binding_financing_program'))
    assert.ok(!bindingProgramDecision.matched_actual_reform_signals.includes('parameter_change'))
  })

  it('retains tax incentive items with real incentive measure evidence', () => {
    const decision = classifyReformCandidateText(
      'Uzbekistan Expands Tax Incentives for Investors Financing Infrastructure Projects',
    )

    assert.equal(decision.included, true)
    assert.ok(decision.matched_include_rules.includes('adopted-policy-measure'))
    assert.ok(decision.matched_include_rules.includes('fiscal-tax-budget-measure'))
    assert.ok(!decision.matched_include_rules.includes('binding-international-financing-or-agreement'))
    assert.ok(decision.matched_actual_reform_signals.includes('adopted_measure'))
    assert.ok(decision.matched_actual_reform_signals.includes('parameter_change'))
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
    assert.equal(candidate.extraction_state, 'source_extracted')
    assert.equal(candidate.review_state, 'candidate')
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
    assert.equal(artifact.source_diagnostics.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(artifact.reform_packages.length, 1)
    assert.equal(artifact.reform_packages[0].title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(artifact.reform_packages[0].official_source_events[0].source_url, 'https://president.uz/en/lists/view/9164')
    assert.equal(artifact.reform_packages[0].implementation_milestones.length, 4)
    assert.equal(artifact.reform_packages[0].financing_or_incentive, '200 billion soums preferential credit resources; loans up to 10 billion soums')
    assert.deepEqual(artifact.accepted_reforms, [])
    assert.equal(artifact.candidates.length, 7)
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_state === 'source_extracted'))
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_mode === 'fixture-demo'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_state === 'candidate'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_status === 'needs_review'))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_url_status === 'not_checked_fixture'))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_institution.length > 0))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_url.startsWith('https://')))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_published_at || candidate.retrieved_at))
    assert.ok(artifact.candidates.every((candidate) => candidate.inclusion_reason.length > 0))
    assert.ok(artifact.candidates.every((candidate) => candidate.evidence_types.length > 0))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('Fixture/demo mode')))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('not an official reviewed policy database')))
  })

  it('marks fixture/demo healthcare package data as fixture-only', () => {
    const healthcarePackage = FIXTURE_DEMO_REFORM_PACKAGES[0]

    assert.equal(healthcarePackage.title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(healthcarePackage.official_source_events[0].source_url_status, 'not_checked_fixture')
    assert.match(healthcarePackage.caveat, /Fixture\/demo/)
    assert.deepEqual(
      healthcarePackage.measure_tracks.map((track) => track.label),
      [
        'licensing reform',
        'accreditation and state-funded service eligibility',
        'state hospital licensing rollout',
        'preferential credit support',
        'investment and PPP agency setup',
      ],
    )
    assert.deepEqual(
      healthcarePackage.implementation_milestones.map((milestone) => milestone.date),
      ['2026-07-01', '2027-04-01', '2028', '2030-12-31'],
    )
  })

  it('assembles configured-source healthcare packages only from verified source events', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9164')) return new Response('<html>ok</html>')
        return new Response(`
          <a href="/en/lists/view/9164">Healthcare quality, licensing, and private-sector participation reform package approved</a>
          <span>01-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.artifact.extraction_mode, CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE)
    assert.equal(diagnostics.artifact.candidates.length, 1)
    assert.equal(diagnostics.artifact.candidates[0].source_url_status, 'verified')
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url, 'https://president.uz/en/lists/view/9164')
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url_status, 'verified')
    assert.match(diagnostics.artifact.reform_packages[0].caveat, /assembled from a verified source event/)
    assert.equal(diagnostics.artifact.reform_packages[0].financing_or_incentive, '200 billion soums preferential credit resources; loans up to 10 billion soums')
    assert.deepEqual(
      diagnostics.artifact.reform_packages[0].implementation_milestones.map((milestone) => milestone.date),
      ['2026-07-01', '2027-04-01', '2028', '2030-12-31'],
    )
  })

  it('does not assemble configured-source packages from unverified source events', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9164')) return new Response('missing', { status: 404 })
        return new Response(`
          <a href="/en/lists/view/9164">Healthcare quality, licensing, and private-sector participation reform package approved</a>
          <span>01-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.artifact.reform_packages.length, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 1)
  })

  it('keeps automatic package assembly empty for unrelated verified candidates', () => {
    const packages = assembleReformPackagesFromCandidates([
      {
        title: 'Resolution approved on tax administration amendments',
        summary: 'Tax reporting rules amended.',
        source_url: 'https://gov.uz/en/imv/news/view/161792',
        source_title: 'Resolution approved on tax administration amendments',
        source_institution: 'Ministry of Economy and Finance of Uzbekistan',
        source_published_at: '2026-05-05',
        evidence_types: ['legal_text'],
        inclusion_reason: 'Legal or regulatory change.',
        extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
        source_url_status: 'verified',
        extracted_at: '2026-05-05T08:00:00.000Z',
      },
    ])

    assert.deepEqual(packages, [])
  })

  it('configures official source coverage for the requested next batch', () => {
    const sourceIds = REFORM_SOURCE_DEFINITIONS.map((source) => source.id)

    assert.ok(sourceIds.includes('lex-official-legal-acts'))
    assert.ok(sourceIds.includes('president-reform-news'))
    assert.ok(sourceIds.includes('gov-portal-reform-news'))
    assert.ok(sourceIds.includes('tax-committee-news'))
    assert.ok(!sourceIds.includes('customs-committee-news'))
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
    assert.equal(diagnostics.source_results.reduce((sum, source) => sum + source.candidate_count, 0), 8)
    assert.equal(diagnostics.artifact.candidates.length, 7)
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
          url: 'https://gov.uz/en/ok/news/news',
        },
        {
          id: 'failed-source',
          institution: 'Failed Institution',
          url: 'https://gov.uz/en/fail/news/news',
        },
      ],
      fetchImpl: async (url) => {
        if (url.includes('/fail')) {
          throw new Error('synthetic fetch failure')
        }
        return new Response(`
          <article>
            <time datetime="2026-05-03">3 May 2026</time>
            <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
            <p>The resolution introduces amended tax reporting rules and budget monitoring requirements.</p>
          </article>
        `)
      },
    })

    assert.equal(diagnostics.candidate_count, 1)
    assert.equal(diagnostics.source_results.length, 2)
    assert.equal(diagnostics.source_results[0].ok, true)
    assert.equal(diagnostics.source_results[0].candidate_count, 1)
    assert.equal(diagnostics.source_results[0].excluded_count, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 0)
    assert.equal(diagnostics.source_results[1].ok, false)
    assert.equal(diagnostics.source_failures.length, 1)
    assert.equal(diagnostics.artifact.source_diagnostics.length, 2)
    assert.equal(diagnostics.artifact.source_diagnostics[0].ok, true)
    assert.equal(diagnostics.artifact.source_diagnostics[0].fetched_at, '2026-05-05T08:00:00.000Z')
    assert.equal(diagnostics.artifact.candidates[0].source_institution, 'OK Institution')
    assert.equal(diagnostics.artifact.candidates[0].extraction_mode, 'configured-source-fetch')
    assert.equal(diagnostics.artifact.candidates[0].source_url_status, 'verified')
    assert.equal(diagnostics.artifact.candidates[0].source_url_verified_at, '2026-05-05T08:00:00.000Z')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('configured sources failed')))
  })

  it('blocks synthetic or unusable source links from configured-source artifacts', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'synthetic-source',
          institution: 'Synthetic Institution',
          url: 'https://example.test/news/',
        },
      ],
      fetchImpl: async () =>
        new Response(`
          <article>
            <time datetime="2026-05-03">3 May 2026</time>
            <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
            <p>The resolution introduces amended tax reporting rules and budget monitoring requirements.</p>
          </article>
        `),
    })

    assert.equal(diagnostics.candidate_count, 0)
    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.source_results[0].candidate_count, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 1)
    assert.equal(diagnostics.source_results[0].exclusions[0].exclusion_reason, 'source_link_unusable')
    assert.match(diagnostics.source_results[0].exclusions[0].source_url_error, /Synthetic or local/)
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
