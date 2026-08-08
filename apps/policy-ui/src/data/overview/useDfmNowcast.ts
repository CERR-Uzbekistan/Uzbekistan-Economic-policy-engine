import { useCallback, useEffect, useState } from 'react'
import type { ChartSpec } from '../../contracts/data-contract.js'
import { toDfmAdapterOutput } from '../bridge/dfm-adapter.js'
import {
  DfmTransportError,
  DfmValidationError,
  fetchDfmBridgePayload,
} from '../bridge/dfm-client.js'
import { assessDfmReadiness, type DfmReadinessAssessment } from '../bridge/dfm-readiness.js'
import { composeDfmNowcastChart } from './dfm-composition.js'
import {
  composeDfmContributionDetails,
  type DfmContributionDetail,
} from './dfm-contribution-detail.js'

export type DfmNowcastState =
  | { status: 'loading' }
  | { status: 'bridge'; chart: ChartSpec; contributionDetails: DfmContributionDetail[] }
  | { status: 'unavailable'; assessment: DfmReadinessAssessment }
  | { status: 'degraded'; error: DfmTransportError | DfmValidationError }

export type DfmNowcastHookResult = {
  state: DfmNowcastState
  refetch: () => void
}

type FetchLike = Parameters<typeof fetchDfmBridgePayload>[0]

export function useDfmNowcast(fetchImpl?: FetchLike, now?: Date): DfmNowcastHookResult {
  const [state, setState] = useState<DfmNowcastState>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  const refetch = useCallback(() => {
    setState({ status: 'loading' })
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const payload = await fetchDfmBridgePayload(fetchImpl)
        if (cancelled) return
        const assessment = assessDfmReadiness(payload, now ?? new Date())
        if (assessment.status === 'unavailable') {
          setState({ status: 'unavailable', assessment })
          return
        }
        const adapter = toDfmAdapterOutput(payload)
        const chart = composeDfmNowcastChart(adapter)
        const contributionDetails = composeDfmContributionDetails(adapter)
        setState({ status: 'bridge', chart, contributionDetails })
      } catch (error) {
        if (cancelled) return
        if (error instanceof DfmTransportError || error instanceof DfmValidationError) {
          setState({ status: 'degraded', error })
        } else {
          setState({
            status: 'degraded',
            error: new DfmTransportError('network', 'Unexpected DFM bridge error.', { cause: error }),
          })
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [fetchImpl, nonce, now])

  return { state, refetch }
}
