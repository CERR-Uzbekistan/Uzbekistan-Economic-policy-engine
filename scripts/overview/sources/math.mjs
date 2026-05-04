export function roundTo(value, digits = 2) {
  if (!Number.isFinite(value)) throw new Error(`Cannot round non-finite value: ${value}`)
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function percentChange(latest, prior, digits = 2) {
  if (!Number.isFinite(latest)) throw new Error(`Latest value must be finite: ${latest}`)
  if (!Number.isFinite(prior) || prior === 0) throw new Error(`Prior value must be finite and non-zero: ${prior}`)
  return roundTo(((latest - prior) / prior) * 100, digits)
}

export function addUtcMonths(dateText, months) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
  if (!match) throw new Error(`Expected YYYY-MM-DD date, received ${dateText}`)
  const sourceYear = Number(match[1])
  const sourceMonthIndex = Number(match[2]) - 1
  const sourceDay = Number(match[3])
  const targetMonthStart = new Date(Date.UTC(sourceYear, sourceMonthIndex + months, 1))
  const targetYear = targetMonthStart.getUTCFullYear()
  const targetMonthIndex = targetMonthStart.getUTCMonth()
  const lastTargetDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
  const date = new Date(Date.UTC(targetYear, targetMonthIndex, Math.min(sourceDay, lastTargetDay)))
  return date.toISOString().slice(0, 10)
}
