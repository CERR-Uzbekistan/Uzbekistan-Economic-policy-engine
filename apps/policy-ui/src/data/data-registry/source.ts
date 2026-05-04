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
import {
  fetchOverviewArtifact,
  OverviewArtifactTransportError,
  OverviewArtifactValidationError,
} from '../overview/artifact-client.js'
import type { OverviewArtifact } from '../overview/artifact-types.js'
import { OVERVIEW_TOP_CARD_METRIC_IDS } from '../overview/artifact-types.js'
import {
  fetchRegistryApiMetadata,
  isRegistryApiEnabled,
  type RegistryApiArtifact,
} from './api-client.js'

export type RegistryStatus = 'valid' | 'warning' | 'failed' | 'missing' | 'unavailable' | 'planned'
export type RegistryRecordKind = 'source_series' | 'model_input' | 'bridge_output' | 'planned_artifact'
export type RegistryFilter = 'all' | 'active' | 'warnings' | 'planned' | 'missingUnavailable'
export type ImplementedModelId = 'overview' | 'qpm' | 'dfm' | 'io'
export type PlannedModelId = 'hfi' | 'pe' | 'cge' | 'fpp'
export type RegistryModelId = ImplementedModelId | PlannedModelId

export type RegistryIssue = {
  path: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export type RegistryArtifact = {
  id: ImplementedModelId
  registryType: 'bridge_output'
  artifactPath: string
  modelArea: string
  modelExplorerHref: string
  status: RegistryStatus
  statusDetail: string
  owner: string
  sourceSystem: string
  dataVintage: string
  exportTimestamp: string
  sourceArtifact: string
  sourceVintage: string
  solverVersion: string
  caveatCount: number
  highestCaveatSeverity: CaveatSeverity | 'none'
  validationScope: string
  freshnessRule: string
  caveatsSummary: string
  sourceExportExplanation: string
  checksum?: string
  metadataGeneratedAt?: string
  facts: Array<{ label: string; value: string }>
  consumers: Array<{ label: string; href: string }>
  issues: RegistryIssue[]
}

export type RegistryRow = {
  id: RegistryModelId
  registryType: RegistryRecordKind
  label: string
  domain: string
  status: RegistryStatus
  dataVintage: string
  exportTimestamp: string
  source: string
  owner: string
  sourceSystem: string
  notes: string
  validationScope: string
  freshnessRule: string
  caveats: string
  sourceExportExplanation: string
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
  metadataSource: 'api' | 'static-fallback'
  summaryCounts: Record<RegistryStatus, number>
  artifacts: RegistryArtifact[]
  dataSources: RegistryRow[]
  modelInputs: RegistryRow[]
  bridgeOutputs: RegistryRow[]
  plannedArtifacts: RegistryRow[]
  vintages: RegistryRow[]
  updateStatuses: RegistryRow[]
  warnings: RegistryWarning[]
}

export const REGISTRY_FILTERS: RegistryFilter[] = [
  'all',
  'active',
  'warnings',
  'planned',
  'missingUnavailable',
]

type LoadedArtifact =
  | { status: 'loaded'; payload: QpmBridgePayload | DfmBridgePayload | IoBridgePayload | OverviewArtifact }
  | { status: 'failed' | 'missing' | 'unavailable'; detail: string; issues: RegistryIssue[] }

const DASH = 'Not carried in public artifact'
const DFM_STALE_WARNING_HOURS = 48
const DFM_STALE_CRITICAL_HOURS = 24 * 7
const OVERVIEW_TOP_CARD_METRIC_ID_SET: ReadonlySet<string> = new Set(OVERVIEW_TOP_CARD_METRIC_IDS)

const CONSUMER_LINKS = {
  overview: { label: 'Overview', href: '/overview' },
  scenarioLab: { label: 'Scenario Lab', href: '/scenario-lab' },
  comparison: { label: 'Comparison', href: '/comparison' },
  modelExplorer: { label: 'Model Explorer', href: '/model-explorer' },
  dataRegistry: { label: 'Data Registry', href: '/data-registry' },
} as const

export function getInitialDataRegistry(): DataRegistry {
  return buildDataRegistry({
    overview: { status: 'unavailable', detail: 'Loading /data/overview.json.', issues: [] },
    qpm: { status: 'unavailable', detail: 'Loading /data/qpm.json.', issues: [] },
    dfm: { status: 'unavailable', detail: 'Loading /data/dfm.json.', issues: [] },
    io: { status: 'unavailable', detail: 'Loading /data/io.json.', issues: [] },
    now: new Date(),
    metadataSource: 'static-fallback',
  })
}

export async function loadDataRegistry(fetchImpl: FetchLike = fetch, now = new Date()): Promise<DataRegistry> {
  const [apiMetadata, overview, qpm, dfm, io] = await Promise.all([
    loadRegistryApiMetadata(fetchImpl),
    loadOverviewArtifact(fetchImpl),
    loadQpmArtifact(fetchImpl),
    loadDfmArtifact(fetchImpl),
    loadIoArtifact(fetchImpl),
  ])

  return buildDataRegistry({
    overview,
    qpm,
    dfm,
    io,
    now,
    apiMetadata,
    metadataSource: apiMetadata ? 'api' : 'static-fallback',
  })
}

export function buildDataRegistry(options: {
  overview?: LoadedArtifact
  qpm: LoadedArtifact
  dfm: LoadedArtifact
  io: LoadedArtifact
  now: Date
  apiMetadata?: RegistryApiArtifact[] | null
  metadataSource?: DataRegistry['metadataSource']
}): DataRegistry {
  const artifacts = applyApiMetadata([
    buildOverviewArtifact(options.overview ?? {
      status: 'missing',
      detail: 'Overview artifact is planned, but /data/overview.json is absent. Overview uses static fallback.',
      issues: [],
    }),
    buildQpmArtifact(options.qpm),
    buildDfmArtifact(options.dfm, options.now),
    buildIoArtifact(options.io),
  ], options.apiMetadata ?? null)

  return assembleDataRegistry({
    generatedAt: options.now.toISOString(),
    metadataSource: options.metadataSource ?? 'static-fallback',
    artifacts,
  })
}

function assembleDataRegistry(options: {
  generatedAt: string
  metadataSource: DataRegistry['metadataSource']
  artifacts: RegistryArtifact[]
}): DataRegistry {
  const artifacts = options.artifacts
  const plannedRows = buildPlannedRows()
  const dataSources = [...artifacts.map(toDataSourceRow), ...plannedRows]
  const modelInputs = [...artifacts.map(toModelInputRow), ...plannedRows.map(toPlannedModelInputRow)]
  const bridgeOutputs = artifacts.map(toBridgeOutputRow)
  const plannedArtifacts = plannedRows.map(toPlannedArtifactRow)
  const vintages = artifacts.map(toVintageRow)
  const updateStatuses = artifacts.map(toUpdateStatusRow)
  const warnings = buildWarnings(artifacts, plannedRows)
  const summaryCounts = countStatuses([...artifacts, ...plannedRows])

  return {
    generatedAt: options.generatedAt,
    metadataSource: options.metadataSource,
    summaryCounts,
    artifacts,
    dataSources,
    modelInputs,
    bridgeOutputs,
    plannedArtifacts,
    vintages,
    updateStatuses,
    warnings,
  }
}

export function getFilteredRegistry(registry: DataRegistry, filter: RegistryFilter): DataRegistry {
  if (filter === 'all') return registry

  const artifacts = registry.artifacts.filter((artifact) => matchesRegistryFilter(artifact.status, filter))
  const dataSources = registry.dataSources.filter((row) => matchesRegistryFilter(row.status, filter))
  const modelInputs = registry.modelInputs.filter((row) => matchesRegistryFilter(row.status, filter))
  const bridgeOutputs = registry.bridgeOutputs.filter((row) => matchesRegistryFilter(row.status, filter))
  const plannedArtifacts = registry.plannedArtifacts.filter((row) => matchesRegistryFilter(row.status, filter))
  const vintages = registry.vintages.filter((row) => matchesRegistryFilter(row.status, filter))
  const updateStatuses = registry.updateStatuses.filter((row) => matchesRegistryFilter(row.status, filter))
  const warnings = registry.warnings.filter((warning) => matchesRegistryFilter(warning.status, filter))

  return {
    ...registry,
    artifacts,
    dataSources,
    modelInputs,
    bridgeOutputs,
    plannedArtifacts,
    vintages,
    updateStatuses,
    warnings,
  }
}

export function matchesRegistryFilter(status: RegistryStatus, filter: RegistryFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'valid' || status === 'warning'
  if (filter === 'warnings') return status === 'warning'
  if (filter === 'planned') return status === 'planned'
  return status === 'failed' || status === 'missing' || status === 'unavailable'
}

async function loadRegistryApiMetadata(fetchImpl: FetchLike): Promise<RegistryApiArtifact[] | null> {
  if (!isRegistryApiEnabled()) return null

  try {
    const response = await fetchRegistryApiMetadata(fetchImpl)
    return response.artifacts
  } catch {
    return null
  }
}

async function loadOverviewArtifact(fetchImpl: FetchLike): Promise<LoadedArtifact> {
  try {
    return { status: 'loaded', payload: await fetchOverviewArtifact(fetchImpl) }
  } catch (error) {
    if (error instanceof OverviewArtifactValidationError) {
      return {
        status: 'failed',
        detail: 'Overview artifact loaded but failed locked metric guard checks; Overview will use static fallback.',
        issues: error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          severity: issue.severity,
        })),
      }
    }

    if (error instanceof OverviewArtifactTransportError) {
      const isMissing = error.kind === 'http' && error.status === 404
      return {
        status: isMissing ? 'missing' : 'unavailable',
        detail: isMissing
          ? 'Overview artifact is planned, but /data/overview.json is absent. Overview uses static fallback.'
          : 'Overview artifact could not be fetched; Overview uses static fallback.',
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
      detail: 'Overview artifact could not be loaded; Overview uses static fallback.',
      issues: [
        {
          path: 'artifact',
          message: error instanceof Error ? error.message : 'Unknown Overview artifact load failure.',
          severity: 'error',
        },
      ],
    }
  }
}

function applyApiMetadata(
  artifacts: RegistryArtifact[],
  apiMetadata: RegistryApiArtifact[] | null,
): RegistryArtifact[] {
  if (!apiMetadata) return artifacts

  const metadataById = new Map(apiMetadata.map((metadata) => [metadata.id, metadata]))
  return artifacts.map((artifact) => {
    if (artifact.id === 'overview') return artifact
    const metadata = metadataById.get(artifact.id)
    if (!metadata) return artifact

    return {
      ...artifact,
      artifactPath: metadata.artifact_path,
      sourceArtifact: metadata.source_artifact ?? artifact.sourceArtifact,
      sourceVintage: metadata.source_vintage ?? artifact.sourceVintage,
      dataVintage: metadata.data_vintage ?? artifact.dataVintage,
      exportTimestamp: metadata.exported_at ?? artifact.exportTimestamp,
      status: mergeRegistryStatus(artifact.status, metadata.guard_status),
      checksum: metadata.checksum,
      metadataGeneratedAt: metadata.generated_at ?? undefined,
    }
  })
}

function mergeRegistryStatus(
  staticStatus: RegistryStatus,
  apiStatus: Extract<RegistryStatus, 'valid' | 'warning' | 'failed'>,
): RegistryStatus {
  const severityOrder: Record<RegistryStatus, number> = {
    valid: 0,
    planned: 0,
    warning: 1,
    unavailable: 2,
    missing: 2,
    failed: 3,
  }
  return severityOrder[apiStatus] > severityOrder[staticStatus] ? apiStatus : staticStatus
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

function summarizeMetricPeriods(payload: OverviewArtifact): string {
  const periods = Array.from(new Set(payload.metrics.map((metric) => metric.source_period))).filter(Boolean)
  if (periods.length === 0) return DASH
  if (periods.length <= 3) return periods.join(', ')
  return `${periods.slice(0, 3).join(', ')} + ${periods.length - 3} more`
}

function buildOverviewArtifact(result: LoadedArtifact): RegistryArtifact {
  const base = createArtifactBase('overview', '/data/overview.json', 'Operational Overview')
  if (result.status !== 'loaded') return artifactFromFailure(base, result)

  const payload = result.payload as OverviewArtifact
  const issueWarnings = payload.warnings.map((message, index) => ({
    path: `warnings[${index}]`,
    message,
    severity: 'warning' as const,
  }))
  const caveatIssues = payload.caveats.map((message, index) => ({
    path: `caveats[${index}]`,
    message,
    severity: 'warning' as const,
  }))
  const metricWarningIssues = payload.metrics.flatMap((metric) =>
    metric.warnings.map((message, index) => ({
      path: `${metric.id}.warnings[${index}]`,
      message,
      severity: 'warning' as const,
    })),
  )
  const issues = [...issueWarnings, ...caveatIssues, ...metricWarningIssues]
  const status = payload.validation_status === 'warning' || issues.length > 0 ? 'warning' : 'valid'
  const sourceLabels = Array.from(new Set(payload.metrics.map((metric) => metric.source_label))).slice(0, 3)
  const topCardCount = payload.metrics.filter((metric) =>
    metric.top_card === true || OVERVIEW_TOP_CARD_METRIC_ID_SET.has(metric.id),
  ).length

  return {
    ...base,
    status,
    statusDetail:
      'Artifact guard-checked by Overview locked-metric guards; this is not economic or model validation.',
    owner: 'CERR macro monitoring team',
    sourceSystem: 'overview_artifact',
    dataVintage: summarizeMetricPeriods(payload),
    exportTimestamp: payload.exported_at,
    sourceArtifact: '/data/overview.json',
    sourceVintage: summarizeMetricPeriods(payload),
    solverVersion: 'n/a',
    caveatCount: payload.caveats.length + payload.metrics.reduce((count, metric) => count + metric.caveats.length, 0),
    highestCaveatSeverity: issues.length > 0 ? 'warning' : 'none',
    validationScope:
      'Frontend guard checks schema version, all 17 locked metric ids, claim type, unit, frequency, source labels, source periods, top-card ordering, and validation status.',
    freshnessRule:
      'Metric-level stale rules are carried as warnings from the artifact; the frontend does not crawl sources or refresh the artifact.',
    caveatsSummary:
      issues.length > 0
        ? `${issues.length} artifact warning(s) or caveat(s) are carried.`
        : 'No artifact caveats or warnings carried in the public JSON.',
    sourceExportExplanation:
      'Source period identifies each published metric period; artifact export is the generated overview.json timestamp consumed by the UI.',
    facts: [
      { label: 'Locked metrics', value: String(payload.metrics.length) },
      { label: 'Top-card candidates', value: String(Math.min(topCardCount, 8)) },
      { label: 'Source labels', value: sourceLabels.join(', ') || DASH },
    ],
    consumers: [CONSUMER_LINKS.overview, CONSUMER_LINKS.dataRegistry],
    issues,
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
    statusDetail: 'Artifact guard-checked by QPM frontend shape guards; this is not economic or model validation.',
    owner: 'CERR macro modeling team',
    sourceSystem: payload.attribution.module,
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.attribution.module,
    sourceVintage: payload.attribution.data_version,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: highestSeverity,
    validationScope: 'Frontend guard checks QPM attribution, scenarios, parameters, caveats, and metadata shape.',
    freshnessRule: 'Uses ModelAttribution.data_version and artifact export timestamp; no frontend refresh or scheduler status is claimed.',
    caveatsSummary: summarizeCaveats(payload.caveats),
    sourceExportExplanation: 'Source vintage identifies the model input snapshot; artifact export is the public JSON build consumed by the UI.',
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
      CONSUMER_LINKS.dataRegistry,
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
    statusDetail: 'Artifact guard-checked by DFM frontend shape guards; this is not economic or model validation.',
    owner: 'CERR nowcasting team',
    sourceSystem: payload.attribution.module,
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.metadata.source_artifact,
    sourceVintage: payload.metadata.source_artifact_exported_at,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: staleIssue?.severity === 'error' ? 'critical' : highestSeverity,
    validationScope: 'Frontend guard checks DFM attribution, nowcast periods, factor state, indicators, caveats, and metadata shape.',
    freshnessRule: 'DFM JSON export older than 48 hours is a warning; older than 7 days is escalated. Upstream refit timestamp is separate.',
    caveatsSummary: summarizeCaveats(payload.caveats, staleIssue),
    sourceExportExplanation: 'Source artifact timestamp is the upstream DFM data/refit vintage; artifact export is the generated public JSON.',
    facts: [
      { label: 'Current quarter', value: payload.nowcast.current_quarter.period },
      { label: 'Indicators', value: String(payload.indicators.length) },
      { label: 'Factor convergence', value: payload.factor.converged ? 'Converged' : 'Not converged' },
    ],
    consumers: [CONSUMER_LINKS.overview, CONSUMER_LINKS.modelExplorer, CONSUMER_LINKS.dataRegistry],
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
    statusDetail: 'Artifact guard-checked by I-O frontend shape guards; this is not economic or model validation.',
    owner: 'CERR structural analysis team',
    sourceSystem: payload.metadata.source,
    dataVintage: payload.attribution.data_version,
    exportTimestamp: payload.metadata.exported_at,
    sourceArtifact: payload.metadata.source_artifact,
    sourceVintage: `Base-year vintage ${payload.metadata.base_year}`,
    solverVersion: payload.metadata.solver_version,
    caveatCount: payload.caveats.length,
    highestCaveatSeverity: highestSeverity,
    validationScope: 'Frontend guard checks I-O attribution, sector records, matrices, totals, caveats, and metadata shape.',
    freshnessRule: 'I-O 2022 is treated as a structural base-year vintage, not automatically stale because the source table is vintage-specific.',
    caveatsSummary: summarizeCaveats(payload.caveats),
    sourceExportExplanation: 'Source vintage is the official base-year table; artifact export is the deterministic public JSON build used by the app.',
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
    consumers: [
      CONSUMER_LINKS.scenarioLab,
      CONSUMER_LINKS.comparison,
      CONSUMER_LINKS.modelExplorer,
      CONSUMER_LINKS.dataRegistry,
    ],
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
    registryType: 'bridge_output',
    artifactPath,
    modelArea,
    modelExplorerHref: '/model-explorer',
    status: 'unavailable',
    statusDetail: 'Artifact has not been loaded.',
    owner: DASH,
    sourceSystem: DASH,
    dataVintage: DASH,
    exportTimestamp: DASH,
    sourceArtifact: DASH,
    sourceVintage: DASH,
    solverVersion: DASH,
    caveatCount: 0,
    highestCaveatSeverity: 'none',
    validationScope: 'Frontend artifact load has not completed, so guard scope is unavailable.',
    freshnessRule: 'Freshness cannot be assessed until the artifact is loaded.',
    caveatsSummary: 'No caveats are visible until the artifact is loaded.',
    sourceExportExplanation: 'Source vintage and artifact export are unavailable until the public JSON artifact loads.',
    facts: [],
    consumers: id === 'overview' ? [CONSUMER_LINKS.overview, CONSUMER_LINKS.dataRegistry] : [CONSUMER_LINKS.modelExplorer],
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
      id: 'hfi',
      registryType: 'planned_artifact',
      label: 'High-frequency indicators',
      domain: 'HFI source series',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'Unavailable by design until a source inventory and static artifact contract are accepted',
      source: 'No public HFI artifact or chart data is included in this slice',
      owner: 'Owner to be assigned during HFI source-inventory work',
      sourceSystem: 'Planned source inventory',
      notes: 'Planned/unavailable category for later nowcasting support; no HFI values, charts, live refresh, or DFM refit are implemented.',
      validationScope: 'No guard scope exists yet because no HFI artifact contract has been accepted.',
      freshnessRule: 'Freshness rules will be defined in the future HFI contract; this registry does not refresh data.',
      caveats: 'Unavailable by design, not a failed artifact.',
      sourceExportExplanation: 'A future HFI source vintage will differ from a future frontend artifact export timestamp.',
      modelExplorerHref: '/model-explorer',
    },
    {
      id: 'pe',
      registryType: 'planned_artifact',
      label: 'PE Trade Shock',
      domain: 'PE trade flows',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No public PE input contract yet',
      owner: 'Owner to be assigned during PE contract work',
      sourceSystem: 'Planned trade-flow source inventory',
      notes: 'Planned/disabled model family; absence is not a missing implemented artifact.',
      validationScope: 'No PE guard scope exists because no trade-flow artifact contract is active.',
      freshnessRule: 'Freshness unavailable until a PE source contract exists.',
      caveats: 'Planned/disabled; no PE computation or data contract is active.',
      sourceExportExplanation: 'No source vintage or artifact export exists for PE in this frontend foundation.',
      modelExplorerHref: '/model-explorer',
    },
    {
      id: 'cge',
      registryType: 'planned_artifact',
      label: 'CGE Reform Shock',
      domain: 'CGE SAM / reform inputs',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No calibrated SAM bridge contract yet',
      owner: 'Owner to be assigned during CGE contract work',
      sourceSystem: 'Planned SAM/source inventory',
      notes: 'Planned/disabled model family; no CGE computation or data contract is active.',
      validationScope: 'No CGE guard scope exists because no SAM/model artifact contract is active.',
      freshnessRule: 'Freshness unavailable until a CGE source contract exists.',
      caveats: 'Planned/disabled; no CGE computation or calibrated SAM is active.',
      sourceExportExplanation: 'No source vintage or artifact export exists for CGE in this frontend foundation.',
      modelExplorerHref: '/model-explorer',
    },
    {
      id: 'fpp',
      registryType: 'planned_artifact',
      label: 'FPP Fiscal Path',
      domain: 'FPP fiscal series',
      status: 'planned',
      dataVintage: 'Planned',
      exportTimestamp: 'No Sprint 4 foundation artifact by design',
      source: 'No public fiscal path input contract yet',
      owner: 'Owner to be assigned during FPP contract work',
      sourceSystem: 'Planned fiscal source inventory',
      notes: 'Planned/disabled model family; fiscal bridge is not implemented in this foundation bundle.',
      validationScope: 'No FPP guard scope exists because no fiscal-series artifact contract is active.',
      freshnessRule: 'Freshness unavailable until an FPP fiscal source contract exists.',
      caveats: 'Planned/disabled; no fiscal path computation or data contract is active.',
      sourceExportExplanation: 'No source vintage or artifact export exists for FPP in this frontend foundation.',
      modelExplorerHref: '/model-explorer',
    },
  ]
}

function toDataSourceRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    registryType: 'source_series',
    label: artifact.modelArea,
    domain: getArtifactSourceDomain(artifact.id),
    status: artifact.status,
    dataVintage: artifact.sourceVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceArtifact,
    owner: artifact.owner,
    sourceSystem: artifact.sourceSystem,
    notes:
      artifact.id === 'overview'
        ? 'Planned operational source artifact for Overview headline metrics; static fallback remains active when missing or invalid.'
        : artifact.id === 'io'
        ? 'Structural base-year source table; not automatically stale because the official table is vintage-specific.'
        : artifact.statusDetail,
    validationScope: artifact.validationScope,
    freshnessRule: artifact.freshnessRule,
    caveats: artifact.caveatsSummary,
    sourceExportExplanation: artifact.sourceExportExplanation,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toModelInputRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    registryType: 'model_input',
    label: getArtifactInputLabel(artifact.id),
    domain: artifact.modelArea,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.artifactPath,
    owner: artifact.owner,
    sourceSystem: artifact.sourceSystem,
    notes:
      artifact.id === 'overview'
        ? 'Overview consumes /data/overview.json when valid and falls back to the static snapshot when the artifact is missing or invalid.'
        : artifact.id === 'dfm'
        ? 'Source vintage, artifact export, and frontend validation check are separate; no live scheduler status is claimed.'
        : artifact.id === 'io'
          ? 'Consumed as sector transmission analytics; guard checks validate artifact shape, not model economics.'
          : 'Public bridge exists; guard checks validate artifact shape, not macro-model calibration.',
    validationScope: artifact.validationScope,
    freshnessRule: artifact.freshnessRule,
    caveats: artifact.caveatsSummary,
    sourceExportExplanation: artifact.sourceExportExplanation,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toPlannedModelInputRow(row: RegistryRow): RegistryRow {
  return {
    ...row,
    registryType: 'model_input',
    dataVintage: 'Unavailable until contract exists',
    source: 'Planned/disabled',
  }
}

function getArtifactSourceDomain(id: ImplementedModelId): string {
  if (id === 'overview') return 'Operational overview metrics'
  if (id === 'qpm') return 'Macro/QPM inputs'
  if (id === 'dfm') return 'DFM indicators'
  return 'I-O table'
}

function getArtifactInputLabel(id: ImplementedModelId): string {
  if (id === 'overview') return 'Overview operational figures'
  if (id === 'qpm') return 'QPM / Macro Scenario'
  if (id === 'dfm') return 'DFM Nowcast'
  return 'I-O Sector Shock'
}

function toBridgeOutputRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    registryType: 'bridge_output',
    label: artifact.artifactPath,
    domain: artifact.modelArea,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceArtifact,
    owner: artifact.owner,
    sourceSystem: artifact.sourceSystem,
    notes: artifact.statusDetail,
    validationScope: artifact.validationScope,
    freshnessRule: artifact.freshnessRule,
    caveats: artifact.caveatsSummary,
    sourceExportExplanation: artifact.sourceExportExplanation,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toPlannedArtifactRow(row: RegistryRow): RegistryRow {
  return {
    ...row,
    registryType: 'planned_artifact',
  }
}

function toVintageRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    registryType: 'bridge_output',
    label: artifact.modelArea,
    domain: artifact.artifactPath,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceVintage,
    owner: artifact.owner,
    sourceSystem: artifact.sourceSystem,
    notes:
      artifact.id === 'overview'
        ? 'Each Overview metric carries a source period; the artifact export timestamp is separate from those source periods.'
        : artifact.id === 'dfm'
        ? 'Shows JSON export timestamp and upstream source-artifact refit timestamp separately.'
        : artifact.id === 'io'
          ? 'Source vintage is the base-year table; export timestamp is the deterministic public JSON build.'
        : 'Uses ModelAttribution.data_version and artifact export timestamp.',
    validationScope: artifact.validationScope,
    freshnessRule: artifact.freshnessRule,
    caveats: artifact.caveatsSummary,
    sourceExportExplanation: artifact.sourceExportExplanation,
    modelExplorerHref: artifact.modelExplorerHref,
  }
}

function toUpdateStatusRow(artifact: RegistryArtifact): RegistryRow {
  return {
    id: artifact.id,
    registryType: 'bridge_output',
    label: artifact.artifactPath,
    domain: artifact.modelArea,
    status: artifact.status,
    dataVintage: artifact.dataVintage,
    exportTimestamp: artifact.exportTimestamp,
    source: artifact.sourceArtifact,
    owner: artifact.owner,
    sourceSystem: artifact.sourceSystem,
    notes:
      artifact.status === 'valid' || artifact.status === 'warning'
        ? 'Last validation check is this frontend registry generation; no live scheduler status is claimed.'
        : artifact.statusDetail,
    validationScope: artifact.validationScope,
    freshnessRule: artifact.freshnessRule,
    caveats: artifact.caveatsSummary,
    sourceExportExplanation: artifact.sourceExportExplanation,
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

function summarizeCaveats(
  caveats: Array<{ severity: CaveatSeverity }>,
  staleIssue?: RegistryIssue | null,
): string {
  const highestSeverity = getHighestCaveatSeverity(caveats)
  const staleText = staleIssue ? `; freshness warning: ${staleIssue.message}` : ''
  if (caveats.length === 0) return `No artifact caveats carried in the public JSON${staleText}.`
  return `${caveats.length} artifact caveat(s); highest severity ${highestSeverity}${staleText}.`
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
