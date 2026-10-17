import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchReviewedSource } from '../sources/reviewed-source-http.mjs'
import { assertFullyValidatedRefresh } from '../refresh-report-policy.mjs'

const url = 'https://stat.uz/img/news/press-release_cpi_september_2026_en_p49619.pdf'
const bytes = Buffer.from('%PDF-1.7 official fixture')
const ok = () => ({ ok: true, url, arrayBuffer: async () => bytes })
const noWait = async () => {}

test('reviewed download preserves exact bytes and records acquisition limits', async () => {
  const result = await fetchReviewedSource(url, { fetchImpl: async (_, options) => {
    assert.equal(options.redirect, 'error')
    return ok()
  } })
  assert.deepEqual(result.body, bytes)
  assert.deepEqual(result.acquisition, { attempts: 1, timeout_ms: 45_000 })
})

for (const stage of ['headers', 'body']) {
  test(`deadline retries a stalled ${stage} download`, async () => {
    let calls = 0
    let aborted = false
    const result = await fetchReviewedSource(url, {
      timeoutMs: 10, sleep: noWait,
      fetchImpl: async (_, { signal }) => {
        calls += 1
        if (calls > 1) return ok()
        signal.addEventListener('abort', () => { aborted = true }, { once: true })
        if (stage === 'headers') return new Promise(() => {})
        return { ...ok(), arrayBuffer: () => new Promise(() => {}) }
      },
    })
    assert.equal(calls, 2)
    assert.equal(aborted, true)
    assert.equal(result.acquisition.attempts, 2)
    assert.deepEqual(result.body, bytes)
  })
}

for (const status of [408, 429, 503]) {
  test(`transient HTTP ${status} retries with bounded backoff`, async () => {
    let calls = 0
    const waits = []
    await fetchReviewedSource(url, {
      fetchImpl: async () => ++calls < 3 ? { ok: false, status } : ok(),
      sleep: async ms => { waits.push(ms) },
    })
    assert.equal(calls, 3)
    assert.deepEqual(waits, [1_000, 2_000])
  })
}

test('permanent HTTP failure does not retry', async () => {
  let calls = 0
  await assert.rejects(fetchReviewedSource(url, { fetchImpl: async () => {
    calls += 1
    return { ok: false, status: 404 }
  }, sleep: noWait }), /after 1 attempt.*HTTP 404/)
  assert.equal(calls, 1)
})

test('network failure stops after three attempts', async () => {
  let calls = 0
  await assert.rejects(fetchReviewedSource(url, { fetchImpl: async () => {
    calls += 1
    throw new TypeError('network unavailable')
  }, sleep: noWait }), /after 3 attempt.*network unavailable/)
  assert.equal(calls, 3)
})

test('changed response identity and unapproved URLs are rejected', async () => {
  let calls = 0
  const fetchImpl = async () => { calls += 1; return { ...ok(), url: 'https://example.com/source.pdf' } }
  await assert.rejects(fetchReviewedSource(url, { fetchImpl }), /approved URL/)
  assert.equal(calls, 1)
  for (const invalid of ['http://stat.uz/img/news/a.pdf', 'https://example.com/a.pdf', `${url}?redirect=x`, 'https://user@stat.uz/img/news/a.pdf']) {
    await assert.rejects(fetchReviewedSource(invalid, { fetchImpl }), /Unsupported/)
  }
  assert.equal(calls, 1)
})

test('strict publication gate rejects retained families and inconsistent report status', () => {
  const valid = { status: 'validated', families: [{ family: 'cpi-2026-09', status: 'validated' }] }
  assert.doesNotThrow(() => assertFullyValidatedRefresh(valid))
  assert.throws(() => assertFullyValidatedRefresh({ ...valid, status: 'degraded' }), /validation incomplete/)
  assert.throws(() => assertFullyValidatedRefresh({ status: 'validated', families: [{ family: 'cpi-2026-09', status: 'retained', reason: 'timeout' }] }), /cpi-2026-09: timeout/)
  assert.throws(() => assertFullyValidatedRefresh({ status: 'validated', families: [] }), /validation incomplete/)
})
