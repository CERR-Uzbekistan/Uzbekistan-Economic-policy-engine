import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildReviewedReleaseMetricUpdates } from '../sources/reviewed-releases.mjs'
import { buildSiatCpiMetricUpdates, parseSiatCpiMomDataset, SIAT_CPI_MOM_SOURCE_URL } from '../sources/siat-cpi.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'

const asOf = '2026-10-06T12:00:00Z'
const body = Buffer.from('%PDF-1.7\nOffline reviewed CPI evidence\n\xff\x00', 'binary')
const sha256 = createHash('sha256').update(body).digest('hex')
const sourceFixture = JSON.parse(readFileSync(new URL('../source-discovery/phase3/siat-cpi-all-items-mom-4585.json', import.meta.url), 'utf8'))

function fixture() {
  const metadata = structuredClone(sourceFixture[0].metadata)
  metadata.find(record => record.name_en === 'Last modified date').value_en = '2026-10-05'
  const siatCpiJson = [{ metadata, data: [{
    Code: '1', Klassifikator_en: 'COMPOSITE INDEX',
    '2026-\u041c07': 99.8, '2026-M08': 100.2, '2026-M09': 100.7,
  }] }]
  const release = {
    id: 'cpi-2026-08', url: 'https://stat.uz/offline-reviewed-cpi.pdf', sha256,
    observed_at: '2026-09-05T00:00:00Z', period: 'August 2026', evidence: 'Reviewed annual and food CPI fixture.',
    reconciliation: { metric_id: 'cpi_mom', value: 0.2 },
    metrics: [
      { metric_id: 'cpi_yoy', value: 6.2, previous_value: 6.4 },
      { metric_id: 'food_cpi_yoy', value: 6.2, previous_value: 6.4 },
    ],
  }
  const snapshot = { status: 'owner_verified_for_public_artifact', snapshot_accepted_by: 'fixture owner', metrics: [
    { metric_id: 'cpi_mom', source_period: 'September 2026', value: 0.7, previous_value: 0.2,
      source_url: SIAT_CPI_MOM_SOURCE_URL, observed_at: '2026-10-05T00:00:00Z', extracted_at: asOf },
    ...release.metrics.map(entry => ({ ...entry, value: 6.4, source_period: 'July 2026',
      observed_at: '2026-08-05T00:00:00Z', extracted_at: '2026-08-06T00:00:00Z' })),
  ] }
  snapshot.value_hash = computeOverviewValueHash(snapshot)
  return { release, body, snapshot, asOf, siatCpiJson }
}

function rejectsUnchanged(input, reason) {
  const before = structuredClone(input.snapshot)
  assert.throws(() => buildReviewedReleaseMetricUpdates(input), error => {
    assert.equal(error.code, 'manual_required')
    assert.equal(error.reason, reason)
    return true
  })
  assert.deepEqual(input.snapshot, before)
}

test('reconciles reviewed August CPI against August SIAT while preserving latest September MoM', () => {
  const input = fixture()
  const before = structuredClone(input)
  const updates = buildReviewedReleaseMetricUpdates(input)
  assert.deepEqual(updates.map(entry => entry.metric_id), ['cpi_yoy', 'food_cpi_yoy'])
  assert.ok(updates.every(entry => entry.source_period === 'August 2026'))
  assert.match(updates[0].source_reference, /August 2026: aggregate index 100\.2 minus 100 = 0\.2%/)
  assert.match(updates[0].source_reference, /sdmx_data_4585\.json/)
  assert.equal(updates[0].source_url, input.release.url)
  assert.equal(updates[0].observed_at, input.release.observed_at)
  const result = applyMetricUpdatesToSnapshot(input.snapshot, updates, {
    publicStatus: 'source_verified_for_public_artifact', sourceVerifiedBy: 'offline-test', sourceVerifiedAt: asOf,
  })
  assert.equal(result.snapshot.status, 'source_verified_for_public_artifact')
  assert.equal('snapshot_accepted_by' in result.snapshot, false)
  assert.equal(result.value_hash, computeOverviewValueHash(result.snapshot))
  assert.deepEqual(result.snapshot.metrics[0], input.snapshot.metrics[0])
  assert.deepEqual(input.snapshot, before.snapshot)
  assert.deepEqual(input.siatCpiJson, before.siatCpiJson)
})

test('uses registry expected value for a newer reviewed September release, rather than a fixed constant', () => {
  const input = fixture()
  Object.assign(input.release, { id: 'cpi-2026-09', period: 'September 2026', observed_at: '2026-10-05T00:00:00Z',
    reconciliation: { metric_id: 'cpi_mom', value: 0.7 } })
  const updates = buildReviewedReleaseMetricUpdates(input)
  assert.equal(updates.length, 2)
  assert.equal(updates[0].source_period, 'September 2026')
  assert.match(updates[0].source_reference, /100\.7 minus 100 = 0\.7%/)
})

test('historical evidence selection does not alter the live builder or relax its regression guard', async () => {
  const input = fixture()
  const options = { period: 'August 2026', asOf }
  const historical = parseSiatCpiMomDataset(input.siatCpiJson, options)
  assert.equal(historical.current.periodKey, '2026-M08')
  assert.equal(historical.current.value, 0.2)
  assert.equal(historical.previous.periodKey, '2026-\u041c07')
  const updates = await buildSiatCpiMetricUpdates({
    snapshot: input.snapshot, extractedAt: asOf, period: 'August 2026', fetchJson: async () => input.siatCpiJson,
  })
  assert.equal(updates[0].source_period, 'September 2026')
  assert.equal(updates[0].value, 0.7)
  input.snapshot.metrics[0].source_period = 'October 2026'
  await assert.rejects(() => buildSiatCpiMetricUpdates({
    snapshot: input.snapshot, extractedAt: asOf, fetchJson: async () => input.siatCpiJson,
  }), { reason: 'siat_cpi_mom_source_older_than_snapshot' })
})

test('does not replace newer annual/food CPI with an older reviewed release', () => {
  const input = fixture()
  input.snapshot.metrics.slice(1).forEach(metric => {
    metric.source_period = 'September 2026'
    metric.observed_at = '2026-10-05T00:00:00Z'
  })
  assert.deepEqual(buildReviewedReleaseMetricUpdates(input), [])
  // Even a no-op must validate the pinned bytes and corroborating evidence.
  input.body = Buffer.from('changed')
  rejectsUnchanged(input, 'reviewed_release_hash_changed')
})

test('a later publication of an older CPI period does not regress the annual/food source period', () => {
  const input = fixture()
  input.snapshot.metrics.slice(1).forEach(metric => {
    metric.source_period = 'September 2026'
    metric.observed_at = '2026-10-05T00:00:00Z'
  })
  input.release.observed_at = '2026-10-06T00:00:00Z'
  assert.deepEqual(buildReviewedReleaseMetricUpdates(input), [])
})

test('repeat reconciliation does not move extraction time or hash for otherwise unchanged evidence', () => {
  const input = fixture()
  const first = applyMetricUpdatesToSnapshot(input.snapshot, buildReviewedReleaseMetricUpdates(input))
  const next = { ...input, snapshot: first.snapshot, asOf: '2026-10-07T12:00:00Z' }
  const second = applyMetricUpdatesToSnapshot(first.snapshot, buildReviewedReleaseMetricUpdates(next))
  assert.equal(second.changed, false)
  assert.equal(second.value_hash, first.value_hash)
  assert.deepEqual(second.snapshot, first.snapshot)
})

test('rejects missing requested months and Latin/Cyrillic duplicate periods', () => {
  const missing = fixture()
  delete missing.siatCpiJson[0].data[0]['2026-M08']
  rejectsUnchanged(missing, 'siat_cpi_mom_requested_period_missing')
  for (const month of ['07', '08', '09']) {
    const duplicate = fixture()
    duplicate.siatCpiJson[0].data[0][`2026-${month === '07' ? 'M' : '\u041c'}${month}`] = 100.2
    rejectsUnchanged(duplicate, 'siat_cpi_mom_period_ambiguous')
    assert.throws(() => parseSiatCpiMomDataset(duplicate.siatCpiJson), { reason: 'siat_cpi_mom_period_ambiguous' })
  }
  const malformed = fixture()
  malformed.release.period = '2026-M08'
  rejectsUnchanged(malformed, 'siat_cpi_mom_requested_period_unparseable')
})

test('requires current and previous month valid aggregate indices for historical selection', () => {
  for (const [value, reason] of [
    [0, 'siat_cpi_mom_zero_sentinel_on_aggregate'], [107, 'siat_cpi_mom_sanity_bound_failed'],
    ['100,2', 'siat_cpi_mom_numeric_parsing_ambiguous'],
  ]) {
    for (const key of ['2026-M08', '2026-\u041c07']) {
      const input = fixture()
      input.siatCpiJson[0].data[0][key] = value
      rejectsUnchanged(input, reason)
    }
  }
  const missing = fixture()
  delete missing.siatCpiJson[0].data[0]['2026-\u041c07']
  rejectsUnchanged(missing, 'siat_cpi_mom_previous_month_missing')
})

test('rejects missing captured SIAT data, incorrect identity, units, and aggregate row', () => {
  const missing = fixture()
  delete missing.siatCpiJson
  rejectsUnchanged(missing, 'reviewed_cpi_siat_evidence_missing')
  for (const [name, value, reason] of [
    ['Indicator identification number (code)', 'wrong', 'siat_cpi_mom_indicator_code_mismatch'],
    ['Unit of measurement', 'Index points', 'siat_cpi_mom_unit_not_proven'],
    ['Periodicity', 'Annual', 'siat_cpi_mom_frequency_not_proven'],
  ]) {
    const input = fixture()
    input.siatCpiJson[0].metadata.find(record => record.name_en === name).value_en = value
    rejectsUnchanged(input, reason)
  }
  const product = fixture()
  product.siatCpiJson[0].data[0].Code = '1.02'
  rejectsUnchanged(product, 'siat_cpi_mom_aggregate_row_match_count')
})

test('requires explicit CPI reconciliation and rejects mismatched expected values or monthly update entries', () => {
  for (const reconciliation of [undefined, { metric_id: 'cpi_yoy', value: 0.2 }, { metric_id: 'cpi_mom', value: '0.2' }]) {
    const input = fixture()
    input.release.reconciliation = reconciliation
    rejectsUnchanged(input, 'reviewed_cpi_reconciliation_missing')
  }
  const mismatch = fixture()
  mismatch.release.reconciliation.value = 0.7
  rejectsUnchanged(mismatch, 'reviewed_cpi_monthly_value_mismatch')
  const monthly = fixture()
  monthly.release.metrics.push({ metric_id: 'cpi_mom', value: 0.2, previous_value: -0.2 })
  rejectsUnchanged(monthly, 'reviewed_cpi_metric_out_of_scope')
})

test('requires exact reviewed PDF bytes and valid pinned hash, not a title alone', () => {
  const changed = fixture()
  changed.body = Buffer.concat([body, Buffer.from('\n')])
  rejectsUnchanged(changed, 'reviewed_release_hash_changed')
  const invalid = fixture()
  invalid.release.sha256 = 'not-a-hash'
  rejectsUnchanged(invalid, 'reviewed_release_hash_invalid')
  const titleOnly = fixture()
  delete titleOnly.release.sha256
  titleOnly.release.required_title = 'Offline reviewed CPI evidence'
  rejectsUnchanged(titleOnly, 'reviewed_cpi_pdf_identity_unproven')
  const notPdf = fixture()
  notPdf.body = Buffer.from('html masquerading as reviewed pdf')
  notPdf.release.sha256 = createHash('sha256').update(notPdf.body).digest('hex')
  rejectsUnchanged(notPdf, 'reviewed_cpi_pdf_identity_unproven')
})

test('rejects invalid and future release/SIAT timestamps and incomplete monthly evidence', () => {
  for (const observed_at of ['2026-02-30T00:00:00Z', '2026-09-05', 'invalid']) {
    const input = fixture()
    input.release.observed_at = observed_at
    rejectsUnchanged(input, 'reviewed_release_timestamp_invalid')
  }
  const future = fixture()
  future.release.observed_at = '2026-10-07T00:00:00Z'
  rejectsUnchanged(future, 'reviewed_release_observation_in_future')
  const futureSiat = fixture()
  futureSiat.siatCpiJson[0].metadata.find(record => record.name_en === 'Last modified date').value_en = '2026-10-07'
  rejectsUnchanged(futureSiat, 'siat_cpi_mom_observation_in_future')
  const invalidSiat = fixture()
  invalidSiat.siatCpiJson[0].metadata.find(record => record.name_en === 'Last modified date').value_en = '2026-02-30'
  rejectsUnchanged(invalidSiat, 'siat_cpi_mom_last_modified_date_invalid')
  const prematureRelease = fixture()
  prematureRelease.release.observed_at = '2026-08-15T00:00:00Z'
  rejectsUnchanged(prematureRelease, 'reviewed_cpi_release_precedes_period_end')
  const prematureSiat = fixture()
  prematureSiat.siatCpiJson[0].metadata.find(record => record.name_en === 'Last modified date').value_en = '2026-08-31'
  rejectsUnchanged(prematureSiat, 'siat_cpi_mom_period_not_complete')
})

function policyFixture() {
  const input = fixture()
  input.body = Buffer.from('<html><h1>Reviewed policy decision title</h1></html>')
  input.release = {
    id: 'policy-rate-fixture', url: 'https://cbu.uz/reviewed-decision',
    required_title: 'Reviewed policy decision title', observed_at: '2026-09-16T00:00:00Z',
    period: 'Decision of 16 September 2026', evidence: 'Reviewed policy rate is 14%.',
    metrics: [{ metric_id: 'policy_rate', value: 14, previous_value: 14 }],
  }
  input.snapshot.metrics.push({ metric_id: 'policy_rate', value: 14, observed_at: '2026-07-31T00:00:00Z' })
  return input
}

test('validates reviewed decision titles and only accepts official HTTPS sources', () => {
  const input = policyFixture()
  assert.equal(buildReviewedReleaseMetricUpdates(input)[0].value, 14)
  input.body = Buffer.from('unrelated decision')
  rejectsUnchanged(input, 'reviewed_release_title_missing')
  for (const url of ['https://unofficial.example/release', 'http://cbu.uz/release', 'https://cbu.uz.example/release', 'https://name@cbu.uz/release']) {
    const unofficial = policyFixture()
    unofficial.release.url = url
    rejectsUnchanged(unofficial, 'reviewed_release_source_not_official')
  }
})

test('candidate uses captured SIAT payload with the helper and retains failed reviewed releases', () => {
  const candidate = readFileSync(new URL('../refresh-candidate.mjs', import.meta.url), 'utf8')
  assert.match(candidate, /capturedJson\.set\(url, data\)/)
  assert.match(candidate, /buildReviewedReleaseMetricUpdates\(\{/)
  assert.match(candidate, /siatCpiJson: capturedJson\.get\(SIAT_CPI_MOM_SOURCE_URL\)/)
  assert.match(candidate, /family: release\.id, status: 'retained', reason: error\.reason \?\? error\.message/)
  assert.doesNotMatch(candidate, /monthly\.value !== 0\.2/)
})
