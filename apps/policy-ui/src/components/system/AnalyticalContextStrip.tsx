type AnalyticalContextStripProps = {
  lane: string
  model: string
  runName: string
  dataVintage: string
  saveState: string
  label?: string
}

export function AnalyticalContextStrip({
  lane,
  model,
  runName,
  dataVintage,
  saveState,
  label = 'Context:',
}: AnalyticalContextStripProps) {
  const items = [lane, model, runName, dataVintage, saveState].filter((item) => item.trim().length > 0)

  return (
    <section className="analytical-context" aria-label={label.replace(':', '')}>
      <strong>{label}</strong>
      <span>{items.join(' · ')}</span>
    </section>
  )
}
