import type {
  CgeBenchmark,
  CgeBridgePayload,
  CgeControlDefinition,
  CgeControlId,
  CgePreset,
  CgeResults,
} from './cge-types.js'

export type CgeValidationIssue = { path: string; message: string; severity: 'error' }
export type CgeValidationResult = {
  ok: boolean
  value: CgeBridgePayload | null
  issues: CgeValidationIssue[]
}

const CONTROL_IDS: CgeControlId[] = [
  'world_import_price_change_pct',
  'import_tariff_change_pp',
  'government_consumption_change_pct',
  'remittances_change_pct',
]
const RESULT_KEYS = [
  'Er', 'Pe', 'Pm', 'Pd', 'E', 'M', 'Ds', 'Dd', 'Q', 'Qs', 'Qd', 'X',
  'Pq', 'Pt', 'Px', 'TAX', 'Y', 'Sg', 'Cn', 'S', 'Z', 'TB',
] as const
const FORBIDDEN_KEYS = new Set([
  'gdp', 'gdp_growth', 'sectors', 'sector_results', 'labor', 'employment',
  'households', 'distribution', 'uzs_usd', 'nominal_exchange_rate',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function add(issues: CgeValidationIssue[], path: string, message: string) {
  issues.push({ path, message, severity: 'error' })
}

function scanForbiddenKeys(value: unknown, issues: CgeValidationIssue[], path = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenKeys(entry, issues, `${path}[${index}]`))
    return
  }
  if (!isRecord(value)) return
  Object.entries(value).forEach(([key, entry]) => {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) add(issues, `${path}.${key}`, 'Field is outside the public CGE boundary.')
    scanForbiddenKeys(entry, issues, `${path}.${key}`)
  })
}

function validResults(value: unknown, issues: CgeValidationIssue[], path: string): value is CgeResults {
  if (!isRecord(value)) {
    add(issues, path, 'Expected a result object.')
    return false
  }
  let ok = true
  RESULT_KEYS.forEach((key) => {
    if (!finite(value[key])) {
      add(issues, `${path}.${key}`, 'Expected a finite number.')
      ok = false
    }
  })
  return ok
}

function validControls(value: unknown, issues: CgeValidationIssue[]): value is CgeControlDefinition[] {
  if (!Array.isArray(value) || value.length !== CONTROL_IDS.length) {
    add(issues, 'controls', `Expected ${CONTROL_IDS.length} bounded controls.`)
    return false
  }
  const ids = new Set<string>()
  let ok = true
  value.forEach((entry, index) => {
    const path = `controls[${index}]`
    if (!isRecord(entry)) {
      add(issues, path, 'Expected an object.')
      ok = false
      return
    }
    if (!CONTROL_IDS.includes(entry.id as CgeControlId) || ids.has(entry.id as string)) {
      add(issues, `${path}.id`, 'Expected a unique approved control id.')
      ok = false
    }
    ids.add(entry.id as string)
    if (!finite(entry.min) || !finite(entry.max) || !finite(entry.step) || !finite(entry.default)) {
      add(issues, path, 'Control bounds must be finite numbers.')
      ok = false
    } else if (!(entry.min <= entry.default && entry.default <= entry.max && entry.step > 0)) {
      add(issues, path, 'Control default and step must respect bounds.')
      ok = false
    }
  })
  return ok
}

function validPresets(value: unknown, issues: CgeValidationIssue[]): value is CgePreset[] {
  if (!Array.isArray(value) || value.length < 3) {
    add(issues, 'presets', 'Expected at least three bounded presets.')
    return false
  }
  let ok = true
  value.forEach((entry, index) => {
    const path = `presets[${index}]`
    if (!isRecord(entry) || typeof entry.preset_id !== 'string') {
      add(issues, path, 'Expected a preset with controls.')
      ok = false
      return
    }
    const presetControls = entry.controls
    if (!isRecord(presetControls)) {
      add(issues, `${path}.controls`, 'Expected a control object.')
      ok = false
      return
    }
    CONTROL_IDS.forEach((id) => {
      if (!finite(presetControls[id])) {
        add(issues, `${path}.controls.${id}`, 'Expected a finite control value.')
        ok = false
      }
    })
  })
  return ok
}

function validBenchmarks(value: unknown, issues: CgeValidationIssue[]): value is CgeBenchmark[] {
  if (!Array.isArray(value) || value.length < 2) {
    add(issues, 'benchmarks', 'Expected two exact workbook benchmarks.')
    return false
  }
  let ok = true
  value.forEach((entry, index) => {
    const path = `benchmarks[${index}]`
    if (!isRecord(entry) || entry.status !== 'exact_workbook_match') {
      add(issues, `${path}.status`, 'Benchmark must be an exact workbook match.')
      ok = false
      return
    }
    if (!finite(entry.max_abs_error) || !finite(entry.tolerance) || entry.max_abs_error > entry.tolerance) {
      add(issues, path, 'Benchmark error exceeds tolerance.')
      ok = false
    }
  })
  return ok
}

export function validateCgeBridgePayload(input: unknown): CgeValidationResult {
  const issues: CgeValidationIssue[] = []
  if (!isRecord(input)) return { ok: false, value: null, issues: [{ path: '$', message: 'Expected CGE object.', severity: 'error' }] }
  scanForbiddenKeys(input, issues)
  if (input.schema_version !== 'cge-reference-v1') add(issues, 'schema_version', 'Unsupported CGE schema.')
  if (!isRecord(input.metadata) || input.metadata.status !== 'experimental_reference') add(issues, 'metadata.status', 'Expected experimental_reference.')
  if (!isRecord(input.metadata) || input.metadata.approval_status !== 'not_model_owner_approved') add(issues, 'metadata.approval_status', 'Approval boundary is missing.')
  if (!isRecord(input.calibration)) add(issues, 'calibration', 'Expected calibration object.')
  else {
    validResults(input.calibration.base_results, issues, 'calibration.base_results')
    if (!isRecord(input.calibration.diagnostics) || input.calibration.diagnostics.status !== 'formula_reconciled') add(issues, 'calibration.diagnostics.status', 'Expected formula-reconciled calibration.')
  }
  validControls(input.controls, issues)
  validPresets(input.presets, issues)
  validBenchmarks(input.benchmarks, issues)
  if (!Array.isArray(input.excluded_sources) || input.excluded_sources.length < 1) add(issues, 'excluded_sources', 'Expected excluded source audit records.')
  if (!Array.isArray(input.caveats) || input.caveats.length < 3) add(issues, 'caveats', 'Expected public-use caveats.')
  return { ok: issues.length === 0, value: issues.length === 0 ? input as unknown as CgeBridgePayload : null, issues }
}
