import type { CaveatSeverity } from '../../contracts/data-contract.js'
import {
  DfmTransportError,
  DfmValidationError,
  fetchDfmBridgePayload,
} from '../bridge/dfm-client.js'
import type { DfmBridgePayload } from '../bridge/dfm-types.js'
import type { FetchLike } from '../bridge/bridge-fetch.js'
import {
  IoTransportError,
  IoValidationError,
  fetchIoBridgePayload,
} from '../bridge/io-client.js'
import type { IoBridgePayload } from '../bridge/io-types.js'
import {
  QpmTransportError,
  QpmValidationError,
  fetchQpmBridgePayload,
} from '../bridge/qpm-client.js'
import type { QpmBridgePayload } from '../bridge/qpm-types.js'

export type RegistryStatus = 'valid' | 'warning' | 'failed' | 'missing' | 'unavailable' | 'planned'
export type ImplementedModelId = 'qpm' | 'dfm' | 'io'
export type PlannedModelId = 'pe' | 'cge' | 'fpp'
export type RegistryModelId = ImplementedModelId | PlannedModelId

export type RegistryIssue = {
  path: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export type RegistryArtifact = {
  id: ImplementedModelId
  artifactPath: string
  modelArea: string
  modelExplorerHref: string
  status: RegistryStatus
  statusDetail: string
  dataVintage: string
  exportTimestamp: string
  sourceArtifact: string
  sourceVintage: string
  solverVersion: string
  caveatCount: number
  highestCaveatSeverity: CaveatSeverity | 'none'
  facts: Array<{ label: string; value: string }>
  consumers: Array<{ label: string; href: string }>
  issues: RegistryIssue[]
}

export type RegistryRow = {
  id: RegistryModelId
  label: string
  domain: string
  status: RegistryStatus
  dataVintage: string
  exportTimestamp: string
  source: string
  notes: string
  modelExplorerHref?: string
}

export type RegistryWarning = {
  id: string
  status: RegistryStatus
  title: string
  detail: string
}

export type DataRegistry = {
  generatedAt: string
  summaryCounts: Record<RegistryStatus, number>
  artifacts: RegistryArtifact[]
  dataSources: RegistryRow[]
  modelInputs: RegistryRow[]
  vintages: RegistryRow[]
  updateStatuses: RegistryRow[]
  warnings: RegistryWarning[]
}

type LoadedArtifact =
  | { status: 'loaded'; payload: QpmBridgePayload | DfmBridgePayload | IoBridgePayload }
  | { status: 'failed' | 'missing' | 'unavailable'; detail: string; issues: RegistryIssue[] }

const DASH = 'Not carried in public artifact'
const DFM_STALE_WARNING_HOURS = 48
const DFM_STALE_CRITICAL_HOURS = 24 * 7

const CONSUMER_LINKS = {
  overview: { label: 'Overview', href: '/overview' },
  scenarioLab: { label: 'Scenario Lab', href: '/scenario-lab' },
  comparison: { label: 'Comparison', href: '/comparison' },
  modelExplorer: { label: 'Model Explorer', href: '/model-explorer' },
} as const

export function getInitialDataRegistry(): DataRegistry {
  return buildDataRegistry({
    qpm: { status: 'unavailable', detail: 'Loading /data/qpm.json.', issues: [] },
    dfm: { status: 'unavailable', detail: 'Loading /data/dfm.json.', issues: [] },
    io: { status: 'unavailable', detail: 'Loading /data/io.json.', issues: [] },
    now: new Date(),
  })
}

export async function loadDataRegistry(fetchImpl: FetchLike = fetch, now = new Date()): Promise<DataRegistry> {
  const [qpm, dfm, io] = await Promise.all([
    loadQpmArtifact(fetchImpl),
    loadDfmArtifact(fetchImpl),
    loadIoArtifact(fetchImpl),
  ])

  return buildDataRegistry({ qpm, dfm, io, now })
}

export function buildDataRegistry(options: {
  qpm: LoadedArtifact
  dfm: LoadedArtifact
  io: LoadedArtifact
  now: Date
}): DataRegistry {
  const artifacts = [
    buildQpmArtifact(options.qpm),
    buildDfmArtifact(options.dfm, options.now),
    buildIoArtifact(options.io),
  ]
  const plannedRows = buildPlannedRows()
  const dataSources = [...artifacts.map(toDataSourceRow), ...plannedRows]
  const modelInputs = [...artifacts.map(toModelInputRow), ...plannedRows.map(toPlannedModelInputRow)]
  const vintages = artifacts.map(toVintageRow)
  const updateStatuses = artifacts.map(toUpdateStatusRow)
  const warnings = buildWarnings(artifacts, plannedRows)
  const summaryCounts = countStatuses([...artifacts, ...plannedRows])

  return {
    generatedAt: options.now.toISOString(),
    summaryCounts,
    artifacts,
    dataSources,
    modelInputs,
    vintages,
    updateStatuses,
    warnings,
  }
}

async function loadQpmArtifact(fetchImpl: FetchLike): Promise<LoadedArtifact> {
  try {
    return { status: 'loaded', payload: await fetchQpmBridgePayload(fetchImpl) }
  } catch (error) {
    return mapBridgeError(error, 'QPM')
  }
}

async function loadDfmArtifact(fetchImpl: FetchLike): Promise<LoadedArtifact> {
  try {
    return { status: 'loaded', payload: await fetchDfmBridgePayload(fetchImpl) }
  } catch (error) {
    return mapBridgeError(error, 'DFM')
  }
}

async function loadIoArtifact(fetchImpl: FetchLike): Promise<LoadedArtifact> {
  try {
    return { status: 'loaded', payload: await fetchIoBridgePayload(fetchImpl) }
  } catch (error) {
    return mapBridgeError(error, 'I-O')
  }
}

function mapBridgeError(error: unknown, label: string): LoadedArtifact {
  if (
    error instanceof QpmValidationError ||
    error instanceof DfmValidationError ||
    error instanceof IoValidationError
  ) {
    return {
      status: 'failed',
      detail: `${label} artifact loaded but failed frontend guard checks.`,
      issues: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        severity: issue.severity,
      })),
    }
  }

  if (
    error instanceof QpmTransportError ||
    error instanceof DfmTransportError ||
    error instanceof IoTransportError
  ) {
    const isMissing = error.kind === 'http' && error.status === 404
    return {
      status: isMissing ? 'missing' : 'unavailable',
      detail: isMissing
        ? `${label} public artifact was not found.`
        : `${label} public artifact could not be fetched in the frontend.`,
      issues: [
        {
          path: 'artifact',
          message: error.message,
          severity: isMissing ? 'warning' : 'error',
        },
      ],
    }
  }

  return {
    status: 'unavailable',
    detail: `${label} public artifact could not be loaded.`,
    issues: [
      {
        path: 'artifact',
        message: error instanceof Error ? error.message : 'Unknown bridge load failure.',
        severity: 'error',
      },
    ],
  }
}

function buildQpmArtifact(result: LoadedArtifact): RegistryArtifact {
  const base = createArtifactBase('qpm', '/data/qpm.json', 'Macro / QPM')
  if (result.status !== 'loaded') return artifactFromFailure(base, result)
  const payload = result.payload as QpmBridgePayload
  const highestSeverity = getHighestCaveatSeverity(payload.caveats)

  return {
    ...base,
    status: highestSeverity === 'critical' || highestSeverity === 'warning' ? 'warning' : 'valid',
    statusDetail: 'Artifact loaded and passed QPM frontend guard checks; this is not economic validation.',
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.attribution.module,
    sourceVintage: payload.attribution.data_version,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: highestSeverity,
    facts: [
      { label: 'Run id', value: payload.attribution.run_id },
      { label: 'Scenarios', value: String(payload.scenarios.length) },
      { label: 'Parameters', value: String(payload.parameters.length) },
    ],
    consumers: [
      CONSUMER_LINKS.overview,
      CONSUMER_LINKS.scenarioLab,
      CONSUMER_LINKS.comparison,
      CONSUMER_LINKS.modelExplorer,
    ],
    issues: caveatsToIssues(payload.caveats),
  }
}

function buildDfmArtifact(result: LoadedArtifact, now: Date): RegistryArtifact {
  const base = createArtifactBase('dfm', '/data/dfm.json', 'DFM nowcast')
  if (result.status !== 'loaded') return artifactFromFailure(base, result)
  const payload = result.payload as DfmBridgePayload
  const staleIssue = getDfmStaleIssue(payload.metadata.exported_at, now)
  const caveatIssues = caveatsToIssues(payload.caveats)
  const highestSeverity = getHighestCaveatSeverity(payload.caveats)
  const issues = staleIssue ? [staleIssue, ...caveatIssues] : caveatIssues

  return {
    ...base,
    status: issues.length > 0 ? 'warning' : 'valid',
    statusDetail: 'Artifact loaded and passed DFM frontend guard checks; this is not economic validation.',
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.metadata.source_artifact,
    sourceVintage: payload.metadata.source_artifact_exported_at,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: staleIssue?.severity === 'error' ? 'critical' : highestSeverity,
    facts: [
      { label: 'Current quarter', value: payload.nowcast.current_quarter.period },
      { label: 'Indicators', value: String(payload.indicators.length) },
      { label: 'Factor convergence', value: payload.factor.converged ? 'Converged' : 'Not converged' },
    ],
    consumers: [CONSUMER_LINKS.overview, CONSUMER_LINKS.modelExplorer],
    issues,
  }
}

function buildIoArtifact(result: LoadedArtifact): RegistryArtifact {
  const base = createArtifactBase('io', '/data/io.json', 'I-O sector analytics')
  if (result.status !== 'loaded') return artifactFromFailure(base, result)
  const payload = result.payload as IoBridgePayload
  const highestSeverity = getHighestCaveatSeverity(payload.caveats)

  return {
    ...base,
    status: highestSeverity === 'critical' || highestSeverity === 'warning' ? 'warning' : 'valid',
    statusDetail: 'Artifact loaded and passed I-O frontend guard checks; this is not economic validation.',
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.metadata.source_artifact,
    sourceVintage: `Base-year vintage ${payload.metadata.base_year}`,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: highestSeverity,
    facts: [
      { label: 'Sectors', value: String(payload.metadata.n_sectors) },
      { label: 'Framework', value: payload.metadata.framework },
      { label: 'Units', value: payload.metadata.units },
      {
        label: 'Matrices',
        value: payload.matrices.technical_coefficients.length > 0 ? 'Present' : 'Unavailable',
      },
      { label: 'Source title', value: payload.metadata.source_title },
    ],
    consumers: [CONSUMER_LINKS.scenarioLab, CONSUMER_LINKS.comparison, CONSUMER_LINKS.modelExplorer],
    issues: caveatsToIssues(payload.caveats),
  }
}

function createArtifactBase(
  id: ImplementedModelId,
  artifactPath: string,
  modelArea: string,
): RegistryArtifact {
  return {
    id,
    artifactPath,
    modelArea,
    modelExplorerHref: '/model-explorer',
    status: 'unavailable',
    statusDetail: 'Artifact has not been loaded.',
    dataVintage: DASH,
    exportTimestamp: DASH,
    sourceArtifact: DASH,
    sourceVintage: DASH,
    solverVersion: DASH,
    caveatCount: 0,
    highestCaveatSeverity: 'none',
    facts: [],
    consumers: [CONSUMER_LINKS.modelExplorer],
    issues: [],
  }
}

function artifactFromFailure(base: RegistryArtifact, result: Exclude<LoadedArtifact, { status: 'loaded' }>): RegistryArtifact {
  return {
    ...base,
    status: result.status,
    statusDetail: result.detail,
    issues: result.issues,
  }
}

function buildPlannedRows(): RegistryRow[] {
  return [
    {
      id: 'pe',
      label: 'PE Trade Shock',
      domain: 'PE trade flows',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No public PE input contract yet',
      notes: 'Planned/disabled model family; absence is not a missing implemented artifact.',
      modelExplorerHref: '/model-explorer',
    },
    {
      id: 'cge',
      label: 'CGE Reform Shock',
      domain: 'CGE SAM / reform inputs',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No calibrated SAM bridge contract yet',
      notes: 'Planned/disabled model family; no CGE computation or data contract is active.',
      modelExplorerHref: '/model-explorer',
    },
    {
      id: 'fpp',
      label: 'FPP Fiscal Path',
      domain: 'FPP fiscal series',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No public fiscal path input contract yet',
      notes: 'Planned/disabled model family; fiscal bridge is not implemented in this foundation bundle.',
      modelExplorerHref: '/model-explorer',
    },
  ]
}

function toDataSourceRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    label: artifact.modelArea,
    domain:
      artifact.id === 'qpm'
        ? 'Macro/QPM inputs'
        : artifact.id === 'dfm'
          ? 'DFM indicators'
          : 'I-O table',
    status: artifact.status,
    dataVintage: artifact.sourceVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceArtifact,
    notes:
      artifact.id === 'io'
        ? 'Structural base-year source table; not automatically stale because the official table is vintage-specific.'
        : artifact.statusDetail,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toModelInputRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    label:
      artifact.id === 'qpm'
        ? 'QPM / Macro Scenario'
        : artifact.id === 'dfm'
          ? 'DFM Nowcast'
          : 'I-O Sector Shock',
    domain: artifact.modelArea,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.artifactPath,
    notes:
      artifact.id === 'dfm'
        ? 'Source vintage, artifact export, and frontend validation check are separate; no live scheduler status is claimed.'
        : artifact.id === 'io'
          ? 'Consumed as sector transmission analytics; guard checks validate artifact shape, not model economics.'
          : 'Public bridge exists; guard checks validate artifact shape, not macro-model calibration.',
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toPlannedModelInputRow(row: RegistryRow): RegistryRow {
  return {
    ...row,
    dataVintage: 'Unavailable until contract exists',
    source: 'Planned/disabled',
  }
}

function toVintageRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    label: artifact.modelArea,
    domain: artifact.artifactPath,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceVintage,
    notes:
      artifact.id === 'dfm'
        ? 'Shows JSON export timestamp and upstream source-artifact refit timestamp separately.'
        : artifact.id === 'io'
          ? 'Source vintage is the base-year table; export timestamp is the deterministic public JSON build.'
          : 'Uses ModelAttribution.data_version and artifact export timestamp.',
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toUpdateStatusRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    label: artifact.artifactPath,
    domain: artifact.modelArea,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceArtifact,
    notes:
      artifact.status === 'valid' || artifact.status === 'warning'
        ? 'Last validation check is this frontend registry generation; no live scheduler status is claimed.'
        : artifact.statusDetail,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function buildWarnings(artifacts: RegistryArtifact[], plannedRows: RegistryRow[]): RegistryWarning[] {
  const artifactWarnings = artifacts.flatMap((artifact) => {
    const statusWarnings =
      artifact.status === 'valid'
        ? []
        : [
            {
              id: `${artifact.id}-${artifact.status}`,
              status: artifact.status,
              title: `${artifact.modelArea}: ${artifact.status}`,
              detail: artifact.statusDetail,
            },
          ]
    const issueWarnings = artifact.issues.map((issue) => ({
      id: `${artifact.id}-${issue.path}-${issue.message}`,
      status: issue.severity === 'error' ? artifact.status : 'warning',
      title: `${artifact.modelArea}: ${issue.path}`,
      detail: issue.message,
    }))
    return [...statusWarnings, ...issueWarnings]
  })

  const plannedWarnings = plannedRows.map((row) => ({
    id: `${row.id}-planned`,
    status: 'planned' as RegistryStatus,
    title: `${row.label}: planned`,
    detail: row.notes,
  }))

  return [...artifactWarnings, ...plannedWarnings]
}

function countStatuses(items: Array<{ status: RegistryStatus }>): Record<RegistryStatus, number> {
  return items.reduce<Record<RegistryStatus, number>>(
    (counts, item) => {
      counts[item.status] += 1
      return counts
    },
    { valid: 0, warning: 0, failed: 0, missing: 0, unavailable: 0, planned: 0 },
  )
}

function getHighestCaveatSeverity(caveats: Array<{ severity: CaveatSeverity }>): CaveatSeverity | 'none' {
  if (caveats.some((caveat) => caveat.severity === 'critical')) return 'critical'
  if (caveats.some((caveat) => caveat.severity === 'warning')) return 'warning'
  if (caveats.some((caveat) => caveat.severity === 'info')) return 'info'
  return 'none'
}

function caveatsToIssues(caveats: Array<{ severity: CaveatSeverity; caveat_id: string; message: string }>): RegistryIssue[] {
  return caveats
    .filter((caveat) => caveat.severity === 'warning' || caveat.severity === 'critical')
    .map((caveat) => ({
      path: caveat.caveat_id,
      message: caveat.message,
      severity: caveat.severity === 'critical' ? 'error' : 'warning',
    }))
}

function getDfmStaleIssue(exportedAt: string, now: Date): RegistryIssue | null {
  const exportedTime = new Date(exportedAt).getTime()
  if (!Number.isFinite(exportedTime)) {
    return {
      path: 'metadata.exported_at',
      message: 'DFM export timestamp is invalid; freshness cannot be assessed.',
      severity: 'warning',
    }
  }

  const ageHours = (now.getTime() - exportedTime) / (1000 * 60 * 60)
  if (ageHours >= DFM_STALE_CRITICAL_HOURS) {
    return {
      path: 'metadata.exported_at',
      message: 'DFM JSON export is older than 7 days.',
      severity: 'error',
    }
  }
  if (ageHours >= DFM_STALE_WARNING_HOURS) {
    return {
      path: 'metadata.exported_at',
      message: 'DFM JSON export is older than 48 hours.',
      severity: 'warning',
    }
  }
  return null
}
