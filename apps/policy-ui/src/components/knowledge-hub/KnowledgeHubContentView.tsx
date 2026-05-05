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
