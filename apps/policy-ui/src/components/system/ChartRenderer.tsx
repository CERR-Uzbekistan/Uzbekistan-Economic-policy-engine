import type {
  ChartSemanticRole,
  ChartSeries,
  ChartSpec,
  UncertaintyBand,
} from '../../contracts/data-contract'
import { AttributionBadge } from './AttributionBadge'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ChartRendererProps = {
  spec: ChartSpec
  height?: number
  ariaLabel?: string
}

type ChartDatum = Record<string, number | string | undefined>

type SeriesMeta = {
  series: ChartSeries
  key: string
  color: string
}

type BandMeta = {
  band: UncertaintyBand
  lowerKey: string
  rangeKey: string
  name: string
}

const X_KEY = '__x'
const Y_AXIS_TICK_STYLE = {
  fill: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.04em',
}
const GRID_STROKE_OPACITY = 0.6

function colorForSemanticRole(role: ChartSemanticRole): string {
  if (role === 'baseline') {
    return 'var(--color-text)'
  }
  if (role === 'alternative') {
    return 'var(--color-brand)'
  }
  if (role === 'downside') {
    return 'var(--color-downside)'
  }
  if (role === 'upside') {
    return 'var(--color-upside)'
  }
  return 'var(--color-text-muted)'
}

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  }
  if (Math.abs(value) >= 100) {
    return value.toFixed(0)
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1)
  }
  return value.toFixed(2).replace(/\.00$/, '')
}

function formatWithUnit(value: number, unit: string): string {
  const numeric = formatCompactNumber(value)
  if (!unit) {
    return numeric
  }
  if (unit === '%' || unit === 'pp') {
    return `${numeric}${unit}`
  }
  return `${numeric} ${unit}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toSeriesMeta(spec: ChartSpec): SeriesMeta[] {
  return spec.series.map((series) => ({
    series,
    key: `series__${series.series_id}`,
    color: colorForSemanticRole(series.semantic_role),
  }))
}

function toBandMeta(spec: ChartSpec): BandMeta[] {
  return spec.uncertainty.map((band) => ({
    band,
    lowerKey: `band__${band.series_id}__lower`,
    rangeKey: `band__${band.series_id}__range`,
    name: `${band.confidence_level}% ${band.methodology_label}`,
  }))
}

function hasUsableSeriesData(spec: ChartSpec): boolean {
  if (spec.series.length === 0) {
    return false
  }
  return spec.series.some((series) => series.values.length > 0 && series.values.some(isFiniteNumber))
}

function buildChartData(spec: ChartSpec, seriesMeta: SeriesMeta[], bandMeta: BandMeta[]): ChartDatum[] {
  return spec.x.values.map((xValue, index) => {
    const row: ChartDatum = {
      [X_KEY]: xValue.toString(),
    }

    for (const item of seriesMeta) {
      const value = item.series.values[index]
      if (isFiniteNumber(value)) {
        row[item.key] = value
      }
    }

    for (const item of bandMeta) {
      const lower = item.band.lower[index]
      const upper = item.band.upper[index]
      if (!isFiniteNumber(lower) || !isFiniteNumber(upper) || upper < lower) {
        continue
      }
      row[item.lowerKey] = lower
      row[item.rangeKey] = upper - lower
    }

    return row
  })
}

function getFreshness(spec: ChartSpec): string | null {
  const value = (spec as ChartSpec & { freshness?: unknown }).freshness
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized ? normalized : null
}

function buildScreenReaderSummary(spec: ChartSpec): string {
  const takeaway = spec.takeaway.trim()
  if (takeaway) {
    return takeaway
  }
  const subtitle = spec.subtitle.trim()
  if (subtitle) {
    return subtitle
  }
  return `${spec.title} chart`
}

export function ChartRenderer({ spec, height = 280, ariaLabel }: ChartRendererProps): JSX.Element {
  const primaryModel = spec.model_attribution[0]?.model_id ?? 'N/A'
  const chartAriaLabel = ariaLabel ?? spec.title
  const freshness = getFreshness(spec)

  if (!hasUsableSeriesData(spec)) {
    return (
      <article className="chart-renderer" aria-labelledby={`chart-renderer-title-${spec.chart_id}`}>
        <header className="chart-renderer__header">
          <div className="chart-renderer__titles">
            <h3 id={`chart-renderer-title-${spec.chart_id}`}>{spec.title}</h3>
            {spec.subtitle.trim() ? <p>{spec.subtitle}</p> : null}
          </div>
          <AttributionBadge modelId={primaryModel} active />
        </header>
        <p className="empty-state chart-renderer__empty">No data available for this chart.</p>
      </article>
    )
  }

  const seriesMeta = toSeriesMeta(spec)
  const bandMeta = toBandMeta(spec)
  const data = buildChartData(spec, seriesMeta, bandMeta)
  const yUnit = spec.y.unit
  const screenReaderSummary = buildScreenReaderSummary(spec)

  const commonChartChildren = (
    <>
      <CartesianGrid
        stroke="var(--color-border)"
        strokeOpacity={GRID_STROKE_OPACITY}
        vertical={false}
      />
      <XAxis
        dataKey={X_KEY}
        axisLine={false}
        tick={Y_AXIS_TICK_STYLE}
        tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 0.75 }}
      />
      <YAxis
        axisLine={false}
        tick={Y_AXIS_TICK_STYLE}
        tickFormatter={(value) => {
          if (!isFiniteNumber(value)) {
            return ''
          }
          return formatWithUnit(value, yUnit)
        }}
        tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 0.75 }}
      />
      <Tooltip
        formatter={(value) => {
          if (!isFiniteNumber(value)) {
            return 'n/a'
          }
          return formatWithUnit(value, yUnit)
        }}
        itemStyle={{
          color: 'var(--color-text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
        }}
        contentStyle={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.82rem',
        }}
      />
      <Legend
        align="left"
        className="chart-renderer__legend"
        iconSize={8}
        verticalAlign="bottom"
        wrapperStyle={{ paddingTop: 10 }}
      />
      {bandMeta.map((item) => (
        <Area
          key={`${item.band.series_id}-lower`}
          dataKey={item.lowerKey}
          hide
          isAnimationActive={false}
          stackId={item.band.series_id}
          stroke="none"
        />
      ))}
      {bandMeta.map((item) => (
        <Area
          key={`${item.band.series_id}-range`}
          dataKey={item.rangeKey}
          fill="var(--color-uncertainty)"
          fillOpacity={0.35}
          isAnimationActive={false}
          name={item.name}
          stackId={item.band.series_id}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
          type="monotone"
        />
      ))}
    </>
  )

  const lineChartBody = (
    <LineChart data={data} margin={{ top: 8, right: 8, bottom: 6, left: 6 }}>
      {commonChartChildren}
      {seriesMeta.map((item) => (
        <Line
          key={item.series.series_id}
          dataKey={item.key}
          dot={false}
          isAnimationActive={false}
          name={item.series.label}
          stroke={item.color}
          strokeWidth={2}
          type="monotone"
        />
      ))}
    </LineChart>
  )

  const barChartBody = (
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 6, left: 6 }}>
      {commonChartChildren}
      {seriesMeta.map((item) => (
        <Bar
          key={item.series.series_id}
          dataKey={item.key}
          fill={item.color}
          isAnimationActive={false}
          name={item.series.label}
          radius={[3, 3, 0, 0]}
        />
      ))}
    </BarChart>
  )

  let chartBody: JSX.Element
  if (spec.chart_type === 'line') {
    chartBody = lineChartBody
  } else if (spec.chart_type === 'bar') {
    chartBody = barChartBody
  } else {
    throw new Error(`Unsupported chart_type: ${spec.chart_type}`)
  }

  return (
    <article className="chart-renderer" aria-labelledby={`chart-renderer-title-${spec.chart_id}`}>
      <header className="chart-renderer__header">
        <div className="chart-renderer__titles">
          <h3 id={`chart-renderer-title-${spec.chart_id}`}>{spec.title}</h3>
          {spec.subtitle.trim() ? <p>{spec.subtitle}</p> : null}
        </div>
        <AttributionBadge modelId={primaryModel} active />
      </header>

      <div className="chart-renderer__body" role="img" aria-label={chartAriaLabel}>
        <p className="sr-only">{screenReaderSummary}</p>
        <ResponsiveContainer width="100%" height={height}>
          {chartBody}
        </ResponsiveContainer>
      </div>

      {spec.takeaway.trim() ? (
        <p className="chart-renderer__takeaway">
          <strong>Takeaway.</strong> {spec.takeaway}
        </p>
      ) : null}

      {freshness ? <p className="chart-renderer__freshness">{freshness}</p> : null}
    </article>
  )
}
