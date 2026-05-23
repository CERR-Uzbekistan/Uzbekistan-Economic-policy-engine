import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const testDist = resolve('.test-dist')

await rm(testDist, { force: true, recursive: true })
