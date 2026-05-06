import type { KnowledgeHubContent } from '../../contracts/data-contract.js'
import { ReformCandidateList } from './ReformCandidateList.js'
import { ReformTimeline } from './ReformTimeline.js'

type KnowledgeHubContentViewProps = {
  content: KnowledgeHubContent
}

export function KnowledgeHubContentView({ content }: KnowledgeHubContentViewProps) {
  const candidates = content.candidates ?? []
  const reforms = content.reforms ?? []
  const modeLabel = content.extraction_mode_label ?? 'Candidate intake'
  const isFixtureDemo = content.extraction_mode === 'fixture-demo'
  const sourceDiagnostics = content.source_diagnostics ?? []
  const sourceFailures = sourceDiagnostics.filter((source) => !source.ok).length
  const invalidLinkCount = sourceDiagnostics.reduce((sum, source) => sum + source.link_invalid_count, 0)

  return (
    <>
      <section aria-label="Reform tracker summary" className="tracker-summary">
        <div>
          <span className="tracker-summary__value">{reforms.length}</span>
          <span className="tracker-summary__label">accepted reforms</span>
        </div>
        <div>
          <span className="tracker-summary__value">{candidates.length}</span>
          <span className="tracker-summary__label">unreviewed candidates</span>
        </div>
        <div>
          <span className="tracker-summary__value">{content.meta.sources_configured ?? 0}</span>
          <span className="tracker-summary__label">sources monitored</span>
        </div>
        <div>
          <span className="tracker-summary__value">{invalidLinkCount}</span>
          <span className="tracker-summary__label">invalid links blocked</span>
        </div>
      </section>
      <div className="knowledge-hub-intake-banner">
        <strong>Not an official reviewed policy database.</strong>
        <span>
          Accepted reforms require owner review and item-level source/currentness caveats.
          Candidates remain separate until a human owner verifies the source, policy
          interpretation, and database eligibility.
        </span>
        {isFixtureDemo ? (
          <span>
            Fixture/demo intake: this public artifact was generated from checked-in HTML fixtures
            for deterministic review and smoke testing, not from a live source fetch.
          </span>
        ) : (
          <span>{modeLabel}: this public artifact was generated from configured source URLs.</span>
        )}
      </div>
      {sourceDiagnostics.length > 0 ? (
        <section aria-labelledby="knowledge-hub-source-status-title" className="source-status-section">
          <div className="page-section-head">
            <h2 id="knowledge-hub-source-status-title">Source fetch status</h2>
            <p>
              {sourceFailures === 0
                ? 'Configured sources were read for this artifact; invalid item links are excluded before publication.'
                : 'One or more configured sources failed during intake; successful sources remain visible for review.'}
            </p>
          </div>
          <div className="source-status-list">
            {sourceDiagnostics.map((source) => (
              <article key={source.id} className="source-status-item">
                <div className="candidate-item__topline">
                  <span className={source.ok ? 'ui-chip' : 'ui-chip ui-chip--warn'}>
                    {source.ok ? 'source ok' : 'source failed'}
                  </span>
                  <span className="ui-chip">{source.parser}</span>
                  {source.link_invalid_count > 0 ? (
                    <span className="ui-chip ui-chip--warn">{source.link_invalid_count} link blocked</span>
                  ) : null}
                </div>
                <h3>{source.institution}</h3>
                <dl className="candidate-meta" aria-label={`${source.institution} intake status`}>
                  <div>
                    <dt>Fetch URL</dt>
                    <dd>
                      <a href={source.fetch_url}>{source.fetch_url}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Fetched at</dt>
                    <dd>{source.fetched_at ?? content.generated_at ?? 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Candidates</dt>
                    <dd>{source.candidate_count}</dd>
                  </div>
                  <div>
                    <dt>Excluded</dt>
                    <dd>{source.excluded_count}</dd>
                  </div>
                  {source.error ? (
                    <div>
                      <dt>Error</dt>
                      <dd>{source.error}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <ReformTimeline reforms={reforms} />
      <ReformCandidateList candidates={candidates} />
      {content.caveats && content.caveats.length > 0 ? (
        <section aria-labelledby="knowledge-hub-caveats-title" className="knowledge-hub-caveats">
          <h2 id="knowledge-hub-caveats-title">Intake caveats</h2>
          <ul>
            {content.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
