import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { computeOverviewValueHash } from './sources/snapshot-hash.mjs'

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const generatedBy = 'scripts/overview/export-overview.mjs'
const defaultSourcePath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const defaultOutputPath = join(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'overview.json')
const PUBLIC_EXPORT_SOURCE_STATUS = 'owner_verified_for_public_artifact'

let OVERVIEW_ARTIFACT_SCHEMA_VERSION
let OVERVIEW_LOCKED_METRICS
let OVERVIEW_TOP_CARD_METRIC_IDS
let validateOverviewArtifact

const PANEL_TITLES = {
  growth: 'Growth',
  inflation: 'Inflation',
  trade: 'Trade',
  monetary_fx: 'Monetary / FX',
  gold: 'Gold',
}

function fail(message) {
  throw new Error(message)
}

async function importFile(path) {
  return import(pathToFileURL(path).href)
}

async function loadOverviewModules() {
  const sourceTypesPath = join(repoRoot, 'apps', 'policy-ui', 'src', 'data', 'overview', 'artifact-types.ts')
  const sourceGuardPath = join(repoRoot, 'apps', 'policy-ui', 'src', 'data', 'overview', 'artifact-guard.ts')
  const compiledTypesPath = join(repoRoot, 'apps', 'policy-ui', '.test-dist', 'src', 'data', 'overview', 'artifact-types.js')
  const compiledGuardPath = join(repoRoot, 'apps', 'policy-ui', '.test-dist', 'src', 'data', 'overview', 'artifact-guard.js')

  const forceCompiledModules = process.env.OVERVIEW_EXPORTER_FORCE_COMPILED === '1'
  const moduleApi = forceCompiledModules ? {} : await import('node:module')
  if (typeof moduleApi.registerHooks === 'function') {
    moduleApi.registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier.endsWith('.js') && context.parentURL?.includes('/apps/policy-ui/src/')) {
          return nextResolve(specifier.replace(/\.js$/, '.ts'), context)
        }
        return nextResolve(specifier, context)
      },
    })

    return {
      types: await importFile(sourceTypesPath),
      guard: await importFile(sourceGuardPath),
    }
  }

  if (existsSync(compiledTypesPath) && existsSync(compiledGuardPath)) {
    return {
      types: await importFile(compiledTypesPath),
      guard: await importFile(compiledGuardPath),
    }
  }

  fail(
    'Overview exporter requires Node registerHooks support or compiled policy-ui test modules. Run npm test from apps/policy-ui before exporting with Node 20.',
  )
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--exported-at') {
      const value = argv[index + 1]
      if (!value) fail('Expected a value after --exported-at.')
      options.exportedAt = value
      index += 1
    } else {
      fail(`Unknown argument: ${arg}`)
    }
  }
  return options
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value, path) {
  if (!isRecord(value)) fail(`Expected ${path} to be an object.`)
  return value
}

function requireArray(value, path) {
  if (!Array.isArray(value)) fail(`Expected ${path} to be an array.`)
  return value
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`Expected ${path} to be a non-empty string.`)
  }
  return value
}

function requireNumber(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`Expected ${path} to be a finite number.`)
  }
  return value
}

function optionalNumber(value, path) {
  if (value === null) return null
  return requireNumber(value, path)
}

function requireStringArray(value, path) {
  const entries = requireArray(value, path)
  return entries.map((entry, index) => requireString(entry, `${path}[${index}]`))
}

function isIsoLike(value) {
  return Number.isFinite(Date.parse(value))
}

function requireIso(value, path) {
  const text = requireString(value, path)
  if (!isIsoLike(text)) fail(`Expected ${path} to be an ISO-like timestamp.`)
  return text
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function validateSourceMetric(rawMetric, index, definitionById) {
  const path = `metrics[${index}]`
  const metric = requireRecord(rawMetric, path)
  const id = requireString(metric.metric_id, `${path}.metric_id`)
  const definition = definitionById.get(id)
  if (!definition) fail(`${path}.metric_id is not in the locked Overview metric set: ${id}.`)

  const hasSourceUrl = typeof metric.source_url === 'string' && metric.source_url.trim().length > 0
  const hasSourceReference = typeof metric.source_reference === 'string' && metric.source_reference.trim().length > 0
  if (!hasSourceUrl && !hasSourceReference) {
    fail(`Expected ${path}.source_url or ${path}.source_reference to be present.`)
  }

  const hasObservedAt = typeof metric.observed_at === 'string' && metric.observed_at.trim().length > 0
  const hasExtractedAt = typeof metric.extracted_at === 'string' && metric.extracted_at.trim().length > 0
  if (!hasObservedAt && !hasExtractedAt) {
    fail(`Expected ${path}.observed_at or ${path}.extracted_at to be present.`)
  }
  if (hasObservedAt) requireIso(metric.observed_at, `${path}.observed_at`)
  if (hasExtractedAt) requireIso(metric.extracted_at, `${path}.extracted_at`)

  const claimType = requireString(metric.claim_type, `${path}.claim_type`)
  const unit = requireString(metric.unit, `${path}.unit`)
  const frequency = requireString(metric.frequency, `${path}.frequency`)
  if (claimType !== definition.claim_type) fail(`${path}.claim_type must be ${definition.claim_type}.`)
  if (unit !== definition.unit) fail(`${path}.unit must be ${definition.unit}.`)
  if (frequency !== definition.frequency) fail(`${path}.frequency must be ${definition.frequency}.`)

  const validationStatus = requireString(metric.validation_status, `${path}.validation_status`)
  if (!['valid', 'warning', 'failed'].includes(validationStatus)) {
    fail(`${path}.validation_status must be valid, warning, or failed.`)
  }
  if (validationStatus === 'failed') {
    fail(`${path}.validation_status is failed; refusing to export a failed Overview artifact.`)
  }

  return {
    id,
    label: definition.label,
    block: definition.block,
    claim_type: claimType,
    unit,
    frequency,
    value: requireNumber(metric.value, `${path}.value`),
    previous_value: optionalNumber(metric.previous_value, `${path}.previous_value`),
    source_label: requireString(metric.source_label, `${path}.source_label`),
    source_period: requireString(metric.source_period, `${path}.source_period`),
    validation_status: validationStatus,
    caveats: requireStringArray(metric.caveats, `${path}.caveats`),
    warnings: requireStringArray(metric.warnings, `${path}.warnings`),
  }
}

function validateSourceSnapshot(snapshot) {
  const source = requireRecord(snapshot, '$')
  requireString(source.source_snapshot_version, 'source_snapshot_version')
  const status = requireString(source.status, 'status')
  if (status !== PUBLIC_EXPORT_SOURCE_STATUS) {
    fail(
      `Source snapshot status is ${status}; refusing public Overview export until status is ${PUBLIC_EXPORT_SOURCE_STATUS}.`,
    )
  }
  requireString(source.snapshot_accepted_by, 'snapshot_accepted_by')
  requireIso(source.snapshot_accepted_at, 'snapshot_accepted_at')

  const definitionById = new Map(OVERVIEW_LOCKED_METRICS.map((definition) => [definition.id, definition]))
  const sourceMetrics = requireArray(source.metrics, 'metrics').map((metric, index) =>
    validateSourceMetric(metric, index, definitionById),
  )

  const seen = new Set()
  for (const metric of sourceMetrics) {
    if (seen.has(metric.id)) fail(`Duplicate source metric id ${metric.id}.`)
    seen.add(metric.id)
  }

  for (const definition of OVERVIEW_LOCKED_METRICS) {
    if (!seen.has(definition.id)) fail(`Missing locked metric id ${definition.id}.`)
  }

  const sourceOrder = sourceMetrics.map((metric) => metric.id).join('|')
  const lockOrder = OVERVIEW_LOCKED_METRICS.map((definition) => definition.id).join('|')
  if (sourceOrder !== lockOrder) {
    fail('Source snapshot metrics must be in OVERVIEW_LOCKED_METRICS order.')
  }

  const storedValueHash = requireString(source.value_hash, 'value_hash')
  const recomputedValueHash = computeOverviewValueHash(source)
  if (storedValueHash !== recomputedValueHash) {
    fail('Source snapshot value_hash does not match metric values/provenance; refusing public Overview export.')
  }

  const topCardOrder = OVERVIEW_LOCKED_METRICS
    .filter((definition) => OVERVIEW_TOP_CARD_METRIC_IDS.includes(definition.id))
    .map((definition) => definition.id)
    .join('|')
  if (topCardOrder !== OVERVIEW_TOP_CARD_METRIC_IDS.join('|')) {
    fail('OVERVIEW_TOP_CARD_METRIC_IDS must match the locked metric order subset.')
  }

  return sourceMetrics
}

function buildPanelGroups() {
  const groups = []
  for (const definition of OVERVIEW_LOCKED_METRICS) {
    let group = groups.find((entry) => entry.id === definition.block)
    if (!group) {
      group = {
        id: definition.block,
        title: PANEL_TITLES[definition.block],
        metric_ids: [],
      }
      groups.push(group)
    }
    group.metric_ids.push(definition.id)
  }
  return groups
}

function buildArtifact(sourceMetrics, exportedAt) {
  const topCardOrder = new Map(OVERVIEW_TOP_CARD_METRIC_IDS.map((id, index) => [id, index + 1]))
  const hasWarnings = sourceMetrics.some((metric) => metric.validation_status === 'warning' || metric.warnings.length > 0)
  const metrics = sourceMetrics.map((metric) => ({
    ...metric,
    exported_at: exportedAt,
    top_card: OVERVIEW_TOP_CARD_METRIC_IDS.includes(metric.id),
    top_card_order: topCardOrder.get(metric.id),
  }))

  return {
    schema_version: OVERVIEW_ARTIFACT_SCHEMA_VERSION,
    exported_at: exportedAt,
    generated_by: generatedBy,
    validation_status: hasWarnings ? 'warning' : 'valid',
    metrics,
    caveats: [
      'Source snapshot is manually accepted and exported without live crawling.',
    ],
    warnings: hasWarnings
      ? ['Provisional source metrics are present; top-level validation remains warning until TO CONFIRM sources are resolved.']
      : [],
    panel_groups: buildPanelGroups(),
  }
}

async function main() {
  const modules = await loadOverviewModules()
  OVERVIEW_ARTIFACT_SCHEMA_VERSION = modules.types.OVERVIEW_ARTIFACT_SCHEMA_VERSION
  OVERVIEW_LOCKED_METRICS = modules.types.OVERVIEW_LOCKED_METRICS
  OVERVIEW_TOP_CARD_METRIC_IDS = modules.types.OVERVIEW_TOP_CARD_METRIC_IDS
  validateOverviewArtifact = modules.guard.validateOverviewArtifact

  const args = parseArgs(process.argv.slice(2))
  const sourcePath = resolve(process.env.OVERVIEW_SOURCE_SNAPSHOT_PATH ?? defaultSourcePath)
  const outputPath = resolve(process.env.OVERVIEW_OUTPUT_PATH ?? defaultOutputPath)
  const exportedAt = args.exportedAt ?? process.env.OVERVIEW_EXPORTED_AT ?? new Date().toISOString()
  if (!isIsoLike(exportedAt)) fail('Expected exported_at to be an ISO-like timestamp.')

  const sourceMetrics = validateSourceSnapshot(readJson(sourcePath))
  const artifact = buildArtifact(sourceMetrics, exportedAt)
  const validation = validateOverviewArtifact(artifact)
  if (!validation.ok) {
    const details = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')
    fail(`Generated Overview artifact failed UI guard validation:\n${details}`)
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
