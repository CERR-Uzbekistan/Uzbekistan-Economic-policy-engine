import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  validateRawOverviewPayload,
  type OverviewValidationIssue,
} from '../../../src/data/adapters/overview-guard.js'

// The unit under test is summary validation, not full-payload validation — so
// these cases scope assertions to the summary path in `issues` and to
// `value.summary`, avoiding coupling to unrelated required fields like
// activityFeed that would otherwise contaminate `ok`.
function summaryIssue(issues: OverviewValidationIssue[]): OverviewValidationIssue | undefined {
  return issues.find((entry) => entry.path === 'summary')
}

describe('overview guard — summary union', () => {
  it('accepts string summary unchanged', () => {
    const result = validateRawOverviewPayload({ summary: 'Growth remains resilient.' })
    assert.equal(result.value.summary, 'Growth remains resilient.')
    assert.equal(summaryIssue(result.issues), undefined)
  })

  it('accepts NarrativeSegment[] summary and preserves segment shape', () => {
    const segments = [
      { text: 'Growth remains solid at ' },
      { text: '5.9%', emphasize: true },
      { text: ', driven by services and construction.' },
    ]
    const result = validateRawOverviewPayload({ summary: segments })
    assert.deepEqual(result.value.summary, segments)
    assert.equal(summaryIssue(result.issues), undefined)
  })

  it('rejects a malformed NarrativeSegment[] entry with an error issue', () => {
    const result = validateRawOverviewPayload({
      summary: [{ text: 'ok' }, { notText: 'missing' }],
    })
    const issue = summaryIssue(result.issues)
    assert.ok(issue, 'expected a summary-path issue')
    assert.equal(issue?.severity, 'error')
    // Malformed array must not silently become a string or be stringified.
    assert.equal(result.value.summary, undefined)
  })

  it('rejects non-string, non-array summary values', () => {
    const result = validateRawOverviewPayload({ summary: 42 })
    const issue = summaryIssue(result.issues)
    assert.ok(issue, 'expected a summary-path issue')
    assert.equal(issue?.severity, 'error')
    assert.equal(result.value.summary, undefined)
  })

  it('does not silently discard a valid NarrativeSegment[] summary', () => {
    const segments = [{ text: 'A', emphasize: true }, { text: 'B' }]
    const result = validateRawOverviewPayload({ summary: segments })
    assert.ok(Array.isArray(result.value.summary))
    assert.equal((result.value.summary as typeof segments).length, 2)
  })

  it('undefined summary leaves value.summary undefined without a summary-path issue', () => {
    const result = validateRawOverviewPayload({ summary: undefined })
    assert.equal(result.value.summary, undefined)
    assert.equal(summaryIssue(result.issues), undefined)
  })

  it('a malformed array segment blocks ok=true overall', () => {
    // Sanity check: an error-severity summary issue must contribute to ok=false
    // regardless of other fields. We construct a minimally-valid payload apart
    // from summary so any ok-failure is attributable to summary.
    const result = validateRawOverviewPayload({
      summary: [{ notText: 'missing' }],
      activityFeed: { policyActions: [], dataRefreshes: [], savedScenarios: [] },
    })
    assert.equal(result.ok, false)
  })
})
