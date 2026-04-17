import type {
  ComparisonMetricDefinition,
  ComparisonScenario,
  ComparisonScenarioTag,
} from '../../contracts/data-contract'

type HeadlineComparisonTableProps = {
  metrics: ComparisonMetricDefinition[]
  selectedScenarios: ComparisonScenario[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
}

function formatValue(value: number, unit: string) {
  if (unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function formatDelta(delta: number, unit: string) {
  if (unit === 'UZS/USD') {
    const sign = delta > 0 ? '+' : ''
    return `${sign}${Math.round(delta)}`
  }
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}`
}

function toTagLabel(tag: ComparisonScenarioTag) {
  if (tag === 'downside_stress') {
    return 'Downside stress'
  }
  return `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`
}

export function HeadlineComparisonTable({
  metrics,
  selectedScenarios,
  baselineId,
  tagsByScenarioId,
}: HeadlineComparisonTableProps) {
  const baseline = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)
  if (!baseline) {
    return null
  }

  const alternatives = selectedScenarios.filter((scenario) => scenario.scenario_id !== baselineId)

  return (
    <section className="comparison-panel" aria-labelledby="comparison-headline-title">
      <div className="comparison-panel__head">
        <h2 id="comparison-headline-title">Headline comparison</h2>
        <p>Side-by-side values and scenario deltas relative to the selected baseline.</p>
      </div>

      <div className="comparison-headline-table-wrap">
        <table className="comparison-headline-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">
                {baseline.scenario_name}
                <small>Baseline</small>
              </th>
              {alternatives.map((scenario) => (
                <th key={scenario.scenario_id} scope="col">
                  {scenario.scenario_name}
                  <small>{toTagLabel(tagsByScenarioId[scenario.scenario_id] ?? scenario.initial_tag)}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const baselineValue = baseline.values[metric.metric_id] ?? 0
              return (
                <tr key={metric.metric_id}>
                  <th scope="row">
                    {metric.label}
                    <small>{metric.unit}</small>
                  </th>
                  <td>{formatValue(baselineValue, metric.unit)}</td>
                  {alternatives.map((scenario) => {
                    const value = scenario.values[metric.metric_id] ?? 0
                    const delta = value - baselineValue
                    return (
                      <td key={scenario.scenario_id}>
                        <span>{formatValue(value, metric.unit)}</span>
                        <small>{formatDelta(delta, metric.unit)}</small>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
