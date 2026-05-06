import type { ReformCandidateItem } from '../../contracts/data-contract.js'

type ReformCandidateListProps = {
  candidates: ReformCandidateItem[]
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Source date unavailable'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

export function ReformCandidateList({ candidates }: ReformCandidateListProps) {
  if (candidates.length === 0) {
    return (
      <p className="empty-state">
        No hard reform candidates passed the intake rulebook. The tracker is intentionally empty
        until source text identifies a legal or policy instrument, adopted measure, parameter
        change, or named implementation update.
      </p>
    )
  }

  return (
    <section aria-labelledby="knowledge-hub-candidates-title" className="candidate-section">
      <div className="page-section-head">
        <h2 id="knowledge-hub-candidates-title">Unreviewed candidates</h2>
        <p>Automatically extracted from configured source pages and kept out of accepted reforms until human review.</p>
      </div>
      <div className="candidate-list">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="candidate-item">
            <div className="candidate-item__topline">
              <span className="ui-chip ui-chip--warn">candidate</span>
              <span className="ui-chip">{candidate.extraction_state}</span>
              <span className="ui-chip">{candidate.extraction_mode}</span>
              <span className="ui-chip ui-chip--warn">{candidate.review_status}</span>
              <span className="ui-chip">{candidate.source_url_status}</span>
              <span className="ui-chip">{candidate.domain_tag}</span>
            </div>
            <h3>{candidate.title}</h3>
            <p>{candidate.summary}</p>
            <p className="candidate-item__caveat">
              {candidate.caveats[0] ?? 'Unreviewed candidate; caveat pending.'}
            </p>
            <dl className="candidate-meta" aria-label={`${candidate.title} source metadata`}>
              <div>
                <dt>Source</dt>
                <dd>{candidate.source_institution}</dd>
              </div>
              <div>
                <dt>Source link</dt>
                <dd>
                  <a href={candidate.source_url}>{candidate.source_url}</a>
                </dd>
              </div>
              <div>
                <dt>Source date</dt>
                <dd>{formatDate(candidate.source_published_at)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{candidate.reform_category}</dd>
              </div>
              <div>
                <dt>Evidence type</dt>
                <dd>{candidate.evidence_types.join(', ')}</dd>
              </div>
              <div>
                <dt>Review state</dt>
                <dd>{`${candidate.review_state} / ${candidate.review_status}`}</dd>
              </div>
              <div>
                <dt>retrieved_at</dt>
                <dd>{candidate.retrieved_at ?? candidate.extracted_at ?? 'Unavailable'}</dd>
              </div>
              <div>
                <dt>source_url_status</dt>
                <dd>
                  {candidate.source_url_status}
                  {candidate.source_url_verified_at ? ` at ${candidate.source_url_verified_at}` : ''}
                </dd>
              </div>
              <div>
                <dt>Extraction mode</dt>
                <dd>{candidate.extraction_mode}</dd>
              </div>
            </dl>
            <details className="candidate-inclusion">
              <summary>Why included</summary>
              <p>{candidate.inclusion_reason}</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
