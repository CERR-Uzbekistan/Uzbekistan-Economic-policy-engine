import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')

test('script tests use fixtures and do not contain live source fetches', () => {
  const cbuTestSource = readFileSync(join(repoRoot, 'scripts', 'overview', 'tests', 'cbu-fx.test.mjs'), 'utf8')
  const siatTestSource = readFileSync(join(repoRoot, 'scripts', 'overview', 'tests', 'siat-trade.test.mjs'), 'utf8')

  assert.equal(cbuTestSource.includes('fetch('), false)
  assert.equal(siatTestSource.includes('fetch('), false)
  assert.ok(cbuTestSource.includes('fixtureFetchJson'))
  assert.ok(siatTestSource.includes('fixtureFetchJson'))
})
