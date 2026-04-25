import type {
  Assumption,
  ChartAxis,
  ChartSpec,
  HeadlineMetric,
  ModelAttribution,
  Scenario,
  ScenarioLabInterpretation,
  ScenarioLabInterpretationMetadata,
  ScenarioLabResultTab,
  SuggestedNextScenario,
  ScenarioType,
} from '../contracts/data-contract'

// v2 key prefix. v1 entries under `policy-ui:scenario:` are intentionally left untouched —
// no silent migration; they sit inert until manually cleared. The store only reads/writes v2.
const SCENARIO_KEY_PREFIX = 'policy-ui:scenario.v2:'
const SESSION_ID_KEY = 'policy-ui:session-id'
const STORE_EVENT = 'policy-ui:scenario-store-updated'
let cachedSnapshot: SavedScenarioRecord[] = []
let snapshotVersion = 0
let cachedSnapshotVersion = -1

type ScenarioWithDataVersion = Scenario & {
  data_version: string
}

// Interpretation as emitted by the Scenario Lab source pipeline. Governance fields
// are supported only through typed metadata, not legacy top-level fields.
export type PersistedScenarioInterpretation = ScenarioLabInterpretation & {
  metadata: ScenarioLabInterpretationMetadata
}

export type PersistedRunResults = {
  headline_metrics: HeadlineMetric[]
  charts_by_tab: Record<ScenarioLabResultTab, ChartSpec>
}

export type SavedScenarioRecord = ScenarioWithDataVersion & {
  stored_at: string
  // Optional output snapshot fields (run artifact). Absent on records that predate the snapshot
  // feature or were saved without a successful run having produced results.
  run_id?: string
  run_saved_at?: string
  run_results?: PersistedRunResults
  run_interpretation?: PersistedScenarioInterpretation
  run_attribution?: ModelAttribution[]
}

export type { ScenarioWithDataVersion }

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

function getStorage(): StorageLike | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
}

function isScenarioType(value: unknown): value is ScenarioType {
  return value === 'baseline' || value === 'alternative' || value === 'stress'
}

function isAssumption(value: unknown): value is Assumption {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<Assumption>
  const assumptionValueType = typeof candidate.value
  const isValidValueType =
    assumptionValueType === 'number' || assumptionValueType === 'string' || assumptionValueType === 'boolean'
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.label === 'string' &&
    isValidValueType &&
    typeof candidate.unit === 'string' &&
    (candidate.category === 'macro' ||
      candidate.category === 'external' ||
      candidate.category === 'fiscal' ||
      candidate.category === 'trade' ||
      candidate.category === 'advanced') &&
    (candidate.technical_variable === null || typeof candidate.technical_variable === 'string')
  )
}

function isModelAttribution(value: unknown): value is ModelAttribution {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<ModelAttribution>
  return (
    typeof candidate.model_id === 'string' &&
    typeof candidate.model_name === 'string' &&
    typeof candidate.module === 'string' &&
    typeof candidate.version === 'string' &&
    typeof candidate.run_id === 'string' &&
    typeof candidate.data_version === 'string' &&
    typeof candidate.timestamp === 'string'
  )
}

function isHeadlineMetric(value: unknown): value is HeadlineMetric {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<HeadlineMetric>
  return (
    typeof candidate.metric_id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.value === 'number' &&
    typeof candidate.unit === 'string' &&
    typeof candidate.period === 'string' &&
    typeof candidate.last_updated === 'string' &&
    Array.isArray(candidate.model_attribution) &&
    candidate.model_attribution.every(isModelAttribution)
  )
}

function isChartAxis(value: unknown): value is ChartAxis {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<ChartAxis>
  return (
    typeof candidate.label === 'string' &&
    typeof candidate.unit === 'string' &&
    Array.isArray(candidate.values)
  )
}

function isChartSpec(value: unknown): value is ChartSpec {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<ChartSpec>
  return (
    typeof candidate.chart_id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    typeof candidate.chart_type === 'string' &&
    isChartAxis(candidate.x) &&
    isChartAxis(candidate.y) &&
    Array.isArray(candidate.series) &&
    Array.isArray(candidate.uncertainty) &&
    typeof candidate.takeaway === 'string' &&
    Array.isArray(candidate.model_attribution) &&
    candidate.model_attribution.every(isModelAttribution)
  )
}

// ScenarioLabResultTab is a closed set of four tab ids. The ResultsPanel dereferences
// charts_by_tab[activeTab] unguarded, so a persisted snapshot missing any of these
// tabs would crash the page on navigation. Require the full set at validation time.
const REQUIRED_CHART_TABS: readonly ScenarioLabResultTab[] = [
  'headline_impact',
  'macro_path',
  'external_balance',
  'fiscal_effects',
]

function isPersistedRunResults(value: unknown): value is PersistedRunResults {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<PersistedRunResults>
  if (!Array.isArray(candidate.headline_metrics) || !candidate.headline_metrics.every(isHeadlineMetric)) {
    return false
  }
  if (typeof candidate.charts_by_tab !== 'object' || candidate.charts_by_tab === null) {
    return false
  }
  const chartsByTab = candidate.charts_by_tab as Record<string, unknown>
  for (const tab of REQUIRED_CHART_TABS) {
    if (!isChartSpec(chartsByTab[tab])) {
      return false
    }
  }
  return true
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isScenarioLabInterpretationMetadata(
  value: unknown,
): value is ScenarioLabInterpretationMetadata {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<ScenarioLabInterpretationMetadata>
  if (
    candidate.generation_mode !== 'template' &&
    candidate.generation_mode !== 'assisted' &&
    candidate.generation_mode !== 'reviewed'
  ) {
    return false
  }
  if (candidate.reviewer_name !== undefined && typeof candidate.reviewer_name !== 'string') {
    return false
  }
  if (candidate.reviewed_at !== undefined && typeof candidate.reviewed_at !== 'string') {
    return false
  }
  return true
}

function isSuggestedNextScenario(value: unknown): value is SuggestedNextScenario {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<SuggestedNextScenario>
  return (
    typeof candidate.label === 'string' &&
    (candidate.target_route === '/scenario-lab' || candidate.target_route === '/comparison') &&
    (candidate.target_preset === undefined || typeof candidate.target_preset === 'string')
  )
}

function isPersistedScenarioInterpretation(value: unknown): value is PersistedScenarioInterpretation {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<PersistedScenarioInterpretation>
  if (
    !isStringArray(candidate.what_changed) ||
    !isStringArray(candidate.why_it_changed) ||
    !isStringArray(candidate.key_risks) ||
    !isStringArray(candidate.policy_implications) ||
    !isStringArray(candidate.suggested_next_scenarios)
  ) {
    return false
  }
  if (!isScenarioLabInterpretationMetadata(candidate.metadata)) {
    return false
  }
  if (
    candidate.suggested_next !== undefined &&
    !(Array.isArray(candidate.suggested_next) && candidate.suggested_next.every(isSuggestedNextScenario))
  ) {
    return false
  }
  return true
}

function normalizePersistedScenarioInterpretation(
  interpretation: PersistedScenarioInterpretation,
): PersistedScenarioInterpretation {
  const normalized: PersistedScenarioInterpretation = {
    what_changed: interpretation.what_changed,
    why_it_changed: interpretation.why_it_changed,
    key_risks: interpretation.key_risks,
    policy_implications: interpretation.policy_implications,
    suggested_next_scenarios: interpretation.suggested_next_scenarios,
    metadata: interpretation.metadata,
  }
  if (interpretation.suggested_next !== undefined) {
    normalized.suggested_next = interpretation.suggested_next
  }
  return normalized
}

function isSavedScenarioRecord(value: unknown): value is SavedScenarioRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<SavedScenarioRecord>
  const baseValid =
    typeof candidate.scenario_id === 'string' &&
    typeof candidate.scenario_name === 'string' &&
    isScenarioType(candidate.scenario_type) &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((item) => typeof item === 'string') &&
    typeof candidate.description === 'string' &&
    typeof candidate.created_at === 'string' &&
    typeof candidate.updated_at === 'string' &&
    typeof candidate.created_by === 'string' &&
    Array.isArray(candidate.assumptions) &&
    candidate.assumptions.every(isAssumption) &&
    Array.isArray(candidate.model_ids) &&
    candidate.model_ids.every((item) => typeof item === 'string') &&
    candidate.model_ids.length > 0 &&
    typeof candidate.data_version === 'string' &&
    candidate.data_version.length > 0 &&
    typeof candidate.stored_at === 'string'

  if (!baseValid) {
    return false
  }

  // Optional output-snapshot fields: validate when present, tolerate when absent.
  if (candidate.run_id !== undefined && typeof candidate.run_id !== 'string') {
    return false
  }
  if (candidate.run_saved_at !== undefined && typeof candidate.run_saved_at !== 'string') {
    return false
  }
  if (candidate.run_results !== undefined && !isPersistedRunResults(candidate.run_results)) {
    return false
  }
  if (
    candidate.run_interpretation !== undefined &&
    !isPersistedScenarioInterpretation(candidate.run_interpretation)
  ) {
    return false
  }
  if (
    candidate.run_attribution !== undefined &&
    !(Array.isArray(candidate.run_attribution) && candidate.run_attribution.every(isModelAttribution))
  ) {
    return false
  }
  return true
}

function buildScenarioKey(scenarioId: string): string {
  return `${SCENARIO_KEY_PREFIX}${scenarioId}`
}

function getAllScenarioKeys(storage: StorageLike): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && key.startsWith(SCENARIO_KEY_PREFIX)) {
      keys.push(key)
    }
  }
  return keys
}

function invalidateSnapshot() {
  snapshotVersion += 1
}

function emitScenarioStoreChange() {
  invalidateSnapshot()
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new Event(STORE_EVENT))
}

function createSessionId(storage: StorageLike): string {
  const existing = storage.getItem(SESSION_ID_KEY)
  if (existing && existing.trim().length > 0) {
    return existing
  }
  const sessionId = globalThis.crypto.randomUUID()
  storage.setItem(SESSION_ID_KEY, sessionId)
  return sessionId
}

function safeParseRecord(rawValue: string, scenarioId: string): SavedScenarioRecord | null {
  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!isSavedScenarioRecord(parsed)) {
      console.warn(`[scenarioStore] Scenario "${scenarioId}" failed schema validation and was ignored.`)
      return null
    }
    return parsed
  } catch (error) {
    console.warn(`[scenarioStore] Scenario "${scenarioId}" could not be parsed and was ignored.`, error)
    return null
  }
}

export type SaveScenarioInput = ScenarioWithDataVersion & {
  run_id?: string
  run_saved_at?: string
  run_results?: PersistedRunResults
  run_interpretation?: PersistedScenarioInterpretation
  run_attribution?: ModelAttribution[]
}

export function saveScenario(scenario: SaveScenarioInput): SavedScenarioRecord {
  const storage = getStorage()
  if (!storage) {
    throw new Error('Local storage is unavailable in this environment.')
  }

  const nowIso = new Date().toISOString()
  const existingRecord = loadScenario(scenario.scenario_id)
  const createdAt =
    existingRecord?.created_at ??
    (typeof scenario.created_at === 'string' && scenario.created_at.length > 0 ? scenario.created_at : nowIso)
  const scenarioType: ScenarioType = isScenarioType(scenario.scenario_type)
    ? scenario.scenario_type
    : 'alternative'

  const normalizedRecord: SavedScenarioRecord = {
    scenario_id: scenario.scenario_id,
    scenario_name: scenario.scenario_name,
    scenario_type: scenarioType,
    tags: Array.isArray(scenario.tags) ? scenario.tags : [],
    description: typeof scenario.description === 'string' ? scenario.description : '',
    created_at: createdAt,
    updated_at: nowIso,
    created_by: existingRecord?.created_by ?? createSessionId(storage),
    assumptions: scenario.assumptions,
    model_ids: scenario.model_ids,
    data_version: scenario.data_version,
    stored_at: nowIso,
  }

  if (scenario.run_id !== undefined) {
    normalizedRecord.run_id = scenario.run_id
  }
  if (scenario.run_saved_at !== undefined) {
    normalizedRecord.run_saved_at = scenario.run_saved_at
  }
  if (scenario.run_results !== undefined) {
    normalizedRecord.run_results = scenario.run_results
  }
  if (scenario.run_interpretation !== undefined) {
    if (!isPersistedScenarioInterpretation(scenario.run_interpretation)) {
      throw new Error('Scenario run interpretation does not match the supported persisted shape.')
    }
    normalizedRecord.run_interpretation = normalizePersistedScenarioInterpretation(
      scenario.run_interpretation,
    )
  }
  if (scenario.run_attribution !== undefined) {
    normalizedRecord.run_attribution = scenario.run_attribution
  }

  storage.setItem(buildScenarioKey(normalizedRecord.scenario_id), JSON.stringify(normalizedRecord))
  emitScenarioStoreChange()
  return normalizedRecord
}

export function loadScenario(scenarioId: string): SavedScenarioRecord | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }
  const rawValue = storage.getItem(buildScenarioKey(scenarioId))
  if (!rawValue) {
    return null
  }
  return safeParseRecord(rawValue, scenarioId)
}

export function listScenarios(): SavedScenarioRecord[] {
  if (cachedSnapshotVersion === snapshotVersion) {
    return cachedSnapshot
  }

  const storage = getStorage()
  if (!storage) {
    cachedSnapshot = []
    cachedSnapshotVersion = snapshotVersion
    return cachedSnapshot
  }
  const keys = getAllScenarioKeys(storage)
  const records: SavedScenarioRecord[] = []
  for (const key of keys) {
    const rawValue = storage.getItem(key)
    if (!rawValue) {
      continue
    }
    const scenarioId = key.slice(SCENARIO_KEY_PREFIX.length)
    const parsed = safeParseRecord(rawValue, scenarioId)
    if (parsed) {
      records.push(parsed)
    }
  }
  records.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  cachedSnapshot = records
  cachedSnapshotVersion = snapshotVersion
  return cachedSnapshot
}

export function deleteScenario(scenarioId: string): boolean {
  const storage = getStorage()
  if (!storage) {
    return false
  }
  const key = buildScenarioKey(scenarioId)
  const existed = storage.getItem(key) !== null
  if (!existed) {
    return false
  }
  storage.removeItem(key)
  emitScenarioStoreChange()
  return true
}

export function clearAllScenarios(): void {
  const storage = getStorage()
  if (!storage) {
    return
  }
  const keys = getAllScenarioKeys(storage)
  for (const key of keys) {
    storage.removeItem(key)
  }
  storage.removeItem(SESSION_ID_KEY)
  emitScenarioStoreChange()
}

export function subscribeScenarioStore(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleCustomStoreEvent = () => {
    invalidateSnapshot()
    onStoreChange()
  }
  const handleStorageEvent = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(SCENARIO_KEY_PREFIX) || event.key === SESSION_ID_KEY) {
      invalidateSnapshot()
      onStoreChange()
    }
  }

  window.addEventListener(STORE_EVENT, handleCustomStoreEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(STORE_EVENT, handleCustomStoreEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}
