import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../../apps/policy-ui/package.json', import.meta.url))
const yaml = require('js-yaml')
const read = async name => yaml.load(await readFile(new URL(`../../../.github/workflows/${name}`, import.meta.url), 'utf8'))

test('refresh remains scheduled, validates PRs and cannot deploy or change QPM', async () => {
  const workflow = await read('overview-artifact-refresh.yml')
  assert.equal(workflow.on.schedule[0].cron, '30 4 * * 1-5')
  assert.ok(workflow.on.pull_request)
  assert.equal(workflow.permissions.actions, undefined)
  const refresh = workflow.jobs['refresh-overview-artifact']
  assert.match(refresh.if, /github.ref == 'refs\/heads\/main'/)
  assert.match(refresh.if, /github.event_name != 'pull_request'/)
  assert.ok(refresh.steps.some(step => step.run?.includes('--allow-partial true')))
  assert.ok(refresh.steps.some(step => step.run?.includes('refresh-candidate.mjs')))
  assert.ok(refresh.steps.some(step => step.uses === 'actions/upload-artifact@v4' && step.with['retention-days'] === 90))
  assert.ok(!refresh.steps.some(step => /export_qpm|workflow run pages|deploy/.test(step.run ?? '')))
  const validation = workflow.jobs['verify-refresh-change']
  assert.equal(validation.permissions.contents, 'read')
  assert.ok(validation.steps.some(step => step.run === 'npm test'))
  assert.ok(validation.steps.some(step => step.run === 'npm run build'))
  const pages = await read('pages.yml')
  assert.equal(pages.on.push, undefined)
  assert.ok(Object.hasOwn(pages.on, 'workflow_dispatch'))
})
