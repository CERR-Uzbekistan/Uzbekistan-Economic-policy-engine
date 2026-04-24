import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ComparisonScenarioMeta,
  TradeoffSummary,
} from '../../contracts/data-contract'

type TradeoffSummaryPanelProps = {
  tradeoff: TradeoffSummary
  scenarios: ComparisonScenarioMeta[]
}

// Prompt §4.3: prose with em-emphasized scenario names. Scenarios whose name
// appears in the rendered text are wrapped in <em>. Exact, case-sensitive
// matching keeps rendering deterministic; Shot 2 can extend with per-locale
// highlight rules.
function renderWithEmphasis(text: string, scenarios: ComparisonScenarioMeta[]) {
  if (scenarios.length === 0) return text
  const names = scenarios
    .map((scenario) => scenario.name)
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length)
  if (names.length === 0) return text
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g')
  const segments = text.split(pattern)
  return segments.map((segment, index) =>
    names.includes(segment) ? (
      <em key={index}>{segment}</em>
    ) : (
      <Fragment key={index}>{segment}</Fragment>
    ),
  )
}

export function TradeoffSummaryPanel({ tradeoff, scenarios }: TradeoffSummaryPanelProps) {
  const { t } = useTranslation()
  const isEmpty = tradeoff.mode === 'empty' || !tradeoff.rendered_text
  return (
    <section className="tradeoff" aria-labelledby="comparison-tradeoff-title">
      <h4 id="comparison-tradeoff-title">{t('comparison.tradeoff.title')}</h4>
      {isEmpty ? (
        <p>
          <span
            className="ui-chip ui-chip--warn"
            aria-label={t('comparison.tradeoff.smePendingAria')}
          >
            {t('comparison.tradeoff.smePendingChip')}
          </span>
        </p>
      ) : (
        <p>{renderWithEmphasis(tradeoff.rendered_text ?? '', scenarios)}</p>
      )}
    </section>
  )
}
