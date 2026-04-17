import type {
  ComparisonScenario,
  ComparisonScenarioTag,
} from '../../contracts/data-contract'

type TradeoffSummaryPanelProps = {
  selectedScenarios: ComparisonScenario[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
}

function getGrowthScore(scenario: ComparisonScenario) {
  return scenario.values.gdp_growth ?? 0
}

function getStabilityScore(scenario: ComparisonScenario) {
  const inflation = scenario.values.inflation ?? 0
  const fiscal = scenario.values.fiscal_balance ?? 0
  const inflationGap = Math.abs(inflation - 8)
  const fiscalGap = Math.abs(fiscal + 3)
  return scenario.risk_index + inflationGap * 5 + fiscalGap * 4
}

function getBalanceScore(scenario: ComparisonScenario) {
  const growth = scenario.values.gdp_growth ?? 0
  const stabilityPenalty = getStabilityScore(scenario)
  return growth * 10 - stabilityPenalty * 0.5
}

export function TradeoffSummaryPanel({
  selectedScenarios,
  baselineId,
  tagsByScenarioId,
}: TradeoffSummaryPanelProps) {
  if (selectedScenarios.length === 0) {
    return null
  }

  const strongestGrowth = [...selectedScenarios].sort(
    (a, b) => getGrowthScore(b) - getGrowthScore(a),
  )[0]
  const strongestStability = [...selectedScenarios].sort(
    (a, b) => getStabilityScore(a) - getStabilityScore(b),
  )[0]
  const compromise = [...selectedScenarios].sort((a, b) => getBalanceScore(b) - getBalanceScore(a))[0]

  const preferredTagged = selectedScenarios.find(
    (scenario) => tagsByScenarioId[scenario.scenario_id] === 'preferred',
  )
  const baselineScenario = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)

  const recommendation = preferredTagged
    ? `Current preferred tag is on ${preferredTagged.scenario_name}. Validate it against ${strongestStability.scenario_name} for stability resilience before final selection.`
    : `Use ${compromise.scenario_name} as the working compromise, then stress test against ${strongestStability.scenario_name}.`

  return (
    <section className="comparison-panel comparison-panel--summary" aria-labelledby="comparison-summary-title">
      <div className="comparison-panel__head">
        <h2 id="comparison-summary-title">Trade-off summary</h2>
        <p>Quick decision framing from selected scenarios.</p>
      </div>

      <div className="comparison-summary-grid">
        <article>
          <h3>Strongest growth</h3>
          <p>{strongestGrowth.scenario_name}</p>
        </article>
        <article>
          <h3>Strongest stability</h3>
          <p>{strongestStability.scenario_name}</p>
        </article>
        <article>
          <h3>Main compromise</h3>
          <p>{compromise.scenario_name}</p>
        </article>
      </div>

      <p className="comparison-summary-recommendation">{recommendation}</p>
      {baselineScenario ? (
        <p className="comparison-summary-baseline">
          Baseline reference: {baselineScenario.scenario_name}.
        </p>
      ) : null}
    </section>
  )
}
