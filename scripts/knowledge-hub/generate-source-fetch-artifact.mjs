import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildKnowledgeHubChangeSummary,
  renderKnowledgeHubChangeSummaryMarkdown,
} from './change-summary.mjs'
import { buildKnowledgeHubCandidateArtifactWithDiagnostics } from './reform-intake.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..', '..')
const defaultOutputPath = resolve(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'knowledge-hub.json')

function parseArgs(argv) {
  const args = {
    output: defaultOutputPath,
    previous: defaultOutputPath,
    report: null,
    summary: null,
    changeSummary: null,
    extractedAt: new Date().toISOString(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--output') {
      args.output = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--previous') {
      args.previous = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--report') {
      args.report = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--summary') {
      args.summary = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--change-summary') {
      args.changeSummary = resolve(argv[index + 1])
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

function readJsonIfExists(path) {
  if (!path || !existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function workflowSummary(diagnostics, outputPath, changeSummary) {
  const sourceRows = diagnostics.source_results
    .map((source) => {
      const status = source.ok ? 'ok' : `failed: ${source.error}`
      return `| ${source.id} | ${source.institution} | ${source.candidate_count} | ${source.link_invalid_count} | ${status} |`
    })
    .join('\n')
  const researchRows = (diagnostics.research_source_results ?? [])
    .map((source) => {
      const status = source.ok ? 'ok' : `failed: ${source.error}`
      return `| ${source.id} | ${source.institution} | ${source.update_count} | ${status} |`
    })
    .join('\n')

  return [
    '# Knowledge Hub source-fetch artifact',
    '',
    `- Output: \`${outputPath}\``,
    `- Extraction mode: \`${diagnostics.artifact.extraction_mode}\``,
    `- Verified source item count: ${diagnostics.candidate_count}`,
    `- Research updates in artifact: ${diagnostics.research_update_count ?? diagnostics.artifact.research_updates.length}`,
    `- Source failures: ${diagnostics.source_failures.length}`,
    `- Research source failures: ${(diagnostics.research_source_failures ?? []).length}`,
    `- Carried-forward reform packages: ${diagnostics.retained_package_count ?? 0}`,
    `- Carried-forward research updates: ${diagnostics.retained_research_update_count ?? 0}`,
    '',
    '| Source | Institution | Verified items | Invalid links blocked | Status |',
    '| --- | --- | ---: | ---: | --- |',
    sourceRows,
    '',
    '| Research source | Institution | Verified updates | Status |',
    '| --- | --- | ---: | --- |',
    researchRows || '| n/a | n/a | 0 | not configured |',
    '',
    changeSummary ? renderKnowledgeHubChangeSummaryMarkdown(changeSummary) : '## Change summary versus previous public artifact\n\n- Previous public artifact was not available.',
    '',
    'This run prepares a static package-based public artifact after source-link validation. It does not publish Pages directly, create admin CRUD, call a backend API, or make official legal-registry claims.',
    '',
  ].join('\n')
}

try {
  const args = parseArgs(process.argv.slice(2))
  const previousArtifact = readJsonIfExists(args.previous)
  const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
    fetchSource: true,
    extractedAt: args.extractedAt,
    generatedBy: 'scripts/knowledge-hub/generate-source-fetch-artifact.mjs',
    includeCandidatesInArtifact: false,
    previousArtifact,
  })
  const changeSummary = buildKnowledgeHubChangeSummary(previousArtifact, diagnostics.artifact, diagnostics, {
    previousPath: args.previous,
    currentPath: args.output,
  })
  writeJson(args.output, diagnostics.artifact)
  if (args.report) writeJson(args.report, diagnostics)
  if (args.changeSummary) writeJson(args.changeSummary, changeSummary)
  if (args.summary) {
    ensureParent(args.summary)
    writeFileSync(args.summary, workflowSummary(diagnostics, args.output, changeSummary), 'utf8')
  }
  console.log(`Wrote fetched-source Knowledge Hub package artifact: ${args.output}`)
  console.log(`Verified source item count: ${diagnostics.candidate_count}`)
  console.log(`Carried-forward reform packages: ${diagnostics.retained_package_count ?? 0}`)
  for (const source of diagnostics.source_results) {
    if (source.ok) {
      console.log(`Source ${source.id}: ${source.candidate_count} verified item(s), ${source.link_invalid_count} invalid link(s) blocked`)
    } else {
      console.error(`Source ${source.id} failed: ${source.error}`)
    }
  }
  if (diagnostics.source_failures.length > 0) {
    const hasPreviousConfiguredPackages =
      previousArtifact?.extraction_mode === 'configured-source-fetch' &&
      (previousArtifact?.reform_packages?.length ?? 0) > 0
    if (hasPreviousConfiguredPackages) {
      console.error('One or more configured sources failed; previous verified packages were carried forward where needed.')
    } else {
      process.exitCode = 1
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
