import type { DfmContributionDetail } from '../../data/overview/dfm-contribution-detail.js'
import {
  formatNumber,
  formatSignedNumber,
  formatUnavailable,
} from '../../lib/format/locale-format.js'

type DfmContributionDetailPanelProps = {
  rows?: DfmContributionDetail[]
  locale: string
}

function formatLatest(value: number | null, isGrowthRate: boolean, locale: string): string {
  if (value === null || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }
  const formatted = formatSignedNumber(value, locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
  return isGrowthRate ? `${formatted}%` : formatted
}

function formatContribution(value: number, locale: string): string {
  return `${formatSignedNumber(value, locale, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  })} pp`
}

export function DfmContributionDetailPanel({ rows, locale }: DfmContributionDetailPanelProps) {
  if (!rows || rows.length === 0) {
    return null
  }

  const maxMagnitude = Math.max(...rows.map((row) => Math.abs(row.contribution)), 0.001)

  return (
    <section
      className="dfm-contribution-detail"
      aria-labelledby="dfm-contribution-detail-title"
    >
      <div className="dfm-contribution-detail__head">
        <div>
          <p className="overview-section-kicker">DFM contribution detail</p>
          <h3 id="dfm-contribution-detail-title">Latest indicator contribution slice</h3>
        </div>
        <p>
          Top contributors by absolute contribution, with Industry YoY and Wholesale Trade Growth pinned when needed.
        </p>
      </div>

      <div className="dfm-contribution-detail__table-wrap">
        <table className="dfm-contribution-detail__table">
          <thead>
            <tr>
              <th scope="col">Indicator</th>
              <th scope="col">Signal</th>
              <th scope="col">Latest</th>
              <th scope="col">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const magnitudePct = Math.max(4, (Math.abs(row.contribution) / maxMagnitude) * 100)
              return (
                <tr
                  className={`dfm-contribution-detail__row dfm-contribution-detail__row--${row.signal.tone}`}
                  data-dfm-indicator-id={row.indicatorId}
                  key={row.indicatorId}
                >
                  <th scope="row">
                    <span>{row.label}</span>
                    <small>
                      {row.category}
                      {row.isPinned ? ' - pinned' : ''}
                    </small>
                  </th>
                  <td>
                    <span
                      className={`dfm-contribution-detail__signal dfm-contribution-detail__signal--${row.signal.tone}`}
                      data-dfm-signal-kind={row.signal.kind}
                    >
                      {row.signal.label}
                    </span>
                  </td>
                  <td>
                    {formatLatest(row.latestValue, row.signal.isGrowthRate, locale)}
                  </td>
                  <td>
                    <div className="dfm-contribution-detail__contribution">
                      <span>{formatContribution(row.contribution, locale)}</span>
                      <span
                        aria-hidden="true"
                        className={`dfm-contribution-detail__bar dfm-contribution-detail__bar--${
                          row.contribution < 0 ? 'negative' : 'positive'
                        }`}
                        style={{ inlineSize: `${formatNumber(magnitudePct, 'en', { maximumFractionDigits: 1 })}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
