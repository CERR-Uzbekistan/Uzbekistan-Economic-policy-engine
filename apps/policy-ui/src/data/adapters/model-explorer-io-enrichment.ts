import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
} from '../../contracts/data-contract.js'
import { toIoAdapterOutput, type IoAdapterOutput } from '../bridge/io-adapter.js'
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
  'io-sector-names-ru-source': 'Sector names in source language',
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
    description: `${adapterOutput.metadata.n_sectors}-sector ${adapterOutput.metadata.base_year} Leontief bridge artifact with Type I multipliers and linkage classes.`,
    stats: [
      { value: String(adapterOutput.metadata.n_sectors), label: 'Sectors' },
      { value: String(adapterOutput.metadata.base_year), label: 'Base year' },
      { value: 'Type I', label: 'Multipliers' },
    ],
    purpose:
      'Static input-output accounting lane built from the accepted public I-O artifact. It supports sector demand-shock propagation, output and value-added multiplier checks, and linkage classification; it does not model prices, substitution, or behavioral adjustment.',
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
    ],
    validation_summary: [
      `Public io.json validates against the I-O bridge schema and exposes ${adapterOutput.metadata.n_sectors} sectors, the technical-coefficient matrix, Leontief inverse, and Type I multiplier fields.`,
      `Linkage classes are derived from backward and forward Leontief indices; current counts are ${linkageCountLabel(adapterOutput)}.`,
      'Frontend validation checks shape, matrix dimensions, sector fields, metadata, and caveats; it does not claim price, substitution, or general-equilibrium behavior.',
    ],
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
