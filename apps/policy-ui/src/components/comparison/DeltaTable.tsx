import { useTranslation } from 'react-i18next'
import type {
  ComparisonMetricRow,
  ComparisonScenarioMeta,
} from '../../contracts/data-contract'

type DeltaTableProps = {
  scenarios: ComparisonScenarioMeta[]
  metrics: ComparisonMetricRow[]
  baselineScenarioId: string
}

function extremeClassFor(metric: ComparisonMetricRow, scenarioId: string): string | undefined {
  if (metric.highest_scenario === scenarioId) return 'highest'
  if (metric.lowest_scenario === scenarioId) return 'lowest'
  return undefined
}

// Prompt §4.3: 7-row delta table with ★ on numerically highest/lowest cells +
// policy-judgment footnote. Per scenario beyond baseline we render two cells:
// the value column and the Δ column.
export function DeltaTable({ scenarios, metrics, baselineScenarioId }: DeltaTableProps) {
  const { t } = useTranslation()
  const baseline = scenarios.find((scenario) => scenario.id === baselineScenarioId) ?? scenarios[0]
  const alternatives = scenarios.filter((scenario) => scenario.id !== baseline?.id)

  return (
    <div className="delta-table__wrapper">
      <table className="delta-table">
        <thead>
          <tr>
            <th>{t('comparison.table.indicator')}</th>
            <th className="num">{baseline?.name ?? t('comparison.table.baselineFallback')}</th>
            {alternatives.flatMap((scenario) => [
              <th key={`${scenario.id}-value`} className="num">
                {scenario.name}
              </th>,
              <th key={`${scenario.id}-delta`} className="num">
                Δ
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const baselineClass = baseline ? extremeClassFor(metric, baseline.id) : undefined
            return (
              <tr key={metric.id}>
                <td>{metric.label}</td>
                <td
                  className={`num${baselineClass ? ` ${baselineClass}` : ''}`}
                  title={baselineClass ? t(`comparison.table.${baselineClass}Title`) : undefined}
                >
                  {baseline ? metric.values[baseline.id] ?? metric.baseline_value : metric.baseline_value}
                </td>
                {alternatives.flatMap((scenario) => {
                  const extreme = extremeClassFor(metric, scenario.id)
                  return [
                    <td
                      key={`${scenario.id}-value`}
                      className={`num${extreme ? ` ${extreme}` : ''}`}
                      title={extreme ? t(`comparison.table.${extreme}Title`) : undefined}
                    >
                      {metric.values[scenario.id] ?? '—'}
                    </td>,
                    <td key={`${scenario.id}-delta`} className="num">
                      {metric.deltas[scenario.id] ?? '—'}
                    </td>,
                  ]
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="delta-table__footnote">{t('comparison.table.footnote')}</p>
    </div>
  )
}
