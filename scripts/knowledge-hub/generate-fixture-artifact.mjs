import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildKnowledgeHubCandidateArtifact } from './reform-intake.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..', '..')
const defaultOutputPath = resolve(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'knowledge-hub.json')

function parseArgs(argv) {
  const args = {
    output: defaultOutputPath,
    extractedAt: new Date().toISOString(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--output') {
      args.output = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--extracted-at') {
      args.extractedAt = argv[index + 1]
      index += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

try {
  const args = parseArgs(process.argv.slice(2))
  const artifact = await buildKnowledgeHubCandidateArtifact({
    fetchSource: false,
    extractedAt: args.extractedAt,
    generatedBy: 'scripts/knowledge-hub/generate-fixture-artifact.mjs',
    includeCandidatesInArtifact: false,
  })
  writeFileSync(args.output, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  console.log(`Wrote fixture/demo Knowledge Hub package artifact: ${args.output}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
