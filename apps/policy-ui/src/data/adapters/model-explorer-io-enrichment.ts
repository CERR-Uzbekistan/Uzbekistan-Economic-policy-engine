import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelValidationCheck,
  ModelExplorerWorkspace,
} from '../../contracts/data-contract.js'
import { toIoAdapterOutput, type IoAdapterOutput } from '../bridge/io-adapter.js'
import { auditIoBridgePayload } from '../bridge/io-audit.js'
import type { IoBridgePayload, IoLinkageClassification } from '../bridge/io-types.js'

const IO_MODEL_ID = 'io-model'

const LINKAGE_LABELS: Record<IoLinkageClassification, string> = {
  key: 'Key',
  backward: 'Backward-only',
  forward: 'Forward-only',
  weak: 'Weak',
}

const IO_CAVEAT_TITLES: Record<string, string> = {
  'io-type-i-only-json-source': 'Type I multipliers only',
  'io-monetary-scale-audited': 'Monetary scale guarded',
  'io-sector-names-ru-source': 'Sector names in source language',
  'io-sector-dictionary-prepared': 'Sector dictionary prepared',
  'io-employment-mcp-source': 'Employment effects are linear estimates',
}

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatNumber(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

function linkageCountLabel(adapterOutput: IoAdapterOutput): string {
  return (['key', 'backward', 'forward', 'weak'] as const)
    .map((classification) => `${LINKAGE_LABELS[classification]} ${adapterOutput.type_counts[classification]}`)
    .join(' / ')
}

function publicCaveatMessage(message: string): string {
  return message.replace(/\bbridge payload\b/gi, 'published data file')
}

function toValidationChecks(payload: IoBridgePayload): ModelValidationCheck[] {
  const auditChecks = auditIoBridgePayload(payload).checks.map((check) => ({
    label: check.label,
    status: check.status === 'pass' ? 'pass' : 'needs_review',
    detail: check.detail,
  }) satisfies ModelValidationCheck)

  return [
    ...auditChecks,
    {
      label: 'Sector dictionary',
      status: 'caveat',
      detail:
        'Source labels and available EN/RU/UZ display labels are carried; broad groups use a documented sector-code rule, while tradable and value-chain tags remain explicit nulls.',
    },
    {
      label: 'Forecast boundary',
      status: 'caveat',
      detail:
        'The model is ready for sector-transmission and multiplier analysis only; prices, inflation, substitution, fiscal feedback, external balance, and CGE effects are outside this I-O lane.',
    },
  ]
}

export function toModelExplorerIoBridgeEvidence(
  payload: IoBridgePayload,
  adapterOutput: IoAdapterOutput = toIoAdapterOutput(payload),
): ModelBridgeEvidence {
  return {
    status_label: 'Validated',
    source_artifact: payload.metadata.source_artifact,
    data_version: payload.attribution.data_version,
    exported_at: toIsoDateLabel(payload.metadata.exported_at),
    solver_version: payload.metadata.solver_version,
    sector_count: adapterOutput.metadata.n_sectors,
    framework: adapterOutput.metadata.framework,
    units: adapterOutput.metadata.units,
    linkage_counts: (['key', 'backward', 'forward', 'weak'] as const).map((classification) => ({
      label: LINKAGE_LABELS[classification],
      value: String(adapterOutput.type_counts[classification]),
    })),
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}

function withBridgeEvidence(
  entry: ModelCatalogEntry,
  payload: IoBridgePayload,
  adapterOutput: IoAdapterOutput,
): ModelCatalogEntry {
  const evidence = toModelExplorerIoBridgeEvidence(payload, adapterOutput)
  const topOutputSector = adapterOutput.top_output_multipliers[0]
  const topValueAddedSector = adapterOutput.top_value_added_multipliers[0]

  return {
    ...entry,
    description: `${adapterOutput.metadata.n_sectors}-sector ${adapterOutput.metadata.base_year} Uzbekistan I-O model for short-run sector transmission, value-added accounting, and employment-intensity exposure.`,
    stats: [
      { value: String(adapterOutput.metadata.n_sectors), label: 'Sectors' },
      { value: String(adapterOutput.metadata.base_year), label: 'Base year' },
      { value: 'Type I', label: 'Multipliers' },
    ],
    purpose:
      'Plain-language use: ask how a final-demand shock moves through supplier sectors under fixed 2022 production relationships. The model reports total-resource requirements, value-added accounting effects, employment-intensity exposure, and linkage rankings. It is not a forecast of prices, inflation, fiscal balances, external balance, substitution, or general-equilibrium adjustment.',
    model_note: {
      title: 'I-O model note',
      summary:
        'Static Leontief input-output model for Uzbekistan: r = (I - A)^-1 f. Technical coefficients A use total resources as denominator; the Leontief inverse L captures direct and indirect total-resource requirements.',
      items: [
        {
          label: 'Core equation',
          value: 'r = (I - A)^-1 f, with f as a final-demand shock vector and r as total-resource requirements.',
        },
        {
          label: 'Coefficients',
          value:
            'Technical coefficients, Leontief inverse, value-added coefficients GVA_i / total_resources_i, and employment coefficients employment_i / total_resources_i.',
        },
        {
          label: 'Data',
          value: `${payload.metadata.source_title}; source ${payload.metadata.source}; base year ${payload.metadata.base_year}; ${adapterOutput.metadata.n_sectors} sectors; source monetary arrays with Scenario Lab results in bln UZS.`,
        },
        {
          label: 'Sector codes',
          value:
            'Sector codes are carried from the source artifact. Broad groups are derived only from the leading sector-code letter; tradable/upstream tags remain null until a source or rule is accepted.',
        },
        {
          label: 'Answers',
          value:
            'Short-run sector resource requirements, value-added accounting, employment-intensity exposure, multiplier, and allocation-sensitivity questions.',
        },
      ],
      boundaries: [
        'Cannot answer price, inflation, substitution, capacity, fiscal-feedback, external-balance, welfare, or CGE/general-equilibrium questions.',
        'Employment effects are fixed-intensity exposure estimates, not labor-market forecasts.',
        'Sensitivity ranges are deterministic robustness checks around the same static model, not probability bands.',
      ],
    },
    parameters: [
      {
        symbol: 'n',
        name: 'Public sector rows',
        value: String(adapterOutput.metadata.n_sectors),
        range: 'artifact count',
      },
      {
        symbol: 'A',
        name: 'Technical coefficient matrix',
        value: `${adapterOutput.metadata.n_sectors} x ${adapterOutput.metadata.n_sectors}`,
        range: 'from io.json',
      },
      {
        symbol: 'L',
        name: 'Leontief inverse',
        value: '(I - A)^-1',
        range: 'from io.json',
      },
      {
        symbol: 'v',
        name: 'Value-added coefficients',
        value: 'GVA_i / total_resources_i',
        range: 'computed from source sector accounts',
      },
      {
        symbol: 'e',
        name: 'Employment coefficients',
        value: 'EMP_i / X_i',
        range: 'computed where employment arrays exist',
      },
      {
        symbol: 'classes',
        name: 'Linkage classification',
        value: linkageCountLabel(adapterOutput),
        range: 'backward/forward indices around 1.0',
      },
      {
        symbol: 'max output',
        name: topOutputSector?.code ?? 'Top output multiplier',
        value: topOutputSector ? formatNumber(topOutputSector.output_multiplier, 3) : 'n/a',
        range: topOutputSector?.name_ru ?? 'not available',
      },
      {
        symbol: 'max VA',
        name: topValueAddedSector?.code ?? 'Top value-added multiplier',
        value: topValueAddedSector ? formatNumber(topValueAddedSector.value_added_multiplier, 3) : 'n/a',
        range: topValueAddedSector?.name_ru ?? 'not available',
      },
    ],
    caveats: payload.caveats.map((caveat, index) => ({
      id: caveat.caveat_id,
      number: String(index + 1).padStart(2, '0'),
      severity: caveat.severity,
      title: IO_CAVEAT_TITLES[caveat.caveat_id] ?? caveat.caveat_id.replace(/^io-/, '').replace(/-/g, ' '),
      body: publicCaveatMessage(caveat.message),
    })),
    data_sources: [
      {
        institution: 'I-O public bridge artifact',
        description: `${adapterOutput.metadata.n_sectors} sectors, Leontief inverse, multipliers, linkage classes, and caveats`,
        vintage_label: payload.attribution.data_version,
      },
      {
        institution: payload.metadata.source,
        description: payload.metadata.source_title,
        vintage_label: String(payload.metadata.base_year),
      },
      {
        institution: 'I-O source artifact',
        description: payload.metadata.source_artifact,
        vintage_label: toIsoDateLabel(payload.metadata.exported_at),
      },
      {
        institution: 'United Nations',
        description:
          'Handbook on Supply and Use Tables and Input-Output Tables with Extensions and Applications: https://www.un-ilibrary.org/content/books/9789213582794',
        vintage_label: 'SUT/IOT reference',
      },
      {
        institution: 'Eurostat',
        description:
          'Manual of Supply, Use and Input-Output Tables: https://ec.europa.eu/eurostat/web/products-manuals-and-guidelines/-/ks-ra-07-013',
        vintage_label: '2008 manual',
      },
      {
        institution: 'OECD',
        description:
          'OECD ICIO methodology, Development of the OECD Inter-Country Input-Output Database 2023: https://doi.org/10.1787/5a5d0665-en',
        vintage_label: 'ICIO methodology',
      },
    ],
    validation_summary: [
      `Readiness status: internally ready as a documented sector-transmission and multiplier tool, using base year ${payload.metadata.base_year} and ${adapterOutput.metadata.n_sectors} sectors.`,
      `Core validation checks cover Leontief matrix usability, aligned sector arrays, impossible negative coefficients, total-resources baseline reconstruction, proportional 1 bln UZS scaling, and deterministic sector rankings.`,
      `Linkage classes are derived from backward and forward Leontief indices; current counts are ${linkageCountLabel(adapterOutput)}.`,
      'Limits are explicit: no prices, inflation, substitution, fiscal feedback, external balance, or CGE/general-equilibrium behavior is claimed.',
    ],
    validation_checks: toValidationChecks(payload),
    bridge_evidence: evidence,
  }
}

export function enrichModelExplorerWorkspaceWithIoBridge(
  workspace: ModelExplorerWorkspace,
  payload: IoBridgePayload,
): ModelExplorerWorkspace {
  const catalogEntries = workspace.catalog_entries_by_model_id
  const ioEntry = catalogEntries?.[IO_MODEL_ID]
  if (!catalogEntries || !ioEntry) return workspace

  const adapterOutput = toIoAdapterOutput(payload)

  return {
    ...workspace,
    catalog_entries_by_model_id: {
      ...catalogEntries,
      [IO_MODEL_ID]: withBridgeEvidence(ioEntry, payload, adapterOutput),
    },
  }
}
