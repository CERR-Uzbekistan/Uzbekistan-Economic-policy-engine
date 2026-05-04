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

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
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

function withBridgeEvidence(entry: ModelCatalogEntry, evidence: ModelBridgeEvidence): ModelCatalogEntry {
  return {
    ...entry,
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

  const evidence = toModelExplorerIoBridgeEvidence(payload)

  return {
    ...workspace,
    catalog_entries_by_model_id: {
      ...catalogEntries,
      [IO_MODEL_ID]: withBridgeEvidence(ioEntry, evidence),
    },
  }
}
