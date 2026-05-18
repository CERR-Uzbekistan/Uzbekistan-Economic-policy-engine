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
import {
  withKnowledgeHubArtifactCacheKey,
} from '../../../src/data/knowledge-hub/artifact-client.js'
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
    assert.equal(content.reforms[0].status, 'in_implementation')
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
          extraction_state: 'source_extracted',
          extraction_mode: 'configured-source-fetch',
          review_state: 'candidate',
          review_status: 'needs_review',
          status: 'unknown',
          title: 'Policy rate consultation',
          summary: 'Consultation summary.',
          domain_tag: 'Monetary',
          domain_tags: ['Monetary'],
          reform_category: 'monetary_policy',
          evidence_types: ['regulatory_parameter_change'],
          relevance_score: 50,
          inclusion_reason: 'Included by Monetary or financial-sector parameter.',
          matched_rules: ['monetary-or-financial-parameter'],
          matched_include_rules: ['monetary-or-financial-parameter'],
          source_title: 'Policy rate consultation',
          source_institution: 'Central Bank of Uzbekistan',
          source_owner: 'Central Bank of Uzbekistan',
          source_url: 'https://cbu.uz/example',
          source_published_at: '2026-04-25',
          retrieved_at: '2026-05-05T08:00:00.000Z',
          extracted_at: '2026-05-05T08:00:00.000Z',
          source_url_status: 'verified',
          source_url_verified_at: '2026-05-05T08:00:00.000Z',
          citation_permission: 'pending',
          license_class: 'unknown',
          translation_review_state: 'not_translated',
          caveats: ['Unreviewed candidate.'],
        },
      ],
    })

    assert.equal(content.reforms.length, 0)
    assert.equal(content.briefs.length, 0)
    assert.equal(content.candidates?.length, 1)
    assert.equal(content.candidates?.[0].extraction_state, 'source_extracted')
    assert.equal(content.candidates?.[0].extraction_mode, 'configured-source-fetch')
    assert.equal(content.candidates?.[0].review_status, 'needs_review')
    assert.equal(content.candidates?.[0].source_url_status, 'verified')
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

  it('validates and adapts the generated public package artifact', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    const validation = validateKnowledgeHubArtifact(artifact)

    assert.equal(validation.ok, true)
    assert.equal(validation.ok ? validation.value.schema_version : null, KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION)
    assert.equal(validation.ok ? validation.value.extraction_mode : null, 'configured-source-fetch')
    assert.equal(validation.ok ? validation.value.extraction_mode_label : null, 'Configured source fetch')
    assert.equal(validation.ok ? validation.value.source_diagnostics.length : null, 13)
    assert.ok(validation.ok && validation.value.rulebook.include_rules.length > 0)
    assert.ok(validation.ok && validation.value.rulebook.exclude_rules.length > 0)
    assert.ok(validation.ok && validation.value.rulebook.exclusion_reasons.length > 0)
    assert.ok(validation.ok && validation.value.rulebook.actual_reform_definition?.includes('legal or policy instrument'))
    assert.ok(validation.ok && validation.value.reform_packages.length >= 1)
    assert.ok(
      validation.ok &&
        validation.value.reform_packages.every((reformPackage) =>
          reformPackage.official_source_events.every((event) => event.source_url_status === 'verified'),
        ),
    )
    assert.ok(validation.ok && validation.value.accepted_reforms.length === 0)
    assert.ok(validation.ok && validation.value.candidates.length === 0)
    assert.ok(validation.ok && validation.value.policy_briefs.length >= 3)
    assert.ok(validation.ok && validation.value.policy_briefs.every((brief) => brief.publication_state === 'internal_preview'))
    assert.ok(validation.ok && validation.value.policy_briefs.every((brief) => brief.citation_permission === 'internal_only'))
    assert.ok(validation.ok && validation.value.policy_briefs.every((brief) => brief.citable === false))
    assert.ok(validation.ok && validation.value.policy_briefs.every((brief) => brief.caveats.some((caveat) => caveat.includes('Do not cite'))))
    assert.ok(validation.ok && validation.value.research_updates.length >= 3)
    assert.ok(validation.ok && validation.value.research_updates.every((update) => update.model_ids.length > 0))
    assert.ok(validation.ok && validation.value.research_updates.every((update) => update.methods.length > 0))
    assert.ok(validation.ok && validation.value.research_updates.every((update) => update.why_relevant.length > 0))
    assert.ok(validation.ok && validation.value.literature_items.length >= 3)
    assert.ok(validation.ok && validation.value.literature_items.every((item) => item.model_ids.length > 0))
    assert.deepEqual(
      validation.ok ? validation.value.model_impact_map.active_lenses.map((lens) => `${lens.id}:${lens.status}`).sort() : [],
      ['DFM:possible_lens', 'I-O:possible_lens', 'QPM:possible_lens'].sort(),
    )
    assert.deepEqual(
      validation.ok ? validation.value.model_impact_map.gated_lenses.map((lens) => `${lens.id}:${lens.status}`).sort() : [],
      ['CGE:planned_gated', 'FPP:planned_gated', 'HFI:planned_gated', 'PE:planned_gated', 'Synthesis:planned_gated'].sort(),
    )
    assert.ok(
      validation.ok &&
        validation.value.model_impact_map.package_links.every((link) =>
          link.active_lenses.every((lens) => ['QPM', 'DFM', 'I-O'].includes(lens.model_id)),
        ),
    )

    const content = knowledgeHubArtifactToContent(validation.ok ? validation.value : artifact)
    assert.equal(content.reform_packages?.length, validation.ok ? validation.value.reform_packages.length : 0)
    assert.ok(content.reform_packages?.some((reformPackage) => reformPackage.title.length > 0))
    assert.equal(content.reforms.length, 0)
    assert.equal(content.briefs.length, 0)
    assert.equal(content.policy_briefs?.length, validation.ok ? validation.value.policy_briefs.length : 0)
    assert.equal(content.research_updates?.length, validation.ok ? validation.value.research_updates.length : 0)
    assert.equal(content.literature_items?.length, validation.ok ? validation.value.literature_items.length : 0)
    assert.equal(content.model_impact_map?.gated_lenses.length, 5)
    assert.equal(content.candidates?.length, 0)
    assert.equal(content.source_diagnostics?.length, validation.ok ? validation.value.source_diagnostics.length : 0)
    assert.equal(content.meta.candidate_items, 0)
    assert.equal(content.meta.sources_configured, 13)
    assert.equal(content.meta.reform_packages, validation.ok ? validation.value.reform_packages.length : 0)
    assert.equal(content.meta.reforms_tracked, validation.ok ? validation.value.reform_packages.length : 0)
    assert.equal(content.meta.research_briefs, validation.ok ? validation.value.research_updates.length : 0)
    assert.equal(content.meta.literature_items, validation.ok ? validation.value.literature_items.length : 0)
    assert.equal(content.sources?.length, 13)
    assert.equal(content.rulebook?.version, 'knowledge-hub-reform-intake-rulebook.v2')
    assert.ok(content.rulebook?.include_rules.some((rule) => rule.id === 'legal-or-regulatory-change'))
    assert.ok(content.rulebook?.exclude_rules.some((rule) => rule.id === 'routine-meeting-without-policy-measure'))
    assert.ok(content.rulebook?.actual_reform_definition?.includes('legal or policy instrument'))
    assert.equal(content.extraction_mode_label, 'Configured source fetch')
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.implementation_milestones.length > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.digest.changed.length > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.digest.applies_to.length > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.digest.effective_status.length > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.digest.document.length > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => reformPackage.short_summary && reformPackage.short_summary.length >= 45))
    assert.ok(content.reform_packages?.every((reformPackage) => (reformPackage.parameters_or_amounts?.length ?? 0) > 0))
    assert.ok(content.reform_packages?.every((reformPackage) => (reformPackage.policy_channels?.length ?? 0) > 0))
    assert.ok(
      content.reform_packages?.some(
        (reformPackage) =>
          reformPackage.package_id === 'pkg-public-transport-system-2026-05-13' &&
          reformPackage.parameters_or_amounts?.some((value) =>
            value.includes('Mingorik-Chilonzor Buyum Bozori metro line'),
          ),
      ),
    )
    assert.ok(
      content.reform_packages?.some(
        (reformPackage) =>
          reformPackage.package_id === 'pkg-tax-administration-incentives-2026-04-14' &&
          reformPackage.next_milestone === 'No future milestone published in verified source' &&
          reformPackage.financing_or_incentive === 'Tax incentives for investors financing infrastructure projects' &&
          reformPackage.implementation_milestones.some((milestone) => milestone.id === 'tax-administration-incentives-financing_allocated-2026-04-14'),
      ),
    )
    assert.ok(content.reform_packages?.some((reformPackage) => reformPackage.package_id === 'pkg-urbanization-construction-permits-housing-2026'))
    assert.ok(
      content.reform_packages?.some(
        (reformPackage) =>
          reformPackage.reform_category === 'agriculture' &&
          reformPackage.title === 'Agriculture financing and subsidy delivery reform' &&
          (reformPackage.parameters_or_amounts?.length ?? 0) > 0,
      ),
    )
    assert.ok(content.caveats?.some((caveat) => caveat.includes('configured source URLs')))
    assert.ok(content.caveats?.some((caveat) => caveat.includes('official links passed validation')))
  })

  it('validates reform packages and rejects invalid package source links', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    const validation = validateKnowledgeHubArtifact(artifact)

    assert.equal(validation.ok, true)
    assert.ok(validation.ok)
    const reformPackage = validation.value.reform_packages[0]
    assert.ok(reformPackage.title.length > 0)
    assert.ok(reformPackage.official_source_events.length > 0)
    assert.ok(reformPackage.implementation_milestones.length > 0)
    assert.ok(
      reformPackage.implementation_milestones.every((milestone) =>
        milestone.source_event_ids.every((sourceEventId) =>
          reformPackage.official_source_events.some((event) => event.id === sourceEventId),
        ),
      ),
    )

    const invalidArtifact = JSON.parse(JSON.stringify(artifact))
    invalidArtifact.reform_packages[0].official_source_events[0].source_url = 'https://example.test/fake'
    const invalidValidation = validateKnowledgeHubArtifact(invalidArtifact)

    assert.equal(invalidValidation.ok, false)
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('synthetic or local links')))
  })

  it('rejects configured-source public artifacts that expose candidate or review records', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    const sourceEvent = artifact.reform_packages[0].official_source_events[0]
    const invalidArtifact = JSON.parse(JSON.stringify(artifact))
    invalidArtifact.candidates = [
      {
        id: 'candidate-public-leak',
        extraction_state: 'source_extracted',
        extraction_mode: 'configured-source-fetch',
        review_state: 'candidate',
        review_status: 'needs_review',
        status: 'unknown',
        title: sourceEvent.title,
        summary: sourceEvent.summary,
        domain_tag: 'Policy',
        domain_tags: ['Policy'],
        reform_category: artifact.reform_packages[0].reform_category,
        evidence_types: [sourceEvent.evidence_type],
        relevance_score: 100,
        inclusion_reason: 'Synthetic guard fixture.',
        matched_rules: ['legal-or-regulatory-change'],
        matched_include_rules: ['legal-or-regulatory-change'],
        source_title: sourceEvent.title,
        source_institution: sourceEvent.source_institution,
        source_owner: sourceEvent.source_institution,
        source_url: sourceEvent.source_url,
        source_published_at: sourceEvent.source_published_at,
        retrieved_at: artifact.generated_at,
        extracted_at: artifact.generated_at,
        source_url_status: 'verified',
        source_url_verified_at: artifact.generated_at,
        citation_permission: 'pending',
        license_class: 'unknown',
        translation_review_state: 'not_translated',
        caveats: ['Synthetic guard fixture.'],
      },
    ]
    invalidArtifact.accepted_reforms = [
      {
        ...invalidArtifact.candidates[0],
        extraction_state: 'source_extracted',
        review_state: 'accepted_public',
        review_status: 'public_cleared',
        status: 'planned',
        as_of_date: sourceEvent.source_published_at,
        status_authority: sourceEvent.source_institution,
        reviewer_of_record: 'Synthetic reviewer',
        review_date: artifact.generated_at,
        review_scope: 'Synthetic guard fixture.',
        model_refs: [],
      },
    ]

    const invalidValidation = validateKnowledgeHubArtifact(invalidArtifact)

    assert.equal(invalidValidation.ok, false)
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('cannot expose candidate records')))
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('cannot expose review records')))
  })

  it('rejects public policy briefs that become citable or point at gated model lenses', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    const invalidArtifact = JSON.parse(JSON.stringify(artifact))
    invalidArtifact.policy_briefs[0].citable = true
    invalidArtifact.policy_briefs[0].citation_permission = 'external_allowed'
    invalidArtifact.policy_briefs[0].possible_lenses = ['QPM', 'PE']
    invalidArtifact.model_impact_map.package_links[0].active_lenses.push({
      model_id: 'CGE',
      channel: 'Synthetic invalid gated lane.',
      caveat: 'Synthetic invalid gated lane.',
    })

    const invalidValidation = validateKnowledgeHubArtifact(invalidArtifact)

    assert.equal(invalidValidation.ok, false)
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('non-citable')))
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('internal_only')))
    assert.ok(invalidValidation.issues.some((issue) => issue.message.includes('active analytical lenses')))
    assert.ok(invalidValidation.issues.some((issue) => issue.path.includes('active_lenses')))
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
    assert.equal(state.content?.meta.reforms_tracked, artifact.reform_packages.length)
    assert.equal(state.content?.meta.reform_packages, artifact.reform_packages.length)
    assert.equal(state.content?.meta.research_briefs, artifact.research_updates.length)
    assert.equal(state.content?.meta.literature_items, artifact.literature_items.length)
    assert.equal(state.content?.meta.candidate_items, 0)
    assert.equal(state.content?.reforms.length, 0)
    assert.equal(state.content?.reform_packages?.length, artifact.reform_packages.length)
    assert.ok(state.content?.reform_packages?.[0].title)
    assert.equal(state.content?.briefs.length, 0)
    assert.equal(state.content?.policy_briefs?.length, artifact.policy_briefs.length)
    assert.equal(state.content?.research_updates?.length, artifact.research_updates.length)
    assert.equal(state.content?.literature_items?.length, artifact.literature_items.length)
    assert.equal(state.content?.model_impact_map?.active_lenses.length, 3)
    assert.equal(state.content?.extraction_mode, 'configured-source-fetch')
    assert.equal(state.content?.extraction_mode_label, 'Configured source fetch')
    assert.equal(state.content?.candidates?.length, 0)
    assert.equal(JSON.stringify(knowledgeHubContentMock), beforeMockSnapshot)
  })

  it('uses a schema cache key and no-cache mode when fetching the public artifact', async () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT_PATH, 'utf8'))
    let requestUrl = ''
    let requestCacheMode: RequestCache | undefined

    globalThis.fetch = (async (input, init) => {
      requestUrl = String(input)
      requestCacheMode = init?.cache
      return new Response(JSON.stringify(artifact), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const state = await loadKnowledgeHubSourceState()

    assert.equal(state.status, 'ready')
    assert.match(requestUrl, /data\/knowledge-hub\.json\?schema=knowledge-hub-reform-tracker\.v1$/)
    assert.equal(requestCacheMode, 'no-cache')
    assert.equal(
      withKnowledgeHubArtifactCacheKey('/policy-ui/data/knowledge-hub.json?x=1#frag'),
      '/policy-ui/data/knowledge-hub.json?x=1&schema=knowledge-hub-reform-tracker.v1#frag',
    )
  })
})
