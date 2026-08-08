import type { ComparisonSectorEvidence } from '../../contracts/data-contract.js'
import { toIoAdapterOutput, type IoAdapterOutput } from '../bridge/io-adapter.js'
import type { IoBridgePayload, IoLinkageClassification } from '../bridge/io-types.js'

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

export function toComparisonSectorEvidence(
  payload: IoBridgePayload,
  adapterOutput: IoAdapterOutput = toIoAdapterOutput(payload),
): ComparisonSectorEvidence {
  return {
    source_artifact: payload.metadata.source_artifact,
    data_vintage: payload.attribution.data_version,
    exported_at: toIsoDateLabel(payload.metadata.exported_at),
    sector_count: adapterOutput.metadata.n_sectors,
    framework: adapterOutput.metadata.framework,
    units: adapterOutput.metadata.units,
    linkage_counts: (['key', 'backward', 'forward', 'weak'] as IoLinkageClassification[]).map(
      (classification) => ({
        classification,
        value: adapterOutput.type_counts[classification],
      }),
    ),
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}
