import { EconomicStateHeader } from '../components/overview/EconomicStateHeader'
import { KpiStrip } from '../components/overview/KpiStrip'
import { NowcastForecastBlock } from '../components/overview/NowcastForecastBlock'
import { QuickActions } from '../components/overview/QuickActions'
import { RiskPanel } from '../components/overview/RiskPanel'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { overviewV1Data } from '../data/mock/overview'
import './overview.css'

function buildStateHeaderText() {
  return overviewV1Data.scenario_result.narrative.summary
}

export function OverviewPage() {
  const { scenario_result, risks, quick_actions } = overviewV1Data
  const nowcastChart = scenario_result.charts[0]

  return (
    <PageContainer className="overview-page">
      <section className="overview-hero">
        <PageHeader
          title="Overview"
          description="Decision-first macro snapshot designed to show what changed, why it matters, and where to test next."
        />

        <EconomicStateHeader
          summary={buildStateHeaderText()}
          updatedAt={scenario_result.narrative.generated_at}
        />
      </section>

      <KpiStrip metrics={scenario_result.headline_metrics} />

      <div className="overview-two-column">
        <NowcastForecastBlock chart={nowcastChart} />
        <RiskPanel risks={risks} />
      </div>

      <QuickActions actions={quick_actions} />
    </PageContainer>
  )
}
