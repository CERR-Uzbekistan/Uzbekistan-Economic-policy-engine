import type { ModelAttribution } from '../../contracts/data-contract.js'
import type {
  DfmBridgePayload,
  DfmCaveat,
  DfmFactorBlock,
  DfmIndicator,
  DfmIndicatorFrequency,
  DfmMetadata,
  DfmNowcast,
  DfmNowcastQuarter,
  DfmPointUncertainty,
  DfmQuarterHistory,
  DfmUncertaintyBand,
} from './dfm-types.js'

type ValidationSeverity = 'error'

export type DfmValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type DfmValidationResult = {
  ok: boolean
  value: DfmBridgePayload | null
  issues: DfmValidationIssue[]
}

// Vintage tag like "2026Q1"; rejects ISO timestamps and plain dates.
const DATA_VERSION_RE = /^\d{4}Q[1-4]$/
const PERIOD_RE = /^\d{4}Q[1-4]$/
const YOY_MIN = -20
const YOY_MAX = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFrequency(value: unknown): value is DfmIndicatorFrequency {
  return value === 'monthly' || value === 'quarterly'
}

function pushError(issues: DfmValidationIssue[], path: string, message: string) {
  issues.push({ path, message, severity: 'error' })
}

function parseStringArray(
  value: unknown,
  issues: DfmValidationIssue[],
  path: string,
): string[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of strings.')
    return null
  }
  const output: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (typeof entry !== 'string') {
      pushError(issues, `${path}[${index}]`, 'Expected a string.')
      continue
    }
    output.push(entry)
  }
  return output
}

function parseNumberArray(
  value: unknown,
  issues: DfmValidationIssue[],
  path: string,
): number[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of finite numbers.')
    return null
  }
  const output: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isFiniteNumber(entry)) {
      pushError(issues, `${path}[${index}]`, 'Expected a finite number.')
      continue
    }
    output.push(entry)
  }
  return output
}

function parseAttribution(value: unknown, issues: DfmValidationIssue[]): ModelAttribution | null {
  if (!isRecord(value)) {
    pushError(issues, 'attribution', 'Expected an object.')
    return null
  }
  const requiredFields: Array<keyof ModelAttribution> = [
    'model_id',
    'model_name',
    'module',
    'version',
    'run_id',
    'data_version',
    'timestamp',
  ]
  const output = {} as ModelAttribution
  let ok = true
  for (const field of requiredFields) {
    const raw = value[field]
    if (typeof raw !== 'string' || raw.length === 0) {
      pushError(issues, `attribution.${field}`, 'Expected a non-empty string.')
      ok = false
      continue
    }
    output[field] = raw
  }
  // data_version is a vintage tag ("2026Q1"), not an ISO timestamp. Reject
  // ISO-looking strings explicitly so a wrong pipeline wiring fails loudly.
  const dataVersion = value.data_version
  if (typeof dataVersion === 'string' && !DATA_VERSION_RE.test(dataVersion)) {
    pushError(
      issues,
      'attribution.data_version',
      'Expected vintage tag like "2026Q1"; received a non-vintage string (likely an ISO timestamp).',
    )
    ok = false
  }
  return ok ? output : null
}

function parseUncertaintyBand(
  value: unknown,
  index: number,
  issues: DfmValidationIssue[],
  basePath: string,
): DfmUncertaintyBand | null {
  const path = `${basePath}[${index}]`
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const confidenceLevel = value.confidence_level
  const lowerPct = value.lower_pct
  const upperPct = value.upper_pct

  let ok = true
  if (!isFiniteNumber(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1) {
    pushError(
      issues,
      `${path}.confidence_level`,
      'Expected a finite number strictly between 0 and 1.',
    )
    ok = false
  }
  if (!isFiniteNumber(lowerPct)) {
    pushError(issues, `${path}.lower_pct`, 'Expected a finite number.')
    ok = false
  }
  if (!isFiniteNumber(upperPct)) {
    pushError(issues, `${path}.upper_pct`, 'Expected a finite number.')
    ok = false
  }
  if (isFiniteNumber(lowerPct) && isFiniteNumber(upperPct) && lowerPct > upperPct) {
    pushError(
      issues,
      path,
      `Band must satisfy lower_pct <= upper_pct (got ${lowerPct} > ${upperPct}).`,
    )
    ok = false
  }
  if (!ok) return null
  return {
    confidence_level: confidenceLevel as number,
    lower_pct: lowerPct as number,
    upper_pct: upperPct as number,
  }
}

function parseUncertainty(
  value: unknown,
  issues: DfmValidationIssue[],
  basePath: string,
): DfmPointUncertainty | null {
  if (!isRecord(value)) {
    pushError(issues, basePath, 'Expected an object.')
    return null
  }
  const methodologyLabel = value.methodology_label
  const isIllustrative = value.is_illustrative
  const rawBands = value.bands

  let ok = true
  if (typeof methodologyLabel !== 'string' || methodologyLabel.length === 0) {
    pushError(issues, `${basePath}.methodology_label`, 'Expected a non-empty string.')
    ok = false
  }
  if (typeof isIllustrative !== 'boolean') {
    pushError(issues, `${basePath}.is_illustrative`, 'Expected a boolean.')
    ok = false
  }
  if (!Array.isArray(rawBands)) {
    pushError(issues, `${basePath}.bands`, 'Expected an array.')
    return null
  }
  if (rawBands.length === 0) {
    pushError(issues, `${basePath}.bands`, 'Expected at least one band entry.')
    ok = false
  }
  const bands: DfmUncertaintyBand[] = []
  for (let index = 0; index < rawBands.length; index += 1) {
    const band = parseUncertaintyBand(rawBands[index], index, issues, `${basePath}.bands`)
    if (band) bands.push(band)
    else ok = false
  }
  if (!ok) return null
  return {
    methodology_label: methodologyLabel as string,
    is_illustrative: isIllustrative as boolean,
    bands,
  }
}

function parseQuarterCore(
  value: Record<string, unknown>,
  issues: DfmValidationIssue[],
  basePath: string,
  yoyRequired: boolean,
): {
  ok: boolean
  period: string | null
  quarterStartDate: string | null
  yoy: number | null
  qoq: number | null
  levelIdx: number | null
} {
  const period = value.period
  const quarterStartDate = value.quarter_start_date
  const yoy = value.gdp_growth_yoy_pct
  const qoq = value.gdp_growth_qoq_pct
  const levelIdx = value.gdp_level_idx

  let ok = true
  if (typeof period !== 'string' || !PERIOD_RE.test(period)) {
    pushError(issues, `${basePath}.period`, 'Expected period like "YYYYQN" (e.g. "2026Q1").')
    ok = false
  }
  if (typeof quarterStartDate !== 'string' || quarterStartDate.length === 0) {
    pushError(issues, `${basePath}.quarter_start_date`, 'Expected a non-empty string.')
    ok = false
  }

  if (yoyRequired) {
    if (!isFiniteNumber(yoy)) {
      pushError(issues, `${basePath}.gdp_growth_yoy_pct`, 'Expected a finite number.')
      ok = false
    } else if (yoy < YOY_MIN || yoy > YOY_MAX) {
      pushError(
        issues,
        `${basePath}.gdp_growth_yoy_pct`,
        `Expected YoY % within [${YOY_MIN}, ${YOY_MAX}] (received ${yoy}).`,
      )
      ok = false
    }
  } else if (yoy !== null && !isFiniteNumber(yoy)) {
    pushError(issues, `${basePath}.gdp_growth_yoy_pct`, 'Expected a finite number or null.')
    ok = false
  } else if (isFiniteNumber(yoy) && (yoy < YOY_MIN || yoy > YOY_MAX)) {
    pushError(
      issues,
      `${basePath}.gdp_growth_yoy_pct`,
      `Expected YoY % within [${YOY_MIN}, ${YOY_MAX}] (received ${yoy}).`,
    )
    ok = false
  }

  if (qoq !== null && !isFiniteNumber(qoq)) {
    pushError(issues, `${basePath}.gdp_growth_qoq_pct`, 'Expected a finite number or null.')
    ok = false
  }
  if (levelIdx !== null && !isFiniteNumber(levelIdx)) {
    pushError(issues, `${basePath}.gdp_level_idx`, 'Expected a finite number or null.')
    ok = false
  }

  return {
    ok,
    period: typeof period === 'string' ? period : null,
    quarterStartDate: typeof quarterStartDate === 'string' ? quarterStartDate : null,
    yoy: isFiniteNumber(yoy) ? yoy : null,
    qoq: isFiniteNumber(qoq) ? qoq : null,
    levelIdx: isFiniteNumber(levelIdx) ? levelIdx : null,
  }
}

function parseNowcastQuarter(
  value: unknown,
  issues: DfmValidationIssue[],
  basePath: string,
): DfmNowcastQuarter | null {
  if (!isRecord(value)) {
    pushError(issues, basePath, 'Expected an object.')
    return null
  }
  const core = parseQuarterCore(value, issues, basePath, true)
  const horizonQuarters = value.horizon_quarters
  let ok = core.ok
  if (!Number.isInteger(horizonQuarters) || (horizonQuarters as number) <= 0) {
    pushError(issues, `${basePath}.horizon_quarters`, 'Expected a positive integer.')
    ok = false
  }
  const uncertainty = parseUncertainty(value.uncertainty, issues, `${basePath}.uncertainty`)
  if (!uncertainty) ok = false

  if (!ok || !core.period || !core.quarterStartDate || !uncertainty) return null
  return {
    period: core.period,
    quarter_start_date: core.quarterStartDate,
    gdp_growth_yoy_pct: core.yoy,
    gdp_growth_qoq_pct: core.qoq,
    gdp_level_idx: core.levelIdx,
    horizon_quarters: horizonQuarters as number,
    uncertainty,
  }
}

function parseHistoryEntry(
  value: unknown,
  index: number,
  issues: DfmValidationIssue[],
): DfmQuarterHistory | null {
  const basePath = `nowcast.history[${index}]`
  if (!isRecord(value)) {
    pushError(issues, basePath, 'Expected an object.')
    return null
  }
  const core = parseQuarterCore(value, issues, basePath, false)
  if (!core.ok || !core.period || !core.quarterStartDate) return null
  return {
    period: core.period,
    quarter_start_date: core.quarterStartDate,
    gdp_growth_yoy_pct: core.yoy,
    gdp_growth_qoq_pct: core.qoq,
    gdp_level_idx: core.levelIdx,
  }
}

function parseNowcast(value: unknown, issues: DfmValidationIssue[]): DfmNowcast | null {
  if (!isRecord(value)) {
    pushError(issues, 'nowcast', 'Expected an object.')
    return null
  }
  const lastObservedDate = value.last_observed_date
  let ok = true
  if (typeof lastObservedDate !== 'string' || lastObservedDate.length === 0) {
    pushError(issues, 'nowcast.last_observed_date', 'Expected a non-empty string.')
    ok = false
  }

  const currentQuarter = parseNowcastQuarter(
    value.current_quarter,
    issues,
    'nowcast.current_quarter',
  )
  if (!currentQuarter) ok = false

  const rawForecast = value.forecast_horizon
  const forecastHorizon: DfmNowcastQuarter[] = []
  if (!Array.isArray(rawForecast)) {
    pushError(issues, 'nowcast.forecast_horizon', 'Expected an array.')
    ok = false
  } else {
    for (let index = 0; index < rawForecast.length; index += 1) {
      const q = parseNowcastQuarter(
        rawForecast[index],
        issues,
        `nowcast.forecast_horizon[${index}]`,
      )
      if (q) forecastHorizon.push(q)
      else ok = false
    }
  }

  const rawHistory = value.history
  const history: DfmQuarterHistory[] = []
  if (!Array.isArray(rawHistory)) {
    pushError(issues, 'nowcast.history', 'Expected an array.')
    ok = false
  } else if (rawHistory.length === 0) {
    pushError(issues, 'nowcast.history', 'Expected at least one history entry.')
    ok = false
  } else {
    for (let index = 0; index < rawHistory.length; index += 1) {
      const h = parseHistoryEntry(rawHistory[index], index, issues)
      if (h) history.push(h)
      else ok = false
    }
  }

  if (!ok || !currentQuarter) return null
  return {
    last_observed_date: lastObservedDate as string,
    current_quarter: currentQuarter,
    forecast_horizon: forecastHorizon,
    history,
  }
}

function parseFactor(value: unknown, issues: DfmValidationIssue[]): DfmFactorBlock | null {
  if (!isRecord(value)) {
    pushError(issues, 'factor', 'Expected an object.')
    return null
  }
  const nFactors = value.n_factors
  const dates = parseStringArray(value.dates, issues, 'factor.dates')
  const path = parseNumberArray(value.path, issues, 'factor.path')
  const converged = value.converged
  const nIter = value.n_iter
  const loglik = value.loglik
  const lastDataDate = value.last_data_date
  const monthlySeriesStart = value.monthly_series_start

  let ok = true
  if (!Number.isInteger(nFactors) || (nFactors as number) <= 0) {
    pushError(issues, 'factor.n_factors', 'Expected a positive integer.')
    ok = false
  }
  if (typeof converged !== 'boolean') {
    pushError(issues, 'factor.converged', 'Expected a boolean.')
    ok = false
  }
  if (!Number.isInteger(nIter) || (nIter as number) < 0) {
    pushError(issues, 'factor.n_iter', 'Expected a non-negative integer.')
    ok = false
  }
  if (!isFiniteNumber(loglik)) {
    pushError(issues, 'factor.loglik', 'Expected a finite number.')
    ok = false
  }
  if (typeof lastDataDate !== 'string' || lastDataDate.length === 0) {
    pushError(issues, 'factor.last_data_date', 'Expected a non-empty string.')
    ok = false
  }
  if (typeof monthlySeriesStart !== 'string' || monthlySeriesStart.length === 0) {
    pushError(issues, 'factor.monthly_series_start', 'Expected a non-empty string.')
    ok = false
  }
  if (!dates || !path) ok = false
  else if (dates.length !== path.length) {
    pushError(
      issues,
      'factor',
      `factor.dates and factor.path must have equal length (got ${dates.length} vs ${path.length}).`,
    )
    ok = false
  }

  if (!ok || !dates || !path) return null
  return {
    n_factors: nFactors as number,
    dates,
    path,
    converged: converged as boolean,
    n_iter: nIter as number,
    loglik: loglik as number,
    last_data_date: lastDataDate as string,
    monthly_series_start: monthlySeriesStart as string,
  }
}

function parseIndicator(
  value: unknown,
  index: number,
  issues: DfmValidationIssue[],
): DfmIndicator | null {
  const basePath = `indicators[${index}]`
  if (!isRecord(value)) {
    pushError(issues, basePath, 'Expected an object.')
    return null
  }
  const indicatorId = value.indicator_id
  const label = value.label
  const category = value.category
  const frequency = value.frequency
  const loading = value.loading
  const contribution = value.contribution
  const latestValue = value.latest_value

  let ok = true
  if (typeof indicatorId !== 'string' || indicatorId.length === 0) {
    pushError(issues, `${basePath}.indicator_id`, 'Expected a non-empty string.')
    ok = false
  }
  if (typeof label !== 'string' || label.length === 0) {
    pushError(issues, `${basePath}.label`, 'Expected a non-empty string.')
    ok = false
  }
  if (typeof category !== 'string' || category.length === 0) {
    pushError(issues, `${basePath}.category`, 'Expected a non-empty string.')
    ok = false
  }
  if (!isFrequency(frequency)) {
    pushError(issues, `${basePath}.frequency`, 'Expected "monthly" or "quarterly".')
    ok = false
  }
  if (!isFiniteNumber(loading)) {
    pushError(issues, `${basePath}.loading`, 'Expected a finite number.')
    ok = false
  }
  if (!isFiniteNumber(contribution)) {
    pushError(issues, `${basePath}.contribution`, 'Expected a finite number.')
    ok = false
  }
  if (latestValue !== null && !isFiniteNumber(latestValue)) {
    pushError(issues, `${basePath}.latest_value`, 'Expected a finite number or null.')
    ok = false
  }

  if (!ok) return null
  return {
    indicator_id: indicatorId as string,
    label: label as string,
    category: category as string,
    frequency: frequency as DfmIndicatorFrequency,
    loading: loading as number,
    contribution: contribution as number,
    latest_value: isFiniteNumber(latestValue) ? latestValue : null,
  }
}

function parseCaveat(
  value: unknown,
  index: number,
  issues: DfmValidationIssue[],
): DfmCaveat | null {
  const basePath = `caveats[${index}]`
  if (!isRecord(value)) {
    pushError(issues, basePath, 'Expected an object.')
    return null
  }
  const caveatId = value.caveat_id
  const severity = value.severity
  const message = value.message
  const affectedMetrics = parseStringArray(
    value.affected_metrics,
    issues,
    `${basePath}.affected_metrics`,
  )
  const affectedModels = parseStringArray(
    value.affected_models,
    issues,
    `${basePath}.affected_models`,
  )
  const source = value.source

  let ok = true
  if (typeof caveatId !== 'string' || caveatId.length === 0) {
    pushError(issues, `${basePath}.caveat_id`, 'Expected a non-empty string.')
    ok = false
  }
  if (!(severity === 'info' || severity === 'warning' || severity === 'critical')) {
    pushError(issues, `${basePath}.severity`, 'Expected one of info|warning|critical.')
    ok = false
  }
  if (typeof message !== 'string' || message.length === 0) {
    pushError(issues, `${basePath}.message`, 'Expected a non-empty string.')
    ok = false
  }
  if (source !== undefined && typeof source !== 'string') {
    pushError(issues, `${basePath}.source`, 'Expected a string when present.')
    ok = false
  }
  if (!affectedMetrics || !affectedModels) ok = false

  if (!ok || !affectedMetrics || !affectedModels) return null
  const out: DfmCaveat = {
    caveat_id: caveatId as string,
    severity: severity as DfmCaveat['severity'],
    message: message as string,
    affected_metrics: affectedMetrics,
    affected_models: affectedModels,
  }
  if (typeof source === 'string') out.source = source
  return out
}

function parseMetadata(value: unknown, issues: DfmValidationIssue[]): DfmMetadata | null {
  if (!isRecord(value)) {
    pushError(issues, 'metadata', 'Expected an object.')
    return null
  }
  const exportedAt = value.exported_at
  const sourceScriptSha = value.source_script_sha
  const solverVersion = value.solver_version
  const sourceArtifact = value.source_artifact
  const sourceArtifactExportedAt = value.source_artifact_exported_at

  let ok = true
  if (typeof exportedAt !== 'string' || exportedAt.length === 0) {
    pushError(issues, 'metadata.exported_at', 'Expected a non-empty string.')
    ok = false
  }
  if (!(sourceScriptSha === null || typeof sourceScriptSha === 'string')) {
    pushError(issues, 'metadata.source_script_sha', 'Expected a string or null.')
    ok = false
  }
  if (typeof solverVersion !== 'string' || solverVersion.length === 0) {
    pushError(issues, 'metadata.solver_version', 'Expected a non-empty string.')
    ok = false
  }
  if (typeof sourceArtifact !== 'string' || sourceArtifact.length === 0) {
    pushError(issues, 'metadata.source_artifact', 'Expected a non-empty string.')
    ok = false
  }
  if (typeof sourceArtifactExportedAt !== 'string' || sourceArtifactExportedAt.length === 0) {
    pushError(
      issues,
      'metadata.source_artifact_exported_at',
      'Expected a non-empty string.',
    )
    ok = false
  }
  if (!ok) return null
  return {
    exported_at: exportedAt as string,
    source_script_sha: (sourceScriptSha ?? null) as string | null,
    solver_version: solverVersion as string,
    source_artifact: sourceArtifact as string,
    source_artifact_exported_at: sourceArtifactExportedAt as string,
  }
}

export function validateDfmBridgePayload(input: unknown): DfmValidationResult {
  const issues: DfmValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [{ path: '$', message: 'DFM bridge payload must be an object.', severity: 'error' }],
    }
  }

  const attribution = parseAttribution(input.attribution, issues)
  const nowcast = parseNowcast(input.nowcast, issues)
  const factor = parseFactor(input.factor, issues)

  const indicatorsRaw = input.indicators
  let indicators: DfmIndicator[] = []
  if (!Array.isArray(indicatorsRaw)) {
    pushError(issues, 'indicators', 'Expected an array.')
  } else if (indicatorsRaw.length === 0) {
    pushError(issues, 'indicators', 'Expected at least one indicator entry.')
  } else {
    indicators = indicatorsRaw
      .map((entry, index) => parseIndicator(entry, index, issues))
      .filter((entry): entry is DfmIndicator => entry !== null)
  }

  const caveatsRaw = input.caveats
  let caveats: DfmCaveat[] = []
  if (!Array.isArray(caveatsRaw)) {
    pushError(issues, 'caveats', 'Expected an array.')
  } else {
    caveats = caveatsRaw
      .map((entry, index) => parseCaveat(entry, index, issues))
      .filter((entry): entry is DfmCaveat => entry !== null)
  }

  const metadata = parseMetadata(input.metadata, issues)

  const hasErrors = issues.length > 0
  if (hasErrors || !attribution || !nowcast || !factor || !metadata) {
    return { ok: false, value: null, issues }
  }

  return {
    ok: true,
    value: {
      attribution,
      nowcast,
      factor,
      indicators,
      caveats,
      metadata,
    },
    issues,
  }
}
