import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const sourcePath = join(repoRoot, 'io_model', 'io_data.json')
const outputPath = join(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'io.json')

const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const sourceGenerated = requireString(source.metadata.generated, 'metadata.generated')
const exportedAt = `${sourceGenerated}T00:00:00Z`

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

const sectors = requireArray(source.sectors, 'sectors').map((sector, index) => ({
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
      caveat_id: 'io-sector-names-ru-source',
      severity: 'info',
      message:
        'Sector names are carried in Russian from the source JSON; English and Uzbek labels require a later reconciled sector-name source.',
      affected_metrics: ['sector_name'],
      affected_models: ['IO'],
    },
  ],
  metadata: {
    exported_at: exportedAt,
    source_script_sha: null,
    solver_version: '0.1.0',
    source_artifact: 'io_model/io_data.json',
    source_artifact_generated: sourceGenerated,
    source_title: requireString(source.metadata.title_en, 'metadata.title_en'),
    source: requireString(source.metadata.source, 'metadata.source'),
    framework: requireString(source.metadata.framework, 'metadata.framework'),
    units: requireString(source.metadata.units, 'metadata.units'),
    base_year: requireNumber(source.metadata.year, 'metadata.year'),
    n_sectors: nSectors,
  },
}

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outputPath}`)
