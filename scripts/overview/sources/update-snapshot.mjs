import { computeOverviewValueHash, HASHED_METRIC_FIELDS } from './snapshot-hash.mjs'

export const AUTOMATION_PENDING_OWNER_REVIEW = 'automation_pending_owner_review'

const SAFETY_FIELDS = new Set(HASHED_METRIC_FIELDS)

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function valuesEqual(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

export function applyMetricUpdatesToSnapshot(snapshot, updates, options = {}) {
  const next = cloneJson(snapshot)
  if (!Array.isArray(next.metrics)) throw new Error('Snapshot metrics must be an array.')

  const metricById = new Map(next.metrics.map((metric) => [metric.metric_id, metric]))
  const diff = []
  for (const update of updates) {
    const metric = metricById.get(update.metric_id)
    if (!metric) throw new Error(`Cannot update unknown Overview metric ${update.metric_id}.`)

    for (const [field, newValue] of Object.entries(update)) {
      if (field === 'metric_id') continue
      const oldValue = metric[field]
      if (!valuesEqual(oldValue, newValue)) {
        diff.push({
          metric_id: update.metric_id,
          field,
          old_value: oldValue ?? null,
          new_value: newValue ?? null,
        })
        metric[field] = newValue
      }
    }
  }

  const safetyMutation = diff.some((entry) => SAFETY_FIELDS.has(entry.field))
  if (safetyMutation || options.forcePending) {
    next.status = AUTOMATION_PENDING_OWNER_REVIEW
    delete next.snapshot_accepted_by
    delete next.snapshot_accepted_at
  }
  next.value_hash = computeOverviewValueHash(next)

  return {
    snapshot: next,
    diff,
    changed: diff.length > 0,
    statusChanged: safetyMutation || Boolean(options.forcePending),
    value_hash: next.value_hash,
  }
}

export function formatDiffReport(diff) {
  if (diff.length === 0) return 'No metric changes planned.'
  return diff
    .map((entry) => {
      const oldValue = JSON.stringify(entry.old_value)
      const newValue = JSON.stringify(entry.new_value)
      return `${entry.metric_id}.${entry.field}: ${oldValue} -> ${newValue}`
    })
    .join('\n')
}
