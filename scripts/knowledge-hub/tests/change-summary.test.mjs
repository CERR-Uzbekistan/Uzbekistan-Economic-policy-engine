import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildKnowledgeHubChangeSummary,
  renderKnowledgeHubChangeSummaryMarkdown,
} from '../change-summary.mjs'

const PUBLIC_KNOWLEDGE_HUB_ARTIFACT = fileURLToPath(
  new URL('../../../apps/policy-ui/public/data/knowledge-hub.json', import.meta.url),
)

function collectVisibleReformSummaryCopy(reformPackage) {
  return [
    reformPackage.short_summary,
    reformPackage.financing_or_incentive,
    ...(reformPackage.parameters_or_amounts ?? []),
    ...Object.values(reformPackage.digest ?? {}),
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n')
}

describe('Knowledge Hub change summary', () => {
  it('summarizes package, diagnostic, invalid-link, and source-failure changes', () => {
    const previousArtifact = {
      source_diagnostics: [
        {
          id: 'source-a',
          institution: 'Source A',
          url: 'https://example.test/a',
          parser: 'html',
          fetch_url: 'https://example.test/a',
          ok: true,
          candidate_count: 1,
          excluded_count: 0,
          link_invalid_count: 0,
          fetched_at: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'source-removed',
          institution: 'Removed Source',
          url: 'https://example.test/removed',
          parser: 'html',
          fetch_url: 'https://example.test/removed',
          ok: true,
          candidate_count: 1,
          excluded_count: 0,
          link_invalid_count: 0,
          fetched_at: '2026-05-01T00:00:00.000Z',
        },
      ],
      reform_packages: [
        {
          package_id: 'pkg-a',
          title: 'Old title',
          current_stage: 'announced',
          official_source_events: [
            {
              title: 'Old source event',
              source_institution: 'Source A',
              source_url: 'https://example.test/a/old',
              source_url_status: 'verified',
            },
          ],
        },
        {
          package_id: 'pkg-removed',
          title: 'Removed package',
          current_stage: 'adopted',
          official_source_events: [],
        },
      ],
    }
    const currentArtifact = {
      generated_at: '2026-05-02T00:00:00.000Z',
      source_diagnostics: [
        {
          id: 'source-a',
          institution: 'Source A',
          url: 'https://example.test/a',
          parser: 'html',
          fetch_url: 'https://example.test/a',
          ok: true,
          candidate_count: 2,
          excluded_count: 1,
          link_invalid_count: 1,
          fetched_at: '2026-05-02T00:00:00.000Z',
        },
        {
          id: 'source-added',
          institution: 'Added Source',
          url: 'https://example.test/added',
          parser: 'json',
          fetch_url: 'https://example.test/added',
          ok: false,
          candidate_count: 0,
          excluded_count: 0,
          link_invalid_count: 0,
          error: 'HTTP 500',
          fetched_at: '2026-05-02T00:00:00.000Z',
        },
      ],
      reform_packages: [
        {
          package_id: 'pkg-a',
          title: 'New title',
          current_stage: 'implementation',
          official_source_events: [
            {
              title: 'New source event',
              source_institution: 'Source A',
              source_url: 'https://example.test/a/new',
              source_url_status: 'verified',
            },
          ],
        },
        {
          package_id: 'pkg-added',
          title: 'Added package',
          current_stage: 'announced',
          official_source_events: [],
        },
      ],
    }
    const diagnostics = {
      artifact: currentArtifact,
      source_results: [
        {
          id: 'source-a',
          institution: 'Source A',
          link_invalid_count: 1,
          exclusions: [
            {
              title: 'Bad local source',
              exclusion_reason: 'source_link_unusable',
              source_url: 'http://localhost/bad',
              source_url_error: 'Synthetic or local URLs are not allowed',
            },
          ],
        },
      ],
      source_failures: [
        {
          id: 'source-added',
          institution: 'Added Source',
          fetch_url: 'https://example.test/added',
          error: 'HTTP 500',
        },
      ],
    }

    const summary = buildKnowledgeHubChangeSummary(previousArtifact, currentArtifact, diagnostics, {
      previousPath: 'apps/policy-ui/public/data/knowledge-hub.json',
      currentPath: 'knowledge-hub-source-fetch-output/apps/policy-ui/public/data/knowledge-hub.json',
    })

    assert.deepEqual(summary.package_count, { before: 2, after: 2 })
    assert.deepEqual(summary.added_packages, [{ package_id: 'pkg-added', title: 'Added package' }])
    assert.deepEqual(summary.removed_packages, [{ package_id: 'pkg-removed', title: 'Removed package' }])
    assert.equal(summary.changed_packages.length, 1)
    assert.deepEqual(summary.changed_packages[0].changes.title, { before: 'Old title', after: 'New title' })
    assert.deepEqual(summary.changed_packages[0].changes.current_stage, {
      before: 'announced',
      after: 'implementation',
    })
    assert.equal(summary.changed_packages[0].changes.official_source_events.before[0].source_url, 'https://example.test/a/old')
    assert.equal(summary.changed_packages[0].changes.official_source_events.after[0].source_url, 'https://example.test/a/new')
    assert.equal(summary.source_diagnostics_changes.length, 3)
    assert.deepEqual(summary.source_diagnostics_changes.find((change) => change.id === 'source-a').fields.candidate_count, {
      before: 1,
      after: 2,
    })
    assert.equal(summary.invalid_links_blocked.total, 1)
    assert.equal(summary.invalid_links_blocked.sources[0].blocked_links[0].source_url, 'http://localhost/bad')
    assert.equal(summary.source_failures.total, 1)
    assert.equal(summary.source_failures.failures[0].error, 'HTTP 500')
  })

  it('does not report source diagnostics changes for fetched-at-only differences', () => {
    const previousArtifact = {
      source_diagnostics: [
        {
          id: 'source-a',
          institution: 'Source A',
          url: 'https://example.test/a',
          parser: 'html',
          fetch_url: 'https://example.test/a',
          ok: true,
          candidate_count: 1,
          excluded_count: 0,
          link_invalid_count: 0,
          fetched_at: '2026-05-01T00:00:00.000Z',
        },
      ],
      reform_packages: [],
    }
    const currentArtifact = {
      source_diagnostics: [
        {
          id: 'source-a',
          institution: 'Source A',
          url: 'https://example.test/a',
          parser: 'html',
          fetch_url: 'https://example.test/a',
          ok: true,
          candidate_count: 1,
          excluded_count: 0,
          link_invalid_count: 0,
          fetched_at: '2026-05-02T00:00:00.000Z',
        },
      ],
      reform_packages: [],
    }

    const summary = buildKnowledgeHubChangeSummary(previousArtifact, currentArtifact, {
      source_results: [],
      source_failures: [],
    })

    assert.deepEqual(summary.source_diagnostics_changes, [])
  })

  it('renders an Actions-friendly Markdown summary', () => {
    const markdown = renderKnowledgeHubChangeSummaryMarkdown({
      package_count: { before: 1, after: 2 },
      added_packages: [{ package_id: 'pkg-added', title: 'Added package' }],
      removed_packages: [],
      changed_packages: [],
      source_diagnostics_changes: [],
      invalid_links_blocked: { total: 0, sources: [] },
      source_failures: { total: 0, failures: [] },
    })

    assert.match(markdown, /## Change summary versus previous public artifact/)
    assert.match(markdown, /Package count: 1 -> 2/)
    assert.match(markdown, /`pkg-added` - Added package/)
    assert.match(markdown, /### Source failures\n- None/)
  })

  it('keeps public reform summary fields free of tracker and process phrases', () => {
    const artifact = JSON.parse(readFileSync(PUBLIC_KNOWLEDGE_HUB_ARTIFACT, 'utf8'))
    const visibleCopy = artifact.reform_packages.map(collectVisibleReformSummaryCopy).join('\n')

    assert.match(visibleCopy, /From 2026-07-01, medical licensing procedures change/)
    assert.match(visibleCopy, /Platform screen doors will be tested at Shahriston metro station/)
    assert.match(visibleCopy, /Agricultural Payments Agency is established to administer subsidies and payments/)
    assert.ok(
      artifact.reform_packages.every(
        (reformPackage) => (reformPackage.short_summary ?? '').split(/(?<=[.!?])\s+/).filter(Boolean).length <= 1,
      ),
    )
    assert.doesNotMatch(
      visibleCopy,
      /\b(Tracks|source-backed|verified official source event|without inferring|dossier|measure recorded|source event recorded|Source-reported)\b/i,
    )
  })
})
