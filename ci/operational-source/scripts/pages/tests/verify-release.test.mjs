import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { boundedFetch, verifyServed, verifyRelease } from '../verify-release.mjs'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
test('persistent unavailable and timeout exhaust bounded attempts and fail', async () => {
  let calls = 0
  await assert.rejects(boundedFetch('http://127.0.0.1/', { attempts: 2, fetcher: async () => { calls++; throw new Error('timeout') } }), /hosting_unavailable_or_timeout/)
  assert.equal(calls, 2)
})
test('served release mismatch fails before task execution', async () => {
  const identity = Buffer.from(JSON.stringify({ release_id: 'selected' }))
  await assert.rejects(verifyServed('https://example.org/policy-ui/', identity, async () => Buffer.from('{}')), /served_release_identity_mismatch/)
})
test('exact content mismatch fails even if manifest and release match', async () => {
  const manifest = Buffer.from(JSON.stringify({ files: [{ path: 'index.html', bytes: 3, sha256: hash('old') }] }))
  const identity = Buffer.from(JSON.stringify({ release_id: 'selected', publication_manifest_sha256: hash(manifest) }))
  await assert.rejects(verifyServed('https://example.org/policy-ui/', identity, async url => url.pathname.endsWith('release-identity.json') ? identity : url.pathname.endsWith('publication-manifest.json') ? manifest : Buffer.from('new')), /served_content_mismatch/)
})
test('unavailable served artifact cannot report verified or invoke task smoke', async () => {
  let ran = false
  const evidence = await verifyRelease('http://127.0.0.1:1/policy-ui/', Buffer.from(JSON.stringify({ release_id: 'selected', publication_manifest_sha256: 'hash' })), async () => { ran = true })
  assert.equal(evidence.status, 'unverified')
  assert.equal(ran, false)
  assert.ok(Object.values(evidence.checks).every(value => value === false))
})
test('browser/task failure is bound to identity and prevents eligibility', async () => {
  const manifest = Buffer.from(JSON.stringify({ files: [] }))
  const identity = Buffer.from(JSON.stringify({ release_id: 'selected', publication_manifest_sha256: hash(manifest) }))
  const fetcher = async url => url.pathname.endsWith('release-identity.json') ? identity : manifest
  const evidence = await verifyRelease('https://example.org/policy-ui/', identity, async () => { throw new Error('task_failed') }, fetcher)
  assert.equal(evidence.status, 'unverified')
  assert.equal(evidence.release_id, 'selected')
  assert.equal(evidence.checks.direct_http, true)
  assert.equal(evidence.checks.scenario_save_reload_export, false)
  assert.deepEqual(evidence.reasons, ['task_failed'])
})
test('a different verifier cannot reuse release verification', async () => {
  let ran = false
  const evidence = await verifyRelease('https://example.org/policy-ui/', Buffer.from(JSON.stringify({ release_id: 'selected', publication_manifest_sha256: 'hash', verifier_sha256: '0'.repeat(64) })), async () => { ran = true })
  assert.equal(evidence.status, 'unverified')
  assert.equal(ran, false)
  assert.deepEqual(evidence.reasons, ['verification_implementation_mismatch'])
})
