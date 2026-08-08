export function toDateEyebrow(isoTimestamp: string, locale: string): string {
  const parsed = Date.parse(isoTimestamp)
  if (!Number.isFinite(parsed)) {
    return isoTimestamp.toUpperCase()
  }
  const label = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(parsed))
  return label.toUpperCase()
}
