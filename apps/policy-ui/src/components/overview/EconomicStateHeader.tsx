type EconomicStateHeaderProps = {
  summary: string
  updatedAt: string
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function EconomicStateHeader({ summary, updatedAt }: EconomicStateHeaderProps) {
  return (
    <section className="overview-state-header" aria-labelledby="overview-state-header-title">
      <p id="overview-state-header-title" className="overview-section-kicker">
        Economic State
      </p>
      <p className="overview-state-header__summary">{summary}</p>
      <p className="overview-state-header__meta">Updated {formatDateTime(updatedAt)}</p>
    </section>
  )
}
