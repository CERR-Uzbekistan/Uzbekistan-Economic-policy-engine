import type { OverviewRisk } from '../../data/mock/overview'

type RiskPanelProps = {
  risks: OverviewRisk[]
}

export function RiskPanel({ risks }: RiskPanelProps) {
  return (
    <section className="overview-panel overview-panel--companion" aria-labelledby="overview-risks-title">
      <div className="overview-section-head">
        <h2 id="overview-risks-title">Top risks to monitor</h2>
        <p>Three near-term risks that most affect baseline interpretation.</p>
      </div>

      <div className="overview-risk-list">
        {risks.map((risk) => (
          <article key={risk.risk_id} className="overview-risk-card">
            <h3>{risk.title}</h3>
            <p>{risk.why_it_matters}</p>
            <dl>
              <div>
                <dt>Impact channel</dt>
                <dd>{risk.impact_channel}</dd>
              </div>
              <div>
                <dt>Suggested test</dt>
                <dd>{risk.suggested_scenario}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
