import type { HeadlineMetric, ModelAttribution } from '../../contracts/data-contract.js'
import type { SavedScenarioRecord } from '../../state/scenarioStore.js'

export type DataRefreshEntry = {
  model_id: string
  model_name: string
  data_version: string
  timestamp: string
}

export type SavedScenarioFeedRow = {
  scenario_id: string
  scenario_name: string
  dateLabel: string
  model_ids: string[]
}

export const SESSION_ID_STORAGE_KEY = 'policy-ui:session-id'

function toEpoch(isoTimestamp: string): number {
  const parsed = Date.parse(isoTimestamp)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function toRelativeTime(isoTimestamp: string, locale: string): string {
  const target = new Date(isoTimestamp).getTime()
  if (!Number.isFinite(target)) {
    return isoTimestamp
  }

  const seconds = Math.round((target - Date.now()) / 1000)
  const absSeconds = Math.abs(seconds)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (absSeconds < 60) {
    return formatter.format(seconds, 'second')
  }
  if (absSeconds < 60 * 60) {
    return formatter.format(Math.round(seconds / 60), 'minute')
  }
  if (absSeconds < 60 * 60 * 24) {
    return formatter.format(Math.round(seconds / (60 * 60)), 'hour')
  }
  if (absSeconds < 60 * 60 * 24 * 30) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24)), 'day')
  }
  if (absSeconds < 60 * 60 * 24 * 365) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24 * 30)), 'month')
  }
  return formatter.format(Math.round(seconds / (60 * 60 * 24 * 365)), 'year')
}

function toCreatedByShort(createdBy: string, sessionId: string | null, youLabel: string): string {
  if (sessionId && createdBy === sessionId) {
    return youLabel
  }
  const compact = createdBy.replace(/-/g, '').slice(0, 8)
  return compact.length > 0 ? compact.toUpperCase() : youLabel
}

function collectLatestAttributionByModel(attributions: ModelAttribution[]): ModelAttribution[] {
  const deduped = new Map<string, ModelAttribution>()
  for (const attribution of attributions) {
    const existing = deduped.get(attribution.model_id)
    if (!existing || toEpoch(attribution.timestamp) > toEpoch(existing.timestamp)) {
      deduped.set(attribution.model_id, attribution)
    }
  }
  return Array.from(deduped.values())
}

export function getSessionId(): string | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }
  const sessionId = globalThis.localStorage.getItem(SESSION_ID_STORAGE_KEY)
  if (!sessionId || sessionId.trim().length === 0) {
    return null
  }
  return sessionId
}

export function toDateEyebrow(isoTimestamp: string, locale: string): string {
  const parsed = Date.parse(isoTimestamp)
  if (!Number.isFinite(parsed)) {
    return isoTimestamp.toUpperCase()
  }
  const label = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(parsed))
  return label.toUpperCase()
}

export function collectDataRefreshes(metrics: HeadlineMetric[]): DataRefreshEntry[] {
  const deduped = new Map<string, DataRefreshEntry>()
  for (const metric of metrics) {
    for (const attribution of metric.model_attribution) {
      const key = `${attribution.model_id}::${attribution.data_version}`
      const candidate: DataRefreshEntry = {
        model_id: attribution.model_id,
        model_name: attribution.model_name,
        data_version: attribution.data_version,
        timestamp: attribution.timestamp,
      }
      const existing = deduped.get(key)
      if (!existing || toEpoch(candidate.timestamp) > toEpoch(existing.timestamp)) {
        deduped.set(key, candidate)
      }
    }
  }
  return Array.from(deduped.values()).sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))
}

export function toRefreshTitle(entry: DataRefreshEntry, refreshSuffix: string): string {
  const normalizedName = entry.model_name.trim()
  if (!normalizedName) {
    return `${entry.model_id} ${refreshSuffix}`
  }
  if (normalizedName.toLowerCase() === entry.model_id.trim().toLowerCase()) {
    return `${normalizedName} ${refreshSuffix}`
  }
  return normalizedName
}

export function buildSavedScenarioFeedRows(
  savedScenarios: SavedScenarioRecord[],
  locale: string,
  sessionId: string | null,
  youLabel: string,
): SavedScenarioFeedRow[] {
  return savedScenarios.slice(0, 3).map((scenario) => {
    const createdBy = toCreatedByShort(scenario.created_by, sessionId, youLabel)
    const relativeTime = toRelativeTime(scenario.updated_at, locale)
    return {
      scenario_id: scenario.scenario_id,
      scenario_name: scenario.scenario_name,
      dateLabel: `${relativeTime} · ${createdBy}`,
      model_ids: collectLatestAttributionByModel(
        scenario.model_ids.map((modelId) => ({
          model_id: modelId,
          model_name: modelId,
          module: '',
          version: '',
          run_id: modelId,
          data_version: scenario.data_version,
          timestamp: scenario.updated_at,
        })),
      ).map((attribution) => attribution.model_id),
    }
  })
}
