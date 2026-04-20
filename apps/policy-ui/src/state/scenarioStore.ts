import type { Assumption, Scenario, ScenarioType } from '../contracts/data-contract'

const SCENARIO_KEY_PREFIX = 'policy-ui:scenario:'
const SESSION_ID_KEY = 'policy-ui:session-id'
const STORE_EVENT = 'policy-ui:scenario-store-updated'
let cachedSnapshot: SavedScenarioRecord[] = []
let snapshotVersion = 0
let cachedSnapshotVersion = -1

type ScenarioWithDataVersion = Scenario & {
  data_version: string
}

export type SavedScenarioRecord = ScenarioWithDataVersion & {
  stored_at: string
}

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

function isSavedScenarioRecord(value: unknown): value is SavedScenarioRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<SavedScenarioRecord>
  return (
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
  )
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

export function saveScenario(scenario: ScenarioWithDataVersion): SavedScenarioRecord {
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
