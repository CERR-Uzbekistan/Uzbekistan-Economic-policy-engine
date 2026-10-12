import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../../apps/policy-ui/package.json', import.meta.url))
const yaml = require('js-yaml')
const workflow = async name => yaml.load(await readFile(new URL(`../../../.github/workflows/${name}`, import.meta.url), 'utf8'))
test('regeneration dry plans depend on exact commit and packaged hashes, never hosting', async () => {
  for (const name of ['data-regen.yml', 'overview-artifact-refresh.yml', 'knowledge-hub-source-fetch.yml']) {
    const value = await workflow(name)
    const review = value.jobs['verified-review']
    assert.equal(review.uses, './.github/workflows/pages.yml')
    const producer = value.jobs[review.needs]
    assert.equal(producer.if, "github.ref == 'refs/heads/main'")
    assert.ok(producer.outputs.review_sha.includes('review_identity'))
    assert.ok(producer.outputs.data_hashes.includes('review_identity'))
    assert.ok(review.with.source_sha.includes('.outputs.review_sha'))
    assert.ok(review.with.expected_data_hashes.includes('.outputs.data_hashes'))
    assert.equal(review.with.channel, 'production-candidate')
    assert.ok(!JSON.stringify(value).includes('gh workflow run'))
    assert.ok(!JSON.stringify(value).includes('policy-ui-hosted-smoke'))
  }
})
test('review plan never publishes and records exact browser evidence', async () => {
  const value = await workflow('pages.yml')
  assert.equal(value.permissions.contents, 'read')
  assert.equal(value.permissions.pages, undefined)
  const steps = value.jobs.build.steps
  assert.ok(steps.some(step => step.run?.includes('verify-release.mjs --site _site')))
  assert.ok(steps.some(step => step.run?.includes('release_contract.py record')))
  assert.ok(steps.some(step => step.run?.includes('release_contract.py verify')))
  assert.ok(!JSON.stringify(value).includes('deploy-pages'))
  const artifact = steps.find(step => step.uses === 'actions/upload-artifact@v4')
  assert.equal(artifact.with['retention-days'], 90)
  assert.ok(artifact.with.name.includes('github.run_id'))
})
test('hosted plans require retained identity and cannot mask unavailability', async () => {
  for (const name of ['policy-ui-hosted-smoke.yml', 'policy-ui-client-hosted-smoke.yml']) {
    const value = await workflow(name)
    assert.equal(value.on.workflow_run, undefined)
    for (const key of ['review_run_id', 'artifact_name', 'expected_release_id']) assert.equal(value.on.workflow_dispatch.inputs[key].required, true)
    const text = JSON.stringify(value)
    assert.ok(text.includes('verify-release.mjs --url'))
    assert.ok(!text.includes('exit 0'))
    assert.ok(text.includes('release_contract.py verify'))
  }
})
