import { useTranslation } from 'react-i18next'
import type { NarrativeGenerationMode, ScenarioLabInterpretation } from '../../contracts/data-contract'

type InterpretationPanelProps = {
  interpretation: ScenarioLabInterpretation
}

type InterpretationWithMetadata = ScenarioLabInterpretation & {
  generation_mode?: NarrativeGenerationMode
  reviewer_name?: string
  reviewed_at?: string
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

export function InterpretationPanel({ interpretation }: InterpretationPanelProps) {
  const { t, i18n } = useTranslation()
  const interpretationWithMetadata = interpretation as InterpretationWithMetadata
  const generationMode = interpretationWithMetadata.generation_mode ?? 'template'
  const reviewerName = interpretationWithMetadata.reviewer_name?.trim() ?? ''
  const reviewedAtFormatted = formatReviewedAt(
    interpretationWithMetadata.reviewed_at,
    i18n.resolvedLanguage ?? 'en',
  )

  const shouldFallbackReviewedToAssisted = generationMode === 'reviewed' && reviewerName.length === 0
  if (shouldFallbackReviewedToAssisted) {
    console.warn('ScenarioLab interpretation marked as reviewed without reviewer_name. Falling back to assisted.')
  }

  const effectiveMode = shouldFallbackReviewedToAssisted ? 'assisted' : generationMode

  return (
    <section
      className="scenario-panel scenario-panel--interpretation"
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
      <InterpretationSection
        title={t('scenarioLab.interpretation.sections.suggestedNextScenarios')}
        items={interpretation.suggested_next_scenarios}
      />

      {effectiveMode === 'assisted' ? (
        <aside className="ai-attribution" aria-live="polite">
          <strong>{t('scenarioLab.interpretation.aiAttribution.assisted.title')}</strong>
          <p>{t('scenarioLab.interpretation.aiAttribution.assisted.body')}</p>
        </aside>
      ) : null}

      {effectiveMode === 'reviewed' ? (
        <aside className="ai-attribution ai-attribution--reviewed" aria-live="polite">
          <strong>
            {t('scenarioLab.interpretation.aiAttribution.reviewed.title', {
              reviewed_at: reviewedAtFormatted || interpretationWithMetadata.reviewed_at || '',
            })}
          </strong>
          <p>
            {t('scenarioLab.interpretation.aiAttribution.reviewed.body', {
              reviewer_name: reviewerName,
              review_date: reviewedAtFormatted || interpretationWithMetadata.reviewed_at || '',
            })}
          </p>
        </aside>
      ) : null}
    </section>
  )
}
