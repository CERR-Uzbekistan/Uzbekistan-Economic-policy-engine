import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const SOURCE_WORKBOOK = 'model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx'
const PUBLIC_DFM_JSON = 'apps/policy-ui/public/data/dfm.json'
const SOURCE_REFIT_JSON = 'docs/data-bridge/dfm-source-refit-summary.json'
const SOURCE_COVERAGE_JSON = 'docs/data-bridge/dfm-source-coverage.json'
const VALIDATION_JSON = 'docs/data-bridge/dfm-validation-summary.json'
const REPORT_JSON = 'docs/data-bridge/dfm-canonical-export-report.json'
const REPORT_MD = 'docs/data-bridge/dfm-canonical-export-report.md'

const args = new Set(process.argv.slice(2))
const allowMissingSource = args.has('--allow-missing-source')
const skipSourceRefit = args.has('--skip-source-refit')

function utcNow() {
  return new Date().toISOString()
}

function findRscript() {
  if (process.env.RSCRIPT) return process.env.RSCRIPT
  if (process.platform === 'win32') {
    const common = 'C:\\Program Files\\R\\R-4.5.2\\bin\\Rscript.exe'
    if (existsSync(common)) return common
  }
  return 'Rscript'
}

function run(label, command, commandArgs, options = {}) {
  console.log(`[dfm:canonical] ${label}`)
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`)
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function round(value, digits = 4) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Number(value.toFixed(digits))
}

function buildReconciliation(sourceRefit, publicArtifact, sourceSkipReason) {
  if (!sourceRefit) {
    const skippedByFlag = sourceSkipReason === 'skip_flag'
    return {
      status: skippedByFlag ? 'skipped_source_refit_by_flag' : 'skipped_source_not_available',
      message:
        skippedByFlag
          ? 'Public DFM artifact was regenerated from the checked-in bridge because source refit was explicitly skipped.'
          : 'Public DFM artifact was regenerated from the checked-in bridge because the local source workbook was not available.',
    }
  }

  const publicCurrent = publicArtifact.nowcast?.current_quarter
  const sourceCurrent = sourceRefit.current_nowcast
  const sourceYoy = round(sourceCurrent?.source_gdp_growth_yoy_pct)
  const sourceQoq = round(sourceCurrent?.source_gdp_growth_qoq_pct)
  const publicYoy = round(publicCurrent?.gdp_growth_yoy_pct)
  const publicQoq = round(publicCurrent?.gdp_growth_qoq_pct)
  const periodMatches = sourceCurrent?.source_period === publicCurrent?.period
  const yoyDiff = sourceYoy === null || publicYoy === null ? null : round(sourceYoy - publicYoy)
  const qoqDiff = sourceQoq === null || publicQoq === null ? null : round(sourceQoq - publicQoq)
  const matched = periodMatches && Math.abs(yoyDiff ?? Number.POSITIVE_INFINITY) <= 0.0001

  return {
    status: matched ? 'matched_public_artifact' : 'mismatch_requires_review',
    period_matches: periodMatches,
    source_period: sourceCurrent?.source_period ?? null,
    public_period: publicCurrent?.period ?? null,
    source_gdp_growth_yoy_pct: sourceYoy,
    public_gdp_growth_yoy_pct: publicYoy,
    source_minus_public_yoy_pp: yoyDiff,
    source_gdp_growth_qoq_pct: sourceQoq,
    public_gdp_growth_qoq_pct: publicQoq,
    source_minus_public_qoq_pp: qoqDiff,
    message: matched
      ? 'The local source refit reproduces the public bridge nowcast, so the public artifact is source-reconciled.'
      : 'The local source refit differs from the public bridge. Do not publish a direct source-refit artifact without model-owner reconciliation.',
  }
}

function writeReport(report) {
  mkdirSync(dirname(REPORT_JSON), { recursive: true })
  writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`)
  const lines = [
    '# DFM canonical export report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `- Source workbook status: ${report.source_workbook_status}`,
    `- Source coverage status: ${report.source_coverage.status}`,
    `- Source refit status: ${report.source_refit.status}`,
    `- Public export status: ${report.public_export.status}`,
    `- Validation status: ${report.validation.status}`,
    `- Reconciliation status: ${report.reconciliation.status}`,
    '',
    '## Reconciliation',
    '',
    report.reconciliation.message,
    '',
    '## Source coverage',
    '',
    report.source_coverage.skipped
      ? 'Source coverage was skipped because the source workbook was unavailable or the source refit was skipped.'
      : report.source_coverage.publish_gate,
    '',
    `- Target quarter: ${report.source_coverage.target_quarter ?? 'n/a'}`,
    `- Required monthly data through: ${report.source_coverage.required_monthly_data_through ?? 'n/a'}`,
    `- Previous-quarter GDP ready: ${report.source_coverage.previous_gdp_ready ?? 'n/a'}`,
    `- Monthly indicators ready: ${report.source_coverage.monthly_ready_count ?? 'n/a'} / ${report.source_coverage.monthly_total_count ?? 'n/a'}`,
    '',
    '| Field | Source refit | Public artifact | Difference |',
    '|---|---:|---:|---:|',
    `| GDP YoY | ${report.reconciliation.source_gdp_growth_yoy_pct ?? 'n/a'} | ${report.reconciliation.public_gdp_growth_yoy_pct ?? 'n/a'} | ${report.reconciliation.source_minus_public_yoy_pp ?? 'n/a'} |`,
    `| GDP QoQ | ${report.reconciliation.source_gdp_growth_qoq_pct ?? 'n/a'} | ${report.reconciliation.public_gdp_growth_qoq_pct ?? 'n/a'} | ${report.reconciliation.source_minus_public_qoq_pp ?? 'n/a'} |`,
    '',
    '## Notes',
    '',
    '- The raw source workbook remains outside source control.',
    '- When the source workbook is unavailable, CI can regenerate the bridge artifact but cannot prove source-refit reconciliation.',
    '- Direct publication from the source refit still requires a reviewed source-output contract and model-owner sign-off.',
    '',
  ]
  writeFileSync(REPORT_MD, lines.join('\n'))
}

const sourceAvailable = existsSync(resolve(SOURCE_WORKBOOK))
if (!sourceAvailable && !allowMissingSource) {
  throw new Error(
    `DFM source workbook not found: ${SOURCE_WORKBOOK}. Use --allow-missing-source only for bridge-only CI regeneration.`,
  )
}

const rscript = findRscript()
let sourceRefit = null
let sourceRefitStatus = 'skipped_source_not_available'
let sourceCoverage = null
let sourceCoverageStatus = 'skipped_source_not_available'

if (sourceAvailable && !skipSourceRefit) {
  run('refresh transformation map', 'node', ['scripts/dfm/extract-source-map.mjs'])
  run('audit source coverage', rscript, ['scripts/dfm/audit-source-coverage.R', process.cwd()])
  sourceCoverage = readJson(SOURCE_COVERAGE_JSON)
  sourceCoverageStatus = sourceCoverage?.readiness?.status ?? 'unknown'
  run('run source refit', rscript, ['scripts/dfm/run-source-refit.R'])
  sourceRefit = readJson(SOURCE_REFIT_JSON)
  sourceRefitStatus = sourceRefit?.artifact?.status ?? 'unknown'
} else if (sourceAvailable && skipSourceRefit) {
  sourceRefitStatus = 'skipped_by_flag'
  sourceCoverageStatus = 'skipped_by_flag'
}

run('export public DFM artifact', rscript, ['scripts/export_dfm.R'])
run('validate bridge history', 'node', ['scripts/dfm/validate-bridge-history.mjs'])

const publicArtifact = readJson(PUBLIC_DFM_JSON)
const validation = readJson(VALIDATION_JSON)
const reconciliation = buildReconciliation(
  sourceRefit,
  publicArtifact,
  skipSourceRefit ? 'skip_flag' : 'source_missing',
)

const report = {
  artifact: {
    id: 'dfm-canonical-export-report',
    generated_at: utcNow(),
  },
  generated_at: utcNow(),
  command: 'node scripts/dfm/export-canonical.mjs',
  source_workbook: SOURCE_WORKBOOK,
  source_workbook_status: sourceAvailable ? 'available_locally_untracked' : 'not_available',
  source_refit: {
    status: sourceRefitStatus,
    artifact: sourceAvailable && !skipSourceRefit ? SOURCE_REFIT_JSON : null,
    skipped: !sourceAvailable || skipSourceRefit,
  },
  source_coverage: {
    status: sourceCoverageStatus,
    artifact: sourceAvailable && !skipSourceRefit ? SOURCE_COVERAGE_JSON : null,
    target_quarter: sourceCoverage?.artifact?.target_quarter ?? null,
    required_monthly_data_through: sourceCoverage?.readiness?.required_monthly_data_through ?? null,
    monthly_ready_count: sourceCoverage?.readiness?.monthly_ready_count ?? null,
    monthly_total_count: sourceCoverage?.readiness?.monthly_total_count ?? null,
    previous_gdp_ready: sourceCoverage?.readiness?.previous_gdp_ready ?? null,
    publish_gate: sourceCoverage?.readiness?.publish_gate ?? null,
    skipped: !sourceAvailable || skipSourceRefit,
  },
  public_export: {
    status: 'completed',
    artifact: PUBLIC_DFM_JSON,
    export_mode: publicArtifact.metadata?.export_mode ?? 'unknown',
  },
  validation: {
    status: validation.artifact?.id === 'dfm-validation-summary' ? 'completed' : 'unknown',
    artifact: VALIDATION_JSON,
    vintage_backtest_status: validation.artifact?.vintage_backtest_status ?? null,
  },
  reconciliation,
}

writeReport(report)
console.log(`[dfm:canonical] wrote ${REPORT_JSON}`)
console.log(`[dfm:canonical] wrote ${REPORT_MD}`)

if (reconciliation.status === 'mismatch_requires_review') {
  process.exitCode = 1
}
