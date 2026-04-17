import type { ScenarioLabInterpretation } from '../../contracts/data-contract'

type InterpretationPanelProps = {
  interpretation: ScenarioLabInterpretation
}

function InterpretationSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="scenario-interpretation-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function InterpretationPanel({ interpretation }: InterpretationPanelProps) {
  return (
    <section
      className="scenario-panel scenario-panel--interpretation"
      aria-labelledby="scenario-interpretation-title"
    >
      <div className="scenario-panel__head">
        <h2 id="scenario-interpretation-title">Interpretation</h2>
        <p>Translate model outputs into decision language.</p>
      </div>

      <InterpretationSection title="What changed" items={interpretation.what_changed} />
      <InterpretationSection title="Why it changed" items={interpretation.why_it_changed} />
      <InterpretationSection title="Key risks" items={interpretation.key_risks} />
      <InterpretationSection title="Policy implications" items={interpretation.policy_implications} />
      <InterpretationSection
        title="Suggested next scenarios"
        items={interpretation.suggested_next_scenarios}
      />
    </section>
  )
}
