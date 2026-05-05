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
        <h2 id="knowledge-hub-candidates-title">Reform candidates</h2>
        <p>Automatically extracted from configured source pages and queued for human review.</p>
      </div>
      <div className="candidate-list">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="candidate-item">
            <div className="candidate-item__topline">
              <span className="ui-chip ui-chip--accent">source-extracted</span>
              <span className="ui-chip ui-chip--warn">unreviewed / needs review</span>
              <span className="ui-chip">{candidate.domain_tag}</span>
            </div>
            <h3>{candidate.title}</h3>
            <p>{candidate.summary}</p>
            <dl className="candidate-meta" aria-label={`${candidate.title} source metadata`}>
              <div>
                <dt>Source institution</dt>
                <dd>{candidate.source_institution}</dd>
              </div>
              <div>
                <dt>Source URL</dt>
                <dd>
                  <a href={candidate.source_url}>{candidate.source_url}</a>
                </dd>
              </div>
              <div>
                <dt>Source date</dt>
                <dd>{formatDate(candidate.source_published_at)}</dd>
              </div>
              <div>
                <dt>extracted_at</dt>
                <dd>{candidate.extracted_at}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
