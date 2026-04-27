import type { ReactNode } from 'react'

type AnalyticalContextStripProps = {
  lane: string
  model: string
  runName: string
  dataVintage: string
  saveState: string
  label?: string
  stateLabels?: ReactNode[]
}

export function AnalyticalContextStrip({
  lane,
  model,
  runName,
  dataVintage,
  saveState,
  label = 'Context:',
  stateLabels = [],
}: AnalyticalContextStripProps) {
  const items = [lane, model, runName, dataVintage, saveState].filter((item) => item.trim().length > 0)

  return (
    <section className="analytical-context" aria-label={label.replace(':', '')}>
      <strong>{label}</strong>
      <span>{items.join(' · ')}</span>
      {stateLabels.length > 0 ? <div className="analytical-context__labels">{stateLabels}</div> : null}
    </section>
  )
}
