import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'
import type {
  PeBaselineEffect,
  PeBridgePayload,
  PeChapter,
  PeHighTariffProduct,
  PeMetadata,
  PePartner,
  PeSection,
  PeTopTradeEffectSection,
} from './pe-types.js'

export type PeValidationIssue = {
  path: string
  message: string
  severity: 'error'
}

export type PeValidationResult = {
  ok: boolean
  value: PeBridgePayload | null
  issues: PeValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function pushError(issues: PeValidationIssue[], path: string, message: string) {
  issues.push({ path, message, severity: 'error' })
}

function nonEmptyString(value: unknown, issues: PeValidationIssue[], path: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(issues, path, 'Expected a non-empty string.')
    return null
  }
  return value
}

function finiteNumber(value: unknown, issues: PeValidationIssue[], path: string): number | null {
  if (!isFiniteNumber(value)) {
    pushError(issues, path, 'Expected a finite number.')
    return null
  }
  return value
}

function positiveNumber(value: unknown, issues: PeValidationIssue[], path: string): number | null {
  const parsed = finiteNumber(value, issues, path)
  if (parsed !== null && parsed <= 0) {
    pushError(issues, path, 'Expected a positive number.')
    return null
  }
  return parsed
}

function integer(value: unknown, issues: PeValidationIssue[], path: string, min = 0): number | null {
  if (!Number.isInteger(value) || (value as number) < min) {
    pushError(issues, path, `Expected an integer >= ${min}.`)
    return null
  }
  return value as number
}

function parseAttribution(value: unknown, issues: PeValidationIssue[]): ModelAttribution | null {
  if (!isRecord(value)) {
    pushError(issues, 'attribution', 'Expected an object.')
    return null
  }
  const output = {} as ModelAttribution
  let ok = true
  for (const field of ['model_id', 'model_name', 'module', 'version', 'run_id', 'data_version', 'timestamp'] as const) {
    const parsed = nonEmptyString(value[field], issues, `attribution.${field}`)
    if (!parsed) {
      ok = false
      continue
    }
    output[field] = parsed
  }
  return ok ? output : null
}

function parseBaselineEffect(value: unknown, issues: PeValidationIssue[], path: string): PeBaselineEffect | null {
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const tradeCreation = finiteNumber(value.trade_creation_usd, issues, `${path}.trade_creation_usd`)
  const tradeDiversion = finiteNumber(value.trade_diversion_usd, issues, `${path}.trade_diversion_usd`)
  const tradeEffect = finiteNumber(value.trade_effect_usd, issues, `${path}.trade_effect_usd`)
  const welfare = finiteNumber(value.welfare_usd, issues, `${path}.welfare_usd`)
  const revenueChange = finiteNumber(value.revenue_change_usd, issues, `${path}.revenue_change_usd`)
  if (
    tradeCreation === null ||
    tradeDiversion === null ||
    tradeEffect === null ||
    welfare === null ||
    revenueChange === null
  ) {
    return null
  }
  return {
    trade_creation_usd: tradeCreation,
    trade_diversion_usd: tradeDiversion,
    trade_effect_usd: tradeEffect,
    welfare_usd: welfare,
    revenue_change_usd: revenueChange,
  }
}

function parseMetadata(value: unknown, issues: PeValidationIssue[]): PeMetadata | null {
  if (!isRecord(value)) {
    pushError(issues, 'metadata', 'Expected an object.')
    return null
  }
  const sourceScriptSha = value.source_script_sha
  if (!(sourceScriptSha === null || typeof sourceScriptSha === 'string')) {
    pushError(issues, 'metadata.source_script_sha', 'Expected string or null.')
  }
  const exportedAt = nonEmptyString(value.exported_at, issues, 'metadata.exported_at')
  const sourceDataSha = nonEmptyString(value.source_data_sha, issues, 'metadata.source_data_sha')
  const solverVersion = nonEmptyString(value.solver_version, issues, 'metadata.solver_version')
  const sourceArtifact = nonEmptyString(value.source_artifact, issues, 'metadata.source_artifact')
  const sourceArtifactGenerated = nonEmptyString(
    value.source_artifact_generated,
    issues,
    'metadata.source_artifact_generated',
  )
  const sourceTitle = nonEmptyString(value.source_title, issues, 'metadata.source_title')
  const source = nonEmptyString(value.source, issues, 'metadata.source')
  const framework = nonEmptyString(value.framework, issues, 'metadata.framework')
  const units = nonEmptyString(value.units, issues, 'metadata.units')
  const baseYear = integer(value.base_year, issues, 'metadata.base_year', 1900)
  const hsSections = integer(value.hs_sections, issues, 'metadata.hs_sections', 1)
  const hsChapters = integer(value.hs_chapters, issues, 'metadata.hs_chapters', 1)
  const partners = integer(value.partners, issues, 'metadata.partners', 1)
  const defaultTariffCut = positiveNumber(value.default_tariff_cut_pct, issues, 'metadata.default_tariff_cut_pct')
  const baseElasticity = positiveNumber(value.base_elasticity, issues, 'metadata.base_elasticity')
  const elasticitySource = nonEmptyString(value.elasticity_source, issues, 'metadata.elasticity_source')
  if (
    !exportedAt ||
    !sourceDataSha ||
    !(sourceScriptSha === null || typeof sourceScriptSha === 'string') ||
    !solverVersion ||
    !sourceArtifact ||
    !sourceArtifactGenerated ||
    !sourceTitle ||
    !source ||
    !framework ||
    !units ||
    baseYear === null ||
    hsSections === null ||
    hsChapters === null ||
    partners === null ||
    defaultTariffCut === null ||
    baseElasticity === null ||
    !elasticitySource
  ) {
    return null
  }
  return {
    exported_at: exportedAt,
    source_script_sha: sourceScriptSha,
    source_data_sha: sourceDataSha,
    solver_version: solverVersion,
    source_artifact: sourceArtifact,
    source_artifact_generated: sourceArtifactGenerated,
    source_title: sourceTitle,
    source,
    framework,
    units,
    base_year: baseYear,
    hs_sections: hsSections,
    hs_chapters: hsChapters,
    partners,
    default_tariff_cut_pct: defaultTariffCut,
    base_elasticity: baseElasticity,
    elasticity_source: elasticitySource,
  }
}

function parseNumberArray(value: unknown, issues: PeValidationIssue[], path: string): number[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of numbers.')
    return null
  }
  const output: number[] = []
  let ok = true
  value.forEach((entry, index) => {
    if (!Number.isInteger(entry)) {
      pushError(issues, `${path}[${index}]`, 'Expected an integer chapter id.')
      ok = false
      return
    }
    output.push(entry)
  })
  return ok ? output : null
}

function parseSection(value: unknown, issues: PeValidationIssue[], path: string): PeSection | null {
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const id = nonEmptyString(value.id, issues, `${path}.id`)
  const name = nonEmptyString(value.name, issues, `${path}.name`)
  const imports = finiteNumber(value.import_usd, issues, `${path}.import_usd`)
  const avgMfn = finiteNumber(value.avg_mfn_rate, issues, `${path}.avg_mfn_rate`)
  const avgApplied = finiteNumber(value.avg_applied_rate, issues, `${path}.avg_applied_rate`)
  const chapters = parseNumberArray(value.chapters, issues, `${path}.chapters`)
  const elasticity = positiveNumber(value.elasticity, issues, `${path}.elasticity`)
  const baseline = parseBaselineEffect(value.baseline_20pct, issues, `${path}.baseline_20pct`)
  if (!id || !name || imports === null || avgMfn === null || avgApplied === null || !chapters || elasticity === null || !baseline) {
    return null
  }
  return {
    id,
    name,
    import_usd: imports,
    avg_mfn_rate: avgMfn,
    avg_applied_rate: avgApplied,
    chapters,
    elasticity,
    baseline_20pct: baseline,
  }
}

function parseChapter(value: unknown, issues: PeValidationIssue[], path: string): PeChapter | null {
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const chapter = integer(value.chapter, issues, `${path}.chapter`, 1)
  const sectionId = nonEmptyString(value.section_id, issues, `${path}.section_id`)
  const imports = finiteNumber(value.import_usd, issues, `${path}.import_usd`)
  const avgMfn = finiteNumber(value.avg_mfn_rate, issues, `${path}.avg_mfn_rate`)
  const avgApplied = finiteNumber(value.avg_applied_rate, issues, `${path}.avg_applied_rate`)
  const elasticity = positiveNumber(value.elasticity, issues, `${path}.elasticity`)
  const baseline = parseBaselineEffect(value.baseline_20pct, issues, `${path}.baseline_20pct`)
  if (chapter === null || !sectionId || imports === null || avgMfn === null || avgApplied === null || elasticity === null || !baseline) {
    return null
  }
  return {
    chapter,
    section_id: sectionId,
    import_usd: imports,
    avg_mfn_rate: avgMfn,
    avg_applied_rate: avgApplied,
    elasticity,
    baseline_20pct: baseline,
  }
}

function parsePartner(value: unknown, issues: PeValidationIssue[], path: string): PePartner | null {
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const name = nonEmptyString(value.name, issues, `${path}.name`)
  const regime = nonEmptyString(value.regime, issues, `${path}.regime`)
  const imports = finiteNumber(value.import_usd, issues, `${path}.import_usd`)
  const share = finiteNumber(value.import_share, issues, `${path}.import_share`)
  if (!name || !regime || imports === null || share === null) return null
  return { name, regime, import_usd: imports, import_share: share }
}

function parseCaveats(value: unknown, issues: PeValidationIssue[]): Caveat[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, 'caveats', 'Expected an array.')
    return null
  }
  const caveats: Caveat[] = []
  let ok = true
  value.forEach((entry, index) => {
    const path = `caveats[${index}]`
    if (!isRecord(entry)) {
      pushError(issues, path, 'Expected an object.')
      ok = false
      return
    }
    const caveatId = nonEmptyString(entry.caveat_id, issues, `${path}.caveat_id`)
    const severity = entry.severity
    const message = nonEmptyString(entry.message, issues, `${path}.message`)
    const rawAffectedMetrics = entry.affected_metrics
    const rawAffectedModels = entry.affected_models
    const affectedMetrics = Array.isArray(rawAffectedMetrics)
      ? rawAffectedMetrics.filter((item): item is string => typeof item === 'string')
      : null
    const affectedModels = Array.isArray(rawAffectedModels)
      ? rawAffectedModels.filter((item): item is string => typeof item === 'string')
      : null
    if (!(severity === 'info' || severity === 'warning' || severity === 'critical')) {
      pushError(issues, `${path}.severity`, 'Expected one of info|warning|critical.')
      ok = false
    }
    if (!affectedMetrics || !Array.isArray(rawAffectedMetrics) || affectedMetrics.length !== rawAffectedMetrics.length) {
      pushError(issues, `${path}.affected_metrics`, 'Expected an array of strings.')
      ok = false
    }
    if (!affectedModels || !Array.isArray(rawAffectedModels) || affectedModels.length !== rawAffectedModels.length) {
      pushError(issues, `${path}.affected_models`, 'Expected an array of strings.')
      ok = false
    }
    if (!caveatId || !message || !affectedMetrics || !affectedModels) {
      ok = false
      return
    }
    if (severity === 'info' || severity === 'warning' || severity === 'critical') {
      caveats.push({ caveat_id: caveatId, severity, message, affected_metrics: affectedMetrics, affected_models: affectedModels })
    }
  })
  return ok ? caveats : null
}

function parseHighTariffProducts(value: unknown, issues: PeValidationIssue[]): PeHighTariffProduct[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, 'high_tariff_products', 'Expected an array.')
    return null
  }
  const output: PeHighTariffProduct[] = []
  let ok = true
  value.forEach((entry, index) => {
    const path = `high_tariff_products[${index}]`
    if (!isRecord(entry)) {
      pushError(issues, path, 'Expected an object.')
      ok = false
      return
    }
    const hs6 = nonEmptyString(entry.hs6, issues, `${path}.hs6`)
    const chapter = integer(entry.chapter, issues, `${path}.chapter`, 1)
    const country = nonEmptyString(entry.country, issues, `${path}.country`)
    const mfnRate = finiteNumber(entry.mfn_rate, issues, `${path}.mfn_rate`)
    const appliedRate = finiteNumber(entry.applied_rate, issues, `${path}.applied_rate`)
    const imports = finiteNumber(entry.import_usd, issues, `${path}.import_usd`)
    const tradeCreation = finiteNumber(entry.trade_creation_usd, issues, `${path}.trade_creation_usd`)
    if (!hs6 || chapter === null || !country || mfnRate === null || appliedRate === null || imports === null || tradeCreation === null) {
      ok = false
      return
    }
    output.push({ hs6, chapter, country, mfn_rate: mfnRate, applied_rate: appliedRate, import_usd: imports, trade_creation_usd: tradeCreation })
  })
  return ok ? output : null
}

function parseTopTradeEffectSections(value: unknown, issues: PeValidationIssue[]): PeTopTradeEffectSection[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, 'top_trade_effect_sections', 'Expected an array.')
    return null
  }
  const output: PeTopTradeEffectSection[] = []
  let ok = true
  value.forEach((entry, index) => {
    const path = `top_trade_effect_sections[${index}]`
    if (!isRecord(entry)) {
      pushError(issues, path, 'Expected an object.')
      ok = false
      return
    }
    const sectionId = nonEmptyString(entry.section_id, issues, `${path}.section_id`)
    const name = nonEmptyString(entry.name, issues, `${path}.name`)
    const elasticity = positiveNumber(entry.elasticity, issues, `${path}.elasticity`)
    const effect = parseBaselineEffect(entry, issues, path)
    if (!sectionId || !name || elasticity === null || !effect) {
      ok = false
      return
    }
    output.push({ section_id: sectionId, name, elasticity, ...effect })
  })
  return ok ? output : null
}

function parseStringArray(value: unknown, issues: PeValidationIssue[], path: string): string[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of strings.')
    return null
  }
  let ok = true
  const output: string[] = []
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      pushError(issues, `${path}[${index}]`, 'Expected a string.')
      ok = false
      return
    }
    output.push(entry)
  })
  return ok ? output : null
}

export function validatePeBridgePayload(input: unknown): PeValidationResult {
  const issues: PeValidationIssue[] = []
  if (!isRecord(input)) {
    return { ok: false, value: null, issues: [{ path: '$', message: 'Expected PE payload object.', severity: 'error' }] }
  }

  const attribution = parseAttribution(input.attribution, issues)
  const metadata = parseMetadata(input.metadata, issues)
  const totalsRecord = isRecord(input.totals) ? input.totals : null
  if (!totalsRecord) pushError(issues, 'totals', 'Expected an object.')
  const importUsd = totalsRecord ? finiteNumber(totalsRecord.import_usd, issues, 'totals.import_usd') : null
  const subjectImportUsd = totalsRecord ? finiteNumber(totalsRecord.subject_import_usd, issues, 'totals.subject_import_usd') : null
  const totalsBaseline = totalsRecord ? parseBaselineEffect(totalsRecord.baseline_20pct, issues, 'totals.baseline_20pct') : null
  const sections = Array.isArray(input.sections)
    ? input.sections.map((entry, index) => parseSection(entry, issues, `sections[${index}]`)).filter((entry): entry is PeSection => entry !== null)
    : null
  if (!sections) pushError(issues, 'sections', 'Expected an array.')

  const chapters = isRecord(input.chapters)
    ? Object.fromEntries(
        Object.entries(input.chapters)
          .map(([chapterId, entry]) => [chapterId, parseChapter(entry, issues, `chapters.${chapterId}`)] as const)
          .filter((entry): entry is readonly [string, PeChapter] => entry[1] !== null),
      )
    : null
  if (!chapters) pushError(issues, 'chapters', 'Expected an object map.')

  const partners = Array.isArray(input.partners)
    ? input.partners.map((entry, index) => parsePartner(entry, issues, `partners[${index}]`)).filter((entry): entry is PePartner => entry !== null)
    : null
  if (!partners) pushError(issues, 'partners', 'Expected an array.')

  const elasticities = isRecord(input.elasticities)
    ? Object.fromEntries(
        Object.entries(input.elasticities).filter(([sectionId, value]) => {
          if (!isFiniteNumber(value) || value <= 0) {
            pushError(issues, `elasticities.${sectionId}`, 'Expected a positive finite number.')
            return false
          }
          return true
        }),
      ) as Record<string, number>
    : null
  if (!elasticities) pushError(issues, 'elasticities', 'Expected an object map.')

  const regimes = parseStringArray(input.regimes, issues, 'regimes')
  const highTariffProducts = parseHighTariffProducts(input.high_tariff_products, issues)
  const topTradeEffectSections = parseTopTradeEffectSections(input.top_trade_effect_sections, issues)
  const caveats = parseCaveats(input.caveats, issues)

  if (
    metadata &&
    sections &&
    (sections.length !== metadata.hs_sections || Object.keys(chapters ?? {}).length !== metadata.hs_chapters || (partners?.length ?? 0) !== metadata.partners)
  ) {
    pushError(issues, 'metadata', 'Metadata counts must match sections, chapters, and partners.')
  }
  if (sections && elasticities && sections.some((section) => elasticities[section.id] === undefined)) {
    pushError(issues, 'elasticities', 'Each public section must have an elasticity.')
  }

  const ok =
    issues.length === 0 &&
    Boolean(attribution && metadata && importUsd !== null && subjectImportUsd !== null && totalsBaseline && sections && chapters && partners && elasticities && regimes && highTariffProducts && topTradeEffectSections && caveats)

  return {
    ok,
    value: ok
      ? {
          attribution: attribution as ModelAttribution,
          metadata: metadata as PeMetadata,
          totals: {
            import_usd: importUsd as number,
            subject_import_usd: subjectImportUsd as number,
            baseline_20pct: totalsBaseline as PeBaselineEffect,
          },
          elasticities: elasticities as Record<string, number>,
          sections: sections as PeSection[],
          chapters: chapters as Record<string, PeChapter>,
          partners: partners as PePartner[],
          regimes: regimes as string[],
          high_tariff_products: highTariffProducts as PeHighTariffProduct[],
          top_trade_effect_sections: topTradeEffectSections as PeTopTradeEffectSection[],
          caveats: caveats as Caveat[],
        }
      : null,
    issues,
  }
}
