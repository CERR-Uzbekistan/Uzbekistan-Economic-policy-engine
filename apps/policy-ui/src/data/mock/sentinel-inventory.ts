import { modelCatalogEntries } from './model-catalog.js'
import { overviewV1Data } from './overview.js'

export const EDITORIAL_SENTINEL_TEXT = '[SME content pending]'

export type SentinelInventoryItem = {
  id: string
  surface: 'overview' | 'model-explorer' | 'comparison'
  owner: 'CERR' | 'product'
  path: string
  count: number
  note: string
}

export function collectSentinelInventory(): SentinelInventoryItem[] {
  const overviewKpiSentinels = overviewV1Data.headline_metrics.filter(
    (metric) => metric.context_note === EDITORIAL_SENTINEL_TEXT,
  )
  const validationSummarySentinels = modelCatalogEntries.filter((entry) =>
    entry.validation_summary.includes(EDITORIAL_SENTINEL_TEXT),
  )
  return [
    {
      id: 'overview.kpi.context_notes',
      surface: 'overview',
      owner: 'CERR',
      path: 'apps/policy-ui/src/data/mock/overview.ts:headline_metrics[*].context_note',
      count: overviewKpiSentinels.length,
      note: 'Shot 2 should replace KPI-level contextual footnote sentinels with approved interpretive prose.',
    },
    {
      id: 'model_explorer.validation_summaries',
      surface: 'model-explorer',
      owner: 'CERR',
      path: 'apps/policy-ui/src/data/mock/model-catalog.ts:validation_summary',
      count: validationSummarySentinels.length,
      note: 'Shot 2 should replace non-QPM validation summary sentinels with model-specific validation prose.',
    },
    {
      id: 'model_explorer.equation_detail_sets',
      surface: 'model-explorer',
      owner: 'CERR',
      path: 'apps/policy-ui/src/components/model-explorer/equations/index.tsx',
      count: 0,
      note: 'Non-QPM equation formula renderers are present for the current catalog; fuller derivation prose is deferred outside the current page shape.',
    },
    {
      id: 'comparison.tradeoff.shell_a_c',
      surface: 'comparison',
      owner: 'product',
      path: 'apps/policy-ui/src/data/adapters/comparison.ts:chooseTradeoffSummary',
      count: 0,
      note: 'Trade-off Shell A, B, and C render bounded English/source prose from existing scenario roles and names.',
    },
  ]
}

