import type {
  ComparisonScenario,
  ComparisonScenarioTag,
} from '../../contracts/data-contract'

type TradeoffSummaryPanelProps = {
  selectedScenarios: ComparisonScenario[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
}

function hasGrowth(scenario: ComparisonScenario) {
  return typeof scenario.values.gdp_growth === 'number'
}

function getGrowthScore(scenario: ComparisonScenario) {
  return scenario.values.gdp_growth ?? 0
}

function getStabilityScore(scenario: ComparisonScenario) {
  const inflation = scenario.values.inflation
  const fiscal = scenario.values.fiscal_balance
  let score = scenario.risk_index
  if (typeof inflation === 'number') {
    score += Math.abs(inflation - 8) * 5
  }
  if (typeof fiscal === 'number') {
    score += Math.abs(fiscal + 3) * 4
  }
  return score
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
  const rankableScenarios = selectedScenarios.filter(hasGrowth)

  if (selectedScenarios.length === 0 || rankableScenarios.length === 0) {
    return (
      <section className="comparison-panel comparison-panel--summary" aria-labelledby="comparison-summary-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-summary-title">Trade-off summary</h2>
          <p>Quick decision framing from selected scenarios.</p>
        </div>
        <p className="empty-state">
          {selectedScenarios.length === 0
            ? 'Select at least one scenario to generate a summary.'
            : 'Selected scenarios do not include GDP growth values; trade-off summary unavailable.'}
        </p>
      </section>
    )
  }

  const strongestGrowth = [...rankableScenarios].sort(
    (a, b) => getGrowthScore(b) - getGrowthScore(a),
  )[0]
  const strongestStability = [...rankableScenarios].sort(
    (a, b) => getStabilityScore(a) - getStabilityScore(b),
  )[0]
  const compromise = [...rankableScenarios].sort((a, b) => getBalanceScore(b) - getBalanceScore(a))[0]

  const preferredTagged = rankableScenarios.find(
    (scenario) => tagsByScenarioId[scenario.scenario_id] === 'preferred',
  )
  const baselineScenario = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)

  function resolveRecommendation() {
    if (!preferredTagged) {
      const stressCandidate = [strongestStability, strongestGrowth].find(
        (candidate) => candidate.scenario_id !== compromise.scenario_id,
      )
      if (!stressCandidate) {
        return `${compromise.scenario_name} is the only candidate that ranks on growth and stability here; add another scenario before committing.`
      }
      return `Consider ${compromise.scenario_name} as a working compromise; stress test against ${stressCandidate.scenario_name} before committing.`
    }

    const stabilityCheck = [...rankableScenarios]
      .sort((a, b) => getStabilityScore(a) - getStabilityScore(b))
      .find((scenario) => scenario.scenario_id !== preferredTagged.scenario_id)

    if (!stabilityCheck) {
      return `Preferred tag is on ${preferredTagged.scenario_name}. Add another scenario to test it against.`
    }

    if (preferredTagged.scenario_id === strongestStability.scenario_id) {
      return `${preferredTagged.scenario_name} is tagged preferred and ranks most stable on this selection. Stress test against ${stabilityCheck.scenario_name} before committing.`
    }

    return `Preferred tag is on ${preferredTagged.scenario_name}. Validate against ${strongestStability.scenario_name} for stability before committing.`
  }

  const recommendation = resolveRecommendation()

  return (
    <section className="comparison-panel comparison-panel--summary" aria-labelledby="comparison-summary-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-summary-title">Trade-off summary</h2>
        <p>Quick decision framing from selected scenarios.</p>
      </div>

      <div className="comparison-summary-grid">
        <article>
          <h3>Strongest growth</h3>
          <p>{strongestGrowth.scenario_name}</p>
          <span className="comparison-summary-grid__detail">
            GDP {getGrowthScore(strongestGrowth).toFixed(1)}%
          </span>
        </article>
        <article>
          <h3>Strongest stability</h3>
          <p>{strongestStability.scenario_name}</p>
          <span className="comparison-summary-grid__detail">
            Risk index {Math.round(strongestStability.risk_index)}
          </span>
        </article>
        <article>
          <h3>Main compromise</h3>
          <p>{compromise.scenario_name}</p>
          <span className="comparison-summary-grid__detail">
            GDP {getGrowthScore(compromise).toFixed(1)}%, risk {Math.round(compromise.risk_index)}
          </span>
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
