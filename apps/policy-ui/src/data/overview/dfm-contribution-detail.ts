import type { DfmAdapterOutput, DfmIndicatorView } from '../bridge/dfm-adapter.js'

export const DFM_CONTRIBUTION_PINNED_INDICATOR_IDS = [
  'IND_YOY',
  'wholesale_trade_grwth',
] as const

const TOP_CONTRIBUTION_LIMIT = 12
const GROWTH_RATE_PATTERN = /(^|[_\s-])(yoy|mom)($|[_\s-])|grwth|growth/i
const LEVEL_PATTERN = /index|volume|sales|transactions|deals|enterprises|activity|climate/i
const NATIVE_UNIT_PATTERN = /\b(usd|uzs)\b/i

export type DfmContributionSignalKind =
  | 'contracting'
  | 'below-trend'
  | 'above-trend'
  | 'interest-rate-native'
  | 'monetary-aggregate-native'
  | 'npl-native'
  | 'fx-native'
  | 'level-native'
  | 'native-unit'
  | 'other-non-growth'

export type DfmContributionTone = 'negative' | 'caution' | 'positive' | 'neutral'

export type DfmContributionSignal = {
  kind: DfmContributionSignalKind
  label: string
  tone: DfmContributionTone
  isGrowthRate: boolean
}

export type DfmContributionDetail = {
  indicatorId: string
  label: string
  category: string
  latestValue: number | null
  contribution: number
  loading: number
  signal: DfmContributionSignal
  isPinned: boolean
}

function normalizedIndicatorText(indicator: DfmIndicatorView): string {
  return `${indicator.indicator_id} ${indicator.label} ${indicator.category}`.toLowerCase()
}

export function isTrueGrowthRateIndicator(indicator: DfmIndicatorView): boolean {
  return GROWTH_RATE_PATTERN.test(normalizedIndicatorText(indicator))
}

function nonGrowthSignal(indicator: DfmIndicatorView): DfmContributionSignal {
  const text = normalizedIndicatorText(indicator)
  if (/\bnpl\b|non-performing/.test(text)) {
    return {
      kind: 'npl-native',
      label: 'NPL ratio, native units',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  if (/money supply|\bm0\b|\bm1\b|\bm2\b|monetary aggregate/.test(text)) {
    return {
      kind: 'monetary-aggregate-native',
      label: 'Monetary aggregate, native units',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  if (/exchange rate|uzs\/usd|fx/.test(text)) {
    return {
      kind: 'fx-native',
      label: 'FX rate, native units',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  if (/\brate\b|interest/.test(text)) {
    return {
      kind: 'interest-rate-native',
      label: 'Rate, native units',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  if (LEVEL_PATTERN.test(text)) {
    return {
      kind: 'level-native',
      label: 'Level indicator, native units',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  if (NATIVE_UNIT_PATTERN.test(text)) {
    return {
      kind: 'native-unit',
      label: 'Native-unit indicator',
      tone: 'neutral',
      isGrowthRate: false,
    }
  }
  return {
    kind: 'other-non-growth',
    label: 'Non-growth indicator',
    tone: 'neutral',
    isGrowthRate: false,
  }
}

export function classifyDfmContribution(indicator: DfmIndicatorView): DfmContributionSignal {
  if (!isTrueGrowthRateIndicator(indicator)) {
    return nonGrowthSignal(indicator)
  }

  const latestValue = indicator.latest_value
  if (typeof latestValue === 'number' && Number.isFinite(latestValue) && latestValue < 0) {
    return {
      kind: 'contracting',
      label: 'Contracting growth signal',
      tone: 'negative',
      isGrowthRate: true,
    }
  }
  if (indicator.contribution < 0) {
    return {
      kind: 'below-trend',
      label: 'Growing below trend',
      tone: 'caution',
      isGrowthRate: true,
    }
  }
  return {
    kind: 'above-trend',
    label: 'Growing above trend',
    tone: 'positive',
    isGrowthRate: true,
  }
}

function isFiniteContribution(indicator: DfmIndicatorView): boolean {
  return Number.isFinite(indicator.contribution) && indicator.category !== 'Target variable'
}

function toDetail(indicator: DfmIndicatorView, pinnedIds: ReadonlySet<string>): DfmContributionDetail {
  return {
    indicatorId: indicator.indicator_id,
    label: indicator.label,
    category: indicator.category,
    latestValue: indicator.latest_value,
    contribution: indicator.contribution,
    loading: indicator.loading,
    signal: classifyDfmContribution(indicator),
    isPinned: pinnedIds.has(indicator.indicator_id),
  }
}

export function composeDfmContributionDetails(
  input: DfmAdapterOutput,
  options: {
    limit?: number
    pinnedIndicatorIds?: readonly string[]
  } = {},
): DfmContributionDetail[] {
  const limit = options.limit ?? TOP_CONTRIBUTION_LIMIT
  const pinnedIndicatorIds = options.pinnedIndicatorIds ?? DFM_CONTRIBUTION_PINNED_INDICATOR_IDS
  const pinnedIds = new Set(pinnedIndicatorIds)
  const candidates = input.indicators.filter(isFiniteContribution)
  const topRows = candidates
    .slice()
    .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
    .slice(0, limit)

  const selected = new Map<string, DfmIndicatorView>()
  for (const indicator of topRows) {
    selected.set(indicator.indicator_id, indicator)
  }
  for (const indicatorId of pinnedIndicatorIds) {
    const pinned = candidates.find((indicator) => indicator.indicator_id === indicatorId)
    if (pinned) {
      selected.set(pinned.indicator_id, pinned)
    }
  }

  return [...selected.values()]
    .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
    .map((indicator) => toDetail(indicator, pinnedIds))
}
