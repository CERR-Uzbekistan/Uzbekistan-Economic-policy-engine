import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function findRscript() {
  if (process.env.RSCRIPT) return process.env.RSCRIPT
  if (process.platform === 'win32') {
    const common = 'C:\\Program Files\\R\\R-4.5.2\\bin\\Rscript.exe'
    if (existsSync(common)) return common
  }
  return 'Rscript'
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const rscript = findRscript()
const commandArgs = [resolve(scriptDir, 'audit-source-coverage.R'), repoRoot, ...process.argv.slice(2)]

const result = spawnSync(rscript, commandArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: repoRoot,
})

if (result.error) {
  throw new Error(`DFM source coverage audit failed to start: ${result.error.message}`)
}
if (result.status !== 0) {
  process.exitCode = result.status ?? 1
}
