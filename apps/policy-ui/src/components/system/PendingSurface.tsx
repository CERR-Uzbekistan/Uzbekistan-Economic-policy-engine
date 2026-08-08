import { useId } from 'react'

type PendingSurfaceProps = {
  title: string
  message: string
  reasonLabel: string
  nextStep?: string
  className?: string
}

export function PendingSurface({
  title,
  message,
  reasonLabel,
  nextStep,
  className,
}: PendingSurfaceProps) {
  const classes = ['pending-surface', className].filter(Boolean).join(' ')
  const titleId = useId()

  return (
    <section className={classes} aria-labelledby={titleId} role="status">
      <div className="pending-surface__body">
        <span className="pending-surface__label">{reasonLabel}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        {nextStep ? <p className="pending-surface__next">{nextStep}</p> : null}
      </div>
    </section>
  )
}
