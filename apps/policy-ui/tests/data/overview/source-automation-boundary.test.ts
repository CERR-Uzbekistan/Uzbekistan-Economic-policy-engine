import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it } from 'node:test'

const repoRoot = resolve(process.cwd(), '..', '..')
const srcRoot = join(repoRoot, 'apps', 'policy-ui', 'src')
const packageJsonPath = join(repoRoot, 'apps', 'policy-ui', 'package.json')

function collectSourceFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath)
    }
  }
  return files
}

describe('Overview source automation boundary', () => {
  it('keeps manual Overview fetch scripts out of policy-ui runtime source', () => {
    const forbiddenPatterns = [
      /fetch-overview-sources\.mjs/,
      /scripts\/overview\/sources/,
      /scripts\\overview\\sources/,
      /cbu-fx\.mjs/,
      /siat-trade\.mjs/,
      /snapshot-hash\.mjs/,
      /update-snapshot\.mjs/,
    ]

    for (const file of collectSourceFiles(srcRoot)) {
      const source = readFileSync(file, 'utf8')
      for (const pattern of forbiddenPatterns) {
        assert.equal(pattern.test(source), false, `${file} imports or references ${pattern}`)
      }
    }
  })

  it('does not wire CBU/stat.uz/SIAT fetching into npm run build', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>
    }
    const buildScript = packageJson.scripts.build

    assert.equal(/cbu\.uz|stat\.uz|siat|fetch-overview-sources/i.test(buildScript), false)
  })
})
