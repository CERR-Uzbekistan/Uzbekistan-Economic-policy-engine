import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const coverage = JSON.parse(readFileSync('docs/data-bridge/dfm-source-coverage.json', 'utf8'))

test('DFM source coverage records Q2 publication gate', () => {
  assert.equal(coverage.artifact.id, 'dfm-source-coverage')
  assert.equal(coverage.artifact.target_quarter, '2026Q2')
  assert.equal(coverage.readiness.required_previous_gdp_quarter, '2026Q1')
  assert.equal(coverage.readiness.required_monthly_data_through, '2026-04-01')
  assert.match(coverage.readiness.publish_gate, /Do not publish/)
})

test('DFM source coverage identifies current Q2 blocker', () => {
  assert.equal(coverage.readiness.status, 'not_ready_for_target_nowcast_refit')
  assert.equal(coverage.readiness.previous_gdp_ready, false)
  assert.equal(coverage.readiness.monthly_ready_count, 0)
  assert.equal(coverage.readiness.monthly_total_count, 35)

  const missingIds = new Set(coverage.missing_for_target.map((row) => row.variable_id))
  assert.equal(missingIds.has('gdp'), true)
  assert.equal(missingIds.has('ip_uzs'), true)
  assert.equal(missingIds.has('stock_deals'), true)
})

test('DFM source coverage separates automation channels', () => {
  assert.equal(coverage.automation.channel_counts.owner_supplied_target_or_manual_source, 1)
  assert.equal(coverage.automation.channel_counts.official_statistics_feed_required, 10)
  assert.equal(coverage.automation.channel_counts.internal_cerr_feed_required, 7)
  assert.equal(coverage.automation.channel_counts.licensed_macrobond_or_equivalent_export, 18)
})
