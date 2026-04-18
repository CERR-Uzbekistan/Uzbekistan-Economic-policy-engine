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
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  if (unit === 'UZS/USD') {
    return `${sign}${Math.round(Math.abs(delta))}`
  }
  return `${sign}${Math.abs(delta).toFixed(1)}`
}

function directionGlyph(delta: number) {
  if (delta > 0) return '▲'
  if (delta < 0) return '▼'
  return '—'
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
    return (
      <section className="comparison-panel" aria-labelledby="comparison-headline-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-headline-title">Headline comparison</h2>
          <p>Side-by-side values and scenario deltas relative to the selected baseline.</p>
        </div>
        <p className="empty-state">Select a baseline scenario to view comparison metrics.</p>
      </section>
    )
  }

  const alternatives = selectedScenarios.filter((scenario) => scenario.scenario_id !== baselineId)

  return (
    <section className="comparison-panel" aria-labelledby="comparison-headline-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-headline-title">Headline comparison</h2>
        <p>Side-by-side values and scenario deltas relative to the selected baseline.</p>
      </div>

      {alternatives.length === 0 ? (
        <p className="empty-state">Add at least one alternative scenario to compare against baseline.</p>
      ) : null}

      <div className="comparison-headline-table-wrap">
        <table className="comparison-headline-table">
          <caption className="sr-only">
            Headline metric values and deltas against the selected baseline scenario.
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" className="comparison-headline-table__baseline-col">
                {baseline.scenario_name}
                <span className="comparison-headline-table__subhead">Baseline</span>
              </th>
              {alternatives.map((scenario) => (
                <th key={scenario.scenario_id} scope="col">
                  {scenario.scenario_name}
                  <span className="comparison-headline-table__subhead">
                    {toTagLabel(tagsByScenarioId[scenario.scenario_id] ?? scenario.initial_tag)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const baselineValue = baseline.values[metric.metric_id]
              const baselineHasValue = typeof baselineValue === 'number'
              return (
                <tr key={metric.metric_id}>
                  <th scope="row">
                    {metric.label}
                    <span className="comparison-headline-table__unit">{metric.unit}</span>
                  </th>
                  <td className="comparison-headline-table__baseline-col">
                    {baselineHasValue ? formatValue(baselineValue, metric.unit) : '—'}
                  </td>
                  {alternatives.map((scenario) => {
                    const value = scenario.values[metric.metric_id]
                    const scenarioHasValue = typeof value === 'number'
                    if (!scenarioHasValue) {
                      return (
                        <td key={scenario.scenario_id}>
                          <span className="comparison-headline-table__value" aria-label="Not available">
                            —
                          </span>
                        </td>
                      )
                    }
                    if (!baselineHasValue) {
                      return (
                        <td key={scenario.scenario_id}>
                          <span className="comparison-headline-table__value">
                            {formatValue(value, metric.unit)}
                          </span>
                          <span
                            className="comparison-headline-table__delta"
                            aria-label="Baseline value unavailable; no delta computed"
                          >
                            <span aria-hidden="true">—</span>
                            <span>n/a</span>
                          </span>
                        </td>
                      )
                    }
                    const delta = value - baselineValue
                    const deltaText = formatDelta(delta, metric.unit)
                    return (
                      <td key={scenario.scenario_id}>
                        <span className="comparison-headline-table__value">
                          {formatValue(value, metric.unit)}
                        </span>
                        <span
                          className="comparison-headline-table__delta"
                          aria-label={`Change vs baseline: ${deltaText}`}
                        >
                          <span aria-hidden="true">{directionGlyph(delta)}</span>
                          <span>{deltaText}</span>
                        </span>
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
