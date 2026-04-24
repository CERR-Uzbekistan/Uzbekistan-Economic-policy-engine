import type {
  ComparisonMetricRow,
  ComparisonScenarioMeta,
} from '../../contracts/data-contract'

type ScenarioSummaryCardsProps = {
  scenarios: ComparisonScenarioMeta[]
  metrics: ComparisonMetricRow[]
}

// Prompt §4.3: per-scenario summary card with role-colored top border and a
// 5-metric body. "5" is the prototype count (`spec_prototype.html:1937–1942`);
// when more than 5 metric rows are available, we truncate to the leading five
// to match the prototype's density.
const SUMMARY_METRIC_LIMIT = 5

function ScenarioSummaryCard({
  scenario,
  metrics,
}: {
  scenario: ComparisonScenarioMeta
  metrics: ComparisonMetricRow[]
}) {
  const tagSegments = [scenario.role_label, scenario.author, scenario.author_date_label].filter(
    (segment): segment is string => Boolean(segment),
  )
  const tagLine = tagSegments.join(' · ')
  return (
    <article className="cmp-card" data-role={scenario.role}>
      <div className="tag">{tagLine}</div>
      <h3>{scenario.name}</h3>
      <div>
        {metrics.slice(0, SUMMARY_METRIC_LIMIT).map((metric) => (
          <div key={metric.id} className="metric-row">
            <span className="mn">{metric.label}</span>
            <span className="mv">{metric.values[scenario.id] ?? '—'}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export function ScenarioSummaryCards({ scenarios, metrics }: ScenarioSummaryCardsProps) {
  return (
    <div className="cmp-cards">
      {scenarios.map((scenario) => (
        <ScenarioSummaryCard key={scenario.id} scenario={scenario} metrics={metrics} />
      ))}
    </div>
  )
}
