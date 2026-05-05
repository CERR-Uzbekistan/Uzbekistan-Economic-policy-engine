import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildKnowledgeHubCandidateArtifactWithDiagnostics } from './reform-intake.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..', '..')
const defaultOutputPath = resolve(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'knowledge-hub.json')

function parseArgs(argv) {
  const args = {
    output: defaultOutputPath,
    report: null,
    summary: null,
    extractedAt: new Date().toISOString(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--output') {
      args.output = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--report') {
      args.report = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--summary') {
      args.summary = resolve(argv[index + 1])
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

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true })
}

function writeJson(path, value) {
  ensureParent(path)
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function workflowSummary(diagnostics, outputPath) {
  const sourceRows = diagnostics.source_results
    .map((source) => {
      const status = source.ok ? 'ok' : `failed: ${source.error}`
      return `| ${source.id} | ${source.institution} | ${source.candidate_count} | ${status} |`
    })
    .join('\n')

  return [
    '# Knowledge Hub source-fetch artifact',
    '',
    `- Output: \`${outputPath}\``,
    `- Extraction mode: \`${diagnostics.artifact.extraction_mode}\``,
    `- Candidate count: ${diagnostics.candidate_count}`,
    `- Source failures: ${diagnostics.source_failures.length}`,
    '',
    '| Source | Institution | Candidates | Status |',
    '| --- | --- | ---: | --- |',
    sourceRows,
    '',
    'This manual run only prepares a static candidate artifact for review. It does not publish Pages, create admin CRUD, call a backend API, or make official reviewed policy database claims.',
    '',
  ].join('\n')
}

try {
  const args = parseArgs(process.argv.slice(2))
  const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
    fetchSource: true,
    extractedAt: args.extractedAt,
    generatedBy: 'scripts/knowledge-hub/generate-source-fetch-artifact.mjs',
  })
  writeJson(args.output, diagnostics.artifact)
  if (args.report) writeJson(args.report, diagnostics)
  if (args.summary) {
    ensureParent(args.summary)
    writeFileSync(args.summary, workflowSummary(diagnostics, args.output), 'utf8')
  }
  console.log(`Wrote fetched-source Knowledge Hub candidate artifact: ${args.output}`)
  console.log(`Candidate count: ${diagnostics.candidate_count}`)
  for (const source of diagnostics.source_results) {
    if (source.ok) {
      console.log(`Source ${source.id}: ${source.candidate_count} candidate(s)`)
    } else {
      console.error(`Source ${source.id} failed: ${source.error}`)
    }
  }
  if (diagnostics.source_failures.length > 0) {
    process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
