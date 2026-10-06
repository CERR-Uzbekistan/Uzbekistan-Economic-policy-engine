import { createHash } from 'node:crypto'
import { parseSiatCpiMomDataset, parseSiatCpiMonthPeriod, SIAT_CPI_MOM_SOURCE_URL } from './siat-cpi.mjs'
import { ManualRequiredError } from './siat-trade.mjs'

function manualRequired(reason, details = {}) {
  throw new ManualRequiredError(reason, details)
}

function timestamp(value, field) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value ?? '') ||
      !Number.isFinite(time) || new Date(time).toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) {
    manualRequired('reviewed_release_timestamp_invalid', { field, value })
  }
  return time
}

function validateEvidence(release, body, asOf) {
  const checkedAt = timestamp(asOf, 'asOf')
  const observedAt = timestamp(release.observed_at, 'observed_at')
  if (observedAt > checkedAt) manualRequired('reviewed_release_observation_in_future', { observedAt: release.observed_at, asOf })
  if (typeof release.period !== 'string' || !release.period.trim() ||
      typeof release.evidence !== 'string' || !release.evidence.trim()) {
    manualRequired('reviewed_release_provenance_missing')
  }
  if (!Buffer.isBuffer(body) && !(body instanceof Uint8Array)) manualRequired('reviewed_release_bytes_missing')
  const bytes = Buffer.from(body)
  if (release.sha256 !== undefined) {
    if (!/^[a-f0-9]{64}$/.test(release.sha256)) manualRequired('reviewed_release_hash_invalid')
    if (createHash('sha256').update(bytes).digest('hex') !== release.sha256) {
      manualRequired('reviewed_release_hash_changed')
    }
  }
  if (release.required_title !== undefined) {
    if (typeof release.required_title !== 'string' || !release.required_title.trim() ||
        !bytes.toString('utf8').includes(release.required_title)) {
      manualRequired('reviewed_release_title_missing')
    }
  }
  if (!release.sha256 && !release.required_title) manualRequired('reviewed_release_identity_unproven')
  return { bytes, observedAt }
}

// The registry supplies reviewed annual/food values. SIAT corroborates exactly
// that release's monthly observation; this helper never produces a cpi_mom update.
export function buildReviewedReleaseMetricUpdates({ release, body, snapshot, asOf, siatCpiJson }) {
  if (!release || typeof release.id !== 'string') manualRequired('reviewed_release_id_missing')
  const isCpi = release.id.startsWith('cpi-')
  let sourceUrl
  try { sourceUrl = new URL(release.url) } catch { manualRequired('reviewed_release_url_invalid') }
  if (sourceUrl.protocol !== 'https:' || !['stat.uz', 'cbu.uz'].includes(sourceUrl.hostname) ||
      sourceUrl.username || sourceUrl.password || (isCpi && sourceUrl.hostname !== 'stat.uz')) {
    manualRequired('reviewed_release_source_not_official')
  }
  const { bytes, observedAt } = validateEvidence(release, body, asOf)
  let sourceReference = release.evidence
  let cpiPeriod
  if (isCpi) {
    if (!release.sha256 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      manualRequired('reviewed_cpi_pdf_identity_unproven')
    }
    const expected = release.reconciliation
    if (expected?.metric_id !== 'cpi_mom' || typeof expected.value !== 'number' || !Number.isFinite(expected.value)) {
      manualRequired('reviewed_cpi_reconciliation_missing')
    }
    if (!siatCpiJson) manualRequired('reviewed_cpi_siat_evidence_missing')
    const dataset = parseSiatCpiMomDataset(siatCpiJson, {
      sourceUrl: SIAT_CPI_MOM_SOURCE_URL, period: release.period, asOf,
    })
    cpiPeriod = dataset.current
    if (Date.UTC(dataset.current.year, dataset.current.month, 1) > observedAt) {
      manualRequired('reviewed_cpi_release_precedes_period_end')
    }
    if (dataset.current.value !== expected.value) {
      manualRequired('reviewed_cpi_monthly_value_mismatch', {
        period: release.period, expected: expected.value, actual: dataset.current.value,
      })
    }
    sourceReference += ` Independently reconciled to SIAT 4585 (${SIAT_CPI_MOM_SOURCE_URL}) for ${dataset.current.periodLabel}: aggregate index ${dataset.current.indexValue} minus 100 = ${dataset.current.value}%.`
  }
  if (!Array.isArray(release.metrics) || release.metrics.length === 0) manualRequired('reviewed_release_metrics_missing')
  const seen = new Set()
  return release.metrics.flatMap(entry => {
    if (!entry || typeof entry.metric_id !== 'string' || seen.has(entry.metric_id) ||
        !Number.isFinite(entry.value) || (entry.previous_value !== null && !Number.isFinite(entry.previous_value))) {
      manualRequired('reviewed_release_metric_invalid')
    }
    seen.add(entry.metric_id)
    if (isCpi && !['cpi_yoy', 'food_cpi_yoy'].includes(entry.metric_id)) {
      manualRequired('reviewed_cpi_metric_out_of_scope', { metricId: entry.metric_id })
    }
    const old = snapshot?.metrics?.find(metric => metric.metric_id === entry.metric_id)
    if (!old) manualRequired('reviewed_release_snapshot_metric_missing', { metricId: entry.metric_id })
    // A historical reviewed release must not overwrite a newer annual/food release.
    if (cpiPeriod) {
      const oldPeriod = parseSiatCpiMonthPeriod(old.source_period, `${entry.metric_id}.source_period`)
      if (oldPeriod.year * 12 + oldPeriod.month > cpiPeriod.year * 12 + cpiPeriod.month) return []
    }
    if (timestamp(old.observed_at ?? old.extracted_at, `${entry.metric_id}.observed_at`) > observedAt) return []
    return [{
      metric_id: entry.metric_id, value: entry.value, previous_value: entry.previous_value,
      source_period: release.period, source_url: release.url, observed_at: release.observed_at, extracted_at: asOf,
      source_reference: sourceReference, validation_status: 'valid',
      warnings: [], caveats: [sourceReference],
    }]
  })
}
