// Acquisition and export are separate events. Never rewrite source timestamps.
export function resolveRefreshExportedAt(startedAt, completedAt) {
  const start = Date.parse(startedAt)
  const completion = Date.parse(completedAt)
  if (!Number.isFinite(start) || !Number.isFinite(completion)) throw new Error('Invalid refresh clock timestamp')
  if (completion < start) throw new Error('Refresh completion precedes start; check the clock')
  return new Date(completion).toISOString()
}
