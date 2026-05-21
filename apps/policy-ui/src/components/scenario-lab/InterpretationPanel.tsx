import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type {
  NarrativeGenerationMode,
  ScenarioLabInterpretation,
  SuggestedNextScenario,
} from '../../contracts/data-contract'

const STATIC_INTERPRETATION_KEYS: Record<string, string> = {
  'Domestic demand and price channels respond first, then external and fiscal balances adjust.':
    'scenarioLab.interpretation.items.domesticDemandSequence',
  'Pass-through may be stronger than assumed when exchange-rate shocks are persistent.':
    'scenarioLab.interpretation.items.passThroughRisk',
  'Fiscal and external shocks can amplify each other in downside cases.':
    'scenarioLab.interpretation.items.fiscalExternalRisk',
  'Sequence monetary and fiscal decisions to avoid conflicting signals.':
    'scenarioLab.interpretation.items.sequencePolicy',
  'Use targeted mitigation if downside scenarios widen the growth-inflation trade-off.':
    'scenarioLab.interpretation.items.targetedMitigation',
}

const DRIVER_LABEL_KEYS: Record<string, string> = {
  'policy-rate setting': 'scenarioLab.interpretation.drivers.policyRate',
  'exchange-rate path': 'scenarioLab.interpretation.drivers.exchangeRate',
  'remittance inflows': 'scenarioLab.interpretation.drivers.remittances',
  'commodity-price pressure': 'scenarioLab.interpretation.drivers.commodityPrices',
  'government spending': 'scenarioLab.interpretation.drivers.governmentSpending',
  'tax-revenue effort': 'scenarioLab.interpretation.drivers.taxRevenue',
  'import tariff setting': 'scenarioLab.interpretation.drivers.importTariff',
  'external demand': 'scenarioLab.interpretation.drivers.externalDemand',
  'pass-through calibration': 'scenarioLab.interpretation.drivers.passThrough',
  'risk premium': 'scenarioLab.interpretation.drivers.riskPremium',
}

function localizeDriverList(value: string, t: ReturnType<typeof useTranslation>['t']) {
  const parts = value.split(/\s*,\s*|\s+and\s+/).filter(Boolean)
  if (parts.length === 0) {
    return value
  }
  const localized = parts.map((part) => {
    const key = DRIVER_LABEL_KEYS[part]
    return key ? t(key) : part
  })
  if (localized.length === 1) {
    return localized[0]
  }
  const last = localized[localized.length - 1]
  return `${localized.slice(0, -1).join(', ')} ${t('scenarioLab.interpretation.and', {
    defaultValue: 'and',
  })} ${last}`
}

function localizeInterpretationItem(text: string, t: ReturnType<typeof useTranslation>['t']) {
  const staticKey = STATIC_INTERPRETATION_KEYS[text]
  if (staticKey) {
    return t(staticKey)
  }

  const gdpMatch = /^GDP growth is ([+-]?\d+(?:\.\d+)?) pp versus baseline by 2026 Q4\.$/.exec(text)
  if (gdpMatch) {
    return t('scenarioLab.interpretation.items.gdpGrowthDelta', { delta: gdpMatch[1] })
  }

  const inflationNoShockMatch =
    /^Inflation is ([+-]?\d+(?:\.\d+)?) pp versus baseline; no additional price shock channel is selected\.$/.exec(
      text,
    )
  if (inflationNoShockMatch) {
    return t('scenarioLab.interpretation.items.inflationNoShock', {
      delta: inflationNoShockMatch[1],
    })
  }

  const inflationDriverMatch =
    /^Inflation is ([+-]?\d+(?:\.\d+)?) pp versus baseline; active price channels: (.+)\.$/.exec(
      text,
    )
  if (inflationDriverMatch) {
    return t('scenarioLab.interpretation.items.inflationDrivers', {
      delta: inflationDriverMatch[1],
      drivers: localizeDriverList(inflationDriverMatch[2], t),
    })
  }

  const balanceDriverMatch = /^External and fiscal balances move through (.+)\.$/.exec(text)
  if (balanceDriverMatch) {
    return t('scenarioLab.interpretation.items.balanceDrivers', {
      drivers: localizeDriverList(balanceDriverMatch[1], t),
    })
  }

  if (
    text ===
    'External and fiscal balances stay near baseline because remittance, trade, spending, and revenue settings are unchanged.'
  ) {
    return t('scenarioLab.interpretation.items.balanceNearBaseline')
  }

  const mainDriversMatch = /^Main drivers are (.+)\.$/.exec(text)
  if (mainDriversMatch) {
    return t('scenarioLab.interpretation.items.mainDrivers', {
      drivers: localizeDriverList(mainDriversMatch[1], t),
    })
  }

  return text
}

function suggestedNextLabel(scenario: SuggestedNextScenario, t: ReturnType<typeof useTranslation>['t']) {
  const key = scenario.target_preset
    ? `scenarioLab.interpretation.suggestedNext.${scenario.target_preset}`
    : `scenarioLab.interpretation.suggestedNext.${scenario.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}`
  return t(key, { defaultValue: scenario.label })
}

type InterpretationPanelProps = {
  interpretation: ScenarioLabInterpretation
}

function formatReviewedAt(value: string | undefined, locale: string): string {
  if (!value) {
    return ''
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return value
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed))
}

function InterpretationSection({
  title,
  items,
  localizeItem,
}: {
  title: string
  items: string[]
  localizeItem: (item: string) => string
}) {
  return (
    <section className="scenario-interpretation-section interpretation-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{localizeItem(item)}</li>
        ))}
      </ul>
    </section>
  )
}

function resolveGenerationMode(
  interpretation: ScenarioLabInterpretation,
): NarrativeGenerationMode {
  return interpretation.metadata?.generation_mode ?? 'template'
}

function resolveReviewerInfo(
  interpretation: ScenarioLabInterpretation,
): { reviewerName: string; reviewedAt: string } {
  const metadata = interpretation.metadata
  const reviewerName = metadata?.reviewer_name?.trim() ?? ''
  const reviewedAt = metadata?.reviewed_at ?? ''
  return { reviewerName, reviewedAt }
}

// Prompt §4.4: clickable Link anchors — route + preset encoded as query param.
function SuggestedNextLink({
  scenario,
  label,
}: {
  scenario: SuggestedNextScenario
  label: string
}) {
  const to = scenario.target_preset
    ? `${scenario.target_route}?preset=${encodeURIComponent(scenario.target_preset)}`
    : scenario.target_route
  return (
    <li>
      <Link to={to} className="scenario-suggested-next__link">
        {label}
      </Link>
    </li>
  )
}

export function InterpretationPanel({ interpretation }: InterpretationPanelProps) {
  const { t, i18n } = useTranslation()
  const generationMode = resolveGenerationMode(interpretation)
  const { reviewerName, reviewedAt } = resolveReviewerInfo(interpretation)
  const reviewedAtFormatted = formatReviewedAt(reviewedAt, i18n.resolvedLanguage ?? 'en')
  const reviewedDateLabel = reviewedAtFormatted || reviewedAt
  const hasCompleteReview = reviewerName.length > 0 && reviewedDateLabel.length > 0
  const effectiveTrustMode =
    generationMode === 'reviewed' && !hasCompleteReview ? 'assisted' : generationMode

  const shouldFallbackReviewedToAssisted = generationMode === 'reviewed' && !hasCompleteReview
  if (shouldFallbackReviewedToAssisted) {
    console.warn(
      'ScenarioLab interpretation marked as reviewed without complete reviewer metadata. Falling back to assisted copy.',
    )
  }

  const suggestedNext = interpretation.suggested_next ?? []
  const localizeItem = (item: string) => localizeInterpretationItem(item, t)

  return (
    <section
      className="scenario-panel scenario-panel--interpretation lab-panel"
      aria-labelledby="scenario-interpretation-title"
    >
      <div className="scenario-panel__head page-section-head">
        <h2 id="scenario-interpretation-title">{t('scenarioLab.interpretation.title')}</h2>
        <p>{t('scenarioLab.interpretation.description')}</p>
      </div>

      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.whatChanged')}
        items={interpretation.what_changed}
        localizeItem={localizeItem}
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.whyItChanged')}
        items={interpretation.why_it_changed}
        localizeItem={localizeItem}
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.keyRisks')}
        items={interpretation.key_risks}
        localizeItem={localizeItem}
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.policyImplications')}
        items={interpretation.policy_implications}
        localizeItem={localizeItem}
      />

      {suggestedNext.length > 0 ? (
        <section className="scenario-suggested-next interpretation-section">
          <h4>{t('scenarioLab.interpretation.sections.suggestedNextScenarios')}</h4>
          <ul>
            {suggestedNext.map((scenario) => (
              <SuggestedNextLink
                key={`${scenario.target_route}:${scenario.target_preset ?? scenario.label}`}
                scenario={scenario}
                label={suggestedNextLabel(scenario, t)}
              />
            ))}
          </ul>
        </section>
      ) : interpretation.suggested_next_scenarios.length > 0 ? (
        <InterpretationSection
          title={t('scenarioLab.interpretation.sections.suggestedNextScenarios')}
          items={interpretation.suggested_next_scenarios}
          localizeItem={localizeItem}
        />
      ) : null}

      {effectiveTrustMode === 'template' ? null : (
        <aside className={`ai-attribution ai-attribution--${effectiveTrustMode}`} aria-live="polite">
          <strong>
            {effectiveTrustMode === 'reviewed'
              ? t('scenarioLab.interpretation.aiAttribution.reviewed.title', {
                  reviewed_at: reviewedDateLabel,
                })
              : t('scenarioLab.interpretation.aiAttribution.assisted.title')}
          </strong>
          <p>
            {effectiveTrustMode === 'reviewed'
              ? t('scenarioLab.interpretation.aiAttribution.reviewed.body', {
                  reviewer_name: reviewerName,
                  review_date: reviewedDateLabel,
                })
              : t('scenarioLab.interpretation.aiAttribution.assisted.body')}
          </p>
        </aside>
      )}
    </section>
  )
}
