import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const testRoot = resolve('.test-dist/tests')

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectTestFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(entryPath)
    }
  }

  return files
}

const testFiles = (await collectTestFiles(testRoot)).sort()

if (testFiles.length === 0) {
  throw new Error(`No compiled test files found under ${testRoot}`)
}

for (const file of testFiles) {
  await import(pathToFileURL(file).href)
}
