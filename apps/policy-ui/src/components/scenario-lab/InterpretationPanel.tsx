import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type {
  NarrativeGenerationMode,
  ScenarioLabInterpretation,
  SuggestedNextScenario,
} from '../../contracts/data-contract'

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

function InterpretationSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="scenario-interpretation-section interpretation-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
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
function SuggestedNextLink({ scenario }: { scenario: SuggestedNextScenario }) {
  const to = scenario.target_preset
    ? `${scenario.target_route}?preset=${encodeURIComponent(scenario.target_preset)}`
    : scenario.target_route
  return (
    <li>
      <Link to={to} className="scenario-suggested-next__link">
        {scenario.label}
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
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.whyItChanged')}
        items={interpretation.why_it_changed}
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.keyRisks')}
        items={interpretation.key_risks}
      />
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.policyImplications')}
        items={interpretation.policy_implications}
      />

      {suggestedNext.length > 0 ? (
        <section className="scenario-suggested-next interpretation-section">
          <h4>{t('scenarioLab.interpretation.sections.suggestedNextScenarios')}</h4>
          <ul>
            {suggestedNext.map((scenario) => (
              <SuggestedNextLink
                key={`${scenario.target_route}:${scenario.target_preset ?? scenario.label}`}
                scenario={scenario}
              />
            ))}
          </ul>
        </section>
      ) : interpretation.suggested_next_scenarios.length > 0 ? (
        <InterpretationSection
          title={t('scenarioLab.interpretation.sections.suggestedNextScenarios')}
          items={interpretation.suggested_next_scenarios}
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
