import type { ComparisonContent } from '../../contracts/data-contract.js'

// Content seeded verbatim from docs/alignment/spec_prototype.html:1915–2049.
// Test-only fixture for the Shot-1 presentation shape. Production Comparison UI
// composes this shape from ComparisonWorkspace in data/adapters/comparison.ts.

export const comparisonContentMock: ComparisonContent = {
  baseline_scenario_id: 'baseline',
  horizon_label: '2026 Q1 – 2028 Q4',
  scenarios: [
    {
      id: 'baseline',
      name: 'Baseline',
      role: 'baseline',
      role_label: 'Baseline',
      author: 'CERR Macro',
      author_date_label: '14 Apr',
    },
    {
      id: 'fiscal-consolidation',
      name: 'Fiscal consolidation',
      role: 'alternative',
      role_label: 'Alternative',
      author: 'J. Akhmatov',
      author_date_label: '09 Apr',
    },
    {
      id: 'russia-slowdown',
      name: 'Russia slowdown',
      role: 'downside',
      role_label: 'Stress',
      author: 'A. Karimova',
      author_date_label: '04 Apr',
    },
  ],
  metrics: [
    {
      id: 'gdp_growth_3y_avg',
      label: 'GDP growth · 3y avg',
      baseline_value: '+5.8%',
      values: {
        baseline: '+5.8%',
        'fiscal-consolidation': '+5.3%',
        'russia-slowdown': '+4.8%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '−0.5 pp',
        'russia-slowdown': '−1.0 pp',
      },
      highest_scenario: 'baseline',
    },
    {
      id: 'inflation_terminal',
      label: 'Inflation · terminal',
      baseline_value: '5.4%',
      values: {
        baseline: '5.4%',
        'fiscal-consolidation': '4.6%',
        'russia-slowdown': '5.7%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '−0.8 pp',
        'russia-slowdown': '+0.3 pp',
      },
      lowest_scenario: 'fiscal-consolidation',
    },
    {
      id: 'current_account_pct_gdp',
      label: 'Current account · %GDP',
      baseline_value: '−3.3%',
      values: {
        baseline: '−3.3%',
        'fiscal-consolidation': '−2.5%',
        'russia-slowdown': '−4.9%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '+0.8 pp',
        'russia-slowdown': '−1.6 pp',
      },
      highest_scenario: 'fiscal-consolidation',
    },
    {
      id: 'fiscal_balance_pct_gdp',
      label: 'Fiscal balance · %GDP',
      baseline_value: '−2.7%',
      values: {
        baseline: '−2.7%',
        'fiscal-consolidation': '−1.1%',
        'russia-slowdown': '−3.6%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '+1.6 pp',
        'russia-slowdown': '−0.9 pp',
      },
      highest_scenario: 'fiscal-consolidation',
    },
    {
      id: 'reserves_end',
      label: 'Reserves · end',
      baseline_value: '43.8 B$',
      values: {
        baseline: '43.8 B$',
        'fiscal-consolidation': '46.2 B$',
        'russia-slowdown': '38.4 B$',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '+2.4 B$',
        'russia-slowdown': '−5.4 B$',
      },
      highest_scenario: 'fiscal-consolidation',
    },
    {
      id: 'unemployment_avg',
      label: 'Unemployment · avg',
      baseline_value: '6.4%',
      values: {
        baseline: '6.4%',
        'fiscal-consolidation': '7.1%',
        'russia-slowdown': '7.8%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '+0.7 pp',
        'russia-slowdown': '+1.4 pp',
      },
      lowest_scenario: 'baseline',
    },
    {
      id: 'real_wages_cumulative',
      label: 'Real wages · cumulative',
      baseline_value: '+8.2%',
      values: {
        baseline: '+8.2%',
        'fiscal-consolidation': '+9.1%',
        'russia-slowdown': '+5.1%',
      },
      deltas: {
        baseline: '—',
        'fiscal-consolidation': '+0.9 pp',
        'russia-slowdown': '−3.1 pp',
      },
      highest_scenario: 'fiscal-consolidation',
    },
  ],
  tradeoff: {
    mode: 'shell',
    shell_id: 'fiscal-vs-growth-tradeoff',
    // Rendered text comes from the shell renderer so ScenarioSummaryCards em-
    // wrapping stays consistent; the raw prose is kept here for fallback.
    rendered_text:
      'Fiscal consolidation dominates on external and price stability — lower inflation, narrower current account, stronger reserves — at the cost of ~0.5 pp of growth and 0.7 pp of unemployment. The Russia slowdown stress is adverse across every dimension, with the current account and reserves deteriorating most sharply; the fiscal path provides only partial insulation. If price stability is the binding objective, consolidation is preferred. If growth and employment dominate the objective, the baseline is preferred and consolidation is deferred. No scenario is robust to the Russia shock — that is a case for building reserve buffers now, not scenario selection.',
  },
}
