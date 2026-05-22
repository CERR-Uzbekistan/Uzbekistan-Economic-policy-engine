import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const sourcePath = join(repoRoot, 'io_model', 'io_data.json')
const mcpConversionSourcePath = join(repoRoot, 'io_model', 'io_data.js')
const outputPath = join(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'io.json')

const sourceWorkbooks = [
  {
    role: 'symmetric_input_output_table',
    file_name: 'ТЗВ 2022 136х136.xlsx',
    sheets: ['ТЗВ всего', 'К-ты прямых затрат А', 'к-ты полных затрат (Е-А)-1'],
    description:
      'Source 136-sector Uzbekistan symmetric input-output table, direct technical coefficients, and Leontief inverse.',
  },
  {
    role: 'employment_by_sector',
    file_name: 'Employment.xlsx',
    sheets: ['Employment'],
    description:
      'Formal, informal, and total employment by source I-O sector code, aligned by sector order.',
  },
]

const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const mcpSource = loadIoDataJs(mcpConversionSourcePath)
const sourceGenerated = requireString(source.metadata.generated, 'metadata.generated')
const exportedAt = `${sourceGenerated}T00:00:00Z`

function loadIoDataJs(path) {
  const code = readFileSync(path, 'utf8')
  const load = new Function(`${code}; return IO_DATA;`)
  return load()
}

function requireArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`Expected ${field} to be an array.`)
  return value
}

function requireNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${field} to be a finite number.`)
  }
  return value
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string.`)
  }
  return value
}

function normalizeCode(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}

function broadGroupForCode(code) {
  const normalized = normalizeCode(code)
  const first = normalized[0]?.toUpperCase()
  if (first === 'A') return 'agriculture'
  if (['B', 'C', 'D', 'E'].includes(first)) return 'industry'
  if (first === 'F') return 'construction'
  if (first === 'G' || first === 'H') return 'trade_transport'
  if (['O', 'P', 'Q'].includes(first)) return 'public_social'
  if (first) return 'services'
  return 'other'
}

function requireAlignedMcpSource(index, sector) {
  const mcpCode = requireString(mcpSource.codes?.[index], `mcp.codes[${index}]`)
  const mcpName = requireString(mcpSource.names?.[index], `mcp.names[${index}]`)
  if (normalizeCode(sector.code) !== normalizeCode(mcpCode) || normalizeCode(sector.name) !== normalizeCode(mcpName)) {
    throw new Error(
      `MCP I-O employment source does not align at sector ${index}: ${sector.code} / ${mcpCode}.`,
    )
  }
}

function optionalDictionaryLabel(arrayName, index) {
  const values = mcpSource[arrayName]
  if (values === undefined || values === null) return null
  const label = requireString(requireArray(values, `mcp.${arrayName}`)[index], `mcp.${arrayName}[${index}]`)
  return label
}

function requireEmploymentNumber(arrayName, index) {
  const values = requireArray(mcpSource[arrayName], `mcp.${arrayName}`)
  return requireNumber(values[index], `mcp.${arrayName}[${index}]`)
}

const sectors = requireArray(source.sectors, 'sectors').map((sector, index) => {
  requireAlignedMcpSource(index, sector)
  return {
    id: requireNumber(sector.id, `sectors[${index}].id`),
    code: requireString(sector.code, `sectors[${index}].code`),
    name_ru: requireString(sector.name, `sectors[${index}].name`),
    output_thousand_uzs: requireNumber(sector.output, `sectors[${index}].output`),
    total_resources_thousand_uzs: requireNumber(sector.total_resources, `sectors[${index}].total_resources`),
    imports_thousand_uzs: requireNumber(sector.imports, `sectors[${index}].imports`),
    gva_thousand_uzs: requireNumber(sector.gva, `sectors[${index}].gva`),
    compensation_of_employees_thousand_uzs: requireNumber(sector.coe, `sectors[${index}].coe`),
    gross_operating_surplus_thousand_uzs: requireNumber(sector.gos, `sectors[${index}].gos`),
    output_multiplier: requireNumber(sector.output_multiplier, `sectors[${index}].output_multiplier`),
    value_added_multiplier: requireNumber(sector.va_multiplier, `sectors[${index}].va_multiplier`),
    final_demand: {
      household: requireNumber(sector.final_demand.household, `sectors[${index}].final_demand.household`),
      government: requireNumber(sector.final_demand.government, `sectors[${index}].final_demand.government`),
      npish: requireNumber(sector.final_demand.npish, `sectors[${index}].final_demand.npish`),
      gfcf: requireNumber(sector.final_demand.gfcf, `sectors[${index}].final_demand.gfcf`),
      inventories: requireNumber(sector.final_demand.inventories, `sectors[${index}].final_demand.inventories`),
      exports: requireNumber(sector.final_demand.exports, `sectors[${index}].final_demand.exports`),
      total: requireNumber(sector.final_demand.total, `sectors[${index}].final_demand.total`),
    },
    employment_total: requireEmploymentNumber('EmpTotal', index),
    employment_formal: requireEmploymentNumber('EmpFormal', index),
    employment_informal: requireEmploymentNumber('EmpInformal', index),
  }
})

const sectorDictionary = sectors.map((sector, index) => ({
  code: sector.code,
  source_label: sector.name_ru,
  display_label_en: optionalDictionaryLabel('namesEN', index),
  display_label_ru: sector.name_ru,
  display_label_uz: optionalDictionaryLabel('namesUZ', index),
  broad_group: broadGroupForCode(sector.code),
  tradable_tag: null,
  value_chain_tag: null,
}))

const nSectors = requireNumber(source.metadata.n_sectors, 'metadata.n_sectors')
if (sectors.length !== nSectors) {
  throw new Error(`Expected ${nSectors} sectors, received ${sectors.length}.`)
}

const payload = {
  attribution: {
    model_id: 'IO',
    model_name: 'Input-Output Leontief Model (Uzbekistan)',
    module: 'io_model',
    version: '0.1.0',
    run_id: `io-static-${sourceGenerated}`,
    data_version: String(source.metadata.year),
    timestamp: exportedAt,
  },
  sectors,
  sector_dictionary: sectorDictionary,
  matrices: {
    technical_coefficients: requireArray(source.A, 'A'),
    leontief_inverse: requireArray(source.L, 'L'),
  },
  totals: {
    output_thousand_uzs: requireArray(source.X, 'X'),
    total_resources_thousand_uzs: requireArray(source.X_total, 'X_total'),
    final_demand_thousand_uzs: requireArray(source.Y, 'Y'),
    imports_thousand_uzs: requireArray(source.imports, 'imports'),
  },
  caveats: [
    {
      caveat_id: 'io-type-i-only-json-source',
      severity: 'info',
      message:
        'The committed JSON source carries Type I multipliers and Leontief matrices; Type II induced-consumption arrays are not part of this bridge payload.',
      affected_metrics: ['output_multiplier', 'value_added_multiplier'],
      affected_models: ['IO'],
    },
    {
      caveat_id: 'io-monetary-scale-audited',
      severity: 'info',
      message:
        'Raw monetary source arrays are retained under the legacy bridge field names; Scenario Lab converts results to billion UZS and tests guard against scale drift.',
      affected_metrics: ['output_effect_bln_uzs', 'value_added_effect_bln_uzs'],
      affected_models: ['IO'],
    },
    {
      caveat_id: 'io-sector-names-ru-source',
      severity: 'info',
      message:
        'Scenario Lab displays source Russian sector labels. The sector dictionary also carries English and Uzbek labels from the tracked I-O JavaScript source, but those labels are not used as official translations in the UI.',
      affected_metrics: ['sector_name'],
      affected_models: ['IO'],
    },
    {
      caveat_id: 'io-sector-dictionary-prepared',
      severity: 'info',
      message:
        'Sector dictionary support carries source label, EN/RU/UZ display labels where available, and broad groups derived from the leading sector-code letter; tradable and value-chain tags are explicit nulls until a source or rule is accepted.',
      affected_metrics: ['sector_dictionary'],
      affected_models: ['IO'],
    },
    {
      caveat_id: 'io-employment-mcp-source',
      severity: 'info',
      message:
        'Employment arrays are merged from the tracked I-O JavaScript source used by the MCP data converter. Employment effects are linear employment-intensity estimates, not labor-market forecasts.',
      affected_metrics: ['employment_effect_persons'],
      affected_models: ['IO'],
    },
    {
      caveat_id: 'io-import-content-accounting',
      severity: 'info',
      message:
        'Import content is estimated from each sector average imports-to-total-resources share. It is an accounting split, not a behavioral import-substitution or trade forecast.',
      affected_metrics: ['import_content_effect_bln_uzs', 'domestic_resource_effect_bln_uzs'],
      affected_models: ['IO'],
    },
  ],
  metadata: {
    exported_at: exportedAt,
    source_script_sha: null,
    solver_version: '0.1.0',
    source_artifact: 'io_model/io_data.json + io_model/io_data.js',
    source_artifact_generated: sourceGenerated,
    source_workbooks: sourceWorkbooks,
    source_title: requireString(source.metadata.title_en, 'metadata.title_en'),
    source: requireString(source.metadata.source, 'metadata.source'),
    framework: requireString(source.metadata.framework, 'metadata.framework'),
    units: 'raw source monetary arrays; Scenario Lab results in bln UZS',
    base_year: requireNumber(source.metadata.year, 'metadata.year'),
    n_sectors: nSectors,
  },
}

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outputPath}`)
