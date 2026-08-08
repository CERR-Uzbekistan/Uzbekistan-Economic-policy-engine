import { createHash } from 'node:crypto'

export const HASHED_METRIC_FIELDS = [
  'metric_id',
  'value',
  'previous_value',
  'source_label',
  'source_period',
  'source_url',
  'source_reference',
  'observed_at',
  'extracted_at',
  'validation_status',
  'caveats',
  'warnings',
]

function normalizeHashValue(value) {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(normalizeHashValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeHashValue(value[key])]),
    )
  }
  return value
}

export function canonicalizeForHash(value) {
  return JSON.stringify(normalizeHashValue(value))
}

export function buildHashMetric(metric) {
  return Object.fromEntries(HASHED_METRIC_FIELDS.map((field) => [field, normalizeHashValue(metric[field])]))
}

export function buildHashMetricArray(metrics) {
  return metrics
    .map(buildHashMetric)
    .sort((left, right) => left.metric_id.localeCompare(right.metric_id))
}

export function computeOverviewValueHash(snapshotOrMetrics) {
  const metrics = Array.isArray(snapshotOrMetrics) ? snapshotOrMetrics : snapshotOrMetrics.metrics
  if (!Array.isArray(metrics)) {
    throw new Error('Cannot compute Overview value_hash without a metrics array.')
  }

  return createHash('sha256')
    .update(canonicalizeForHash(buildHashMetricArray(metrics)))
    .digest('hex')
}
