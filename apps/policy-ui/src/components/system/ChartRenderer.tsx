import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ChartSemanticRole,
  ChartSeries,
  ChartSpec,
} from '../../contracts/data-contract.js'
import {
  formatAxisUnitLabel,
  formatQuarterLabel,
  formatUnavailable,
  formatValueWithUnit,
} from '../../lib/format/locale-format.js'
import { AttributionBadge } from './AttributionBadge.js'
import { toBandMeta, type BandMeta } from './chart-meta-utils.js'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toYAxisDomain } from './chart-domain-utils.js'

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

const X_KEY = '__x'
const Y_AXIS_TICK_STYLE = {
  fill: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.04em',
}
const GRID_STROKE_OPACITY = 0.6
const useChartMeasureEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

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

// DFM Overview nowcast splits one logical "GDP growth" line into three
// segmented series so history/current/forecast render visually distinct.
// Style decisions live here so any chart that opts into these series_ids
// gets the same visual encoding without widening the ChartSeries contract.
const NOWCAST_LINE_STYLES: Record<
  string,
  { strokeDasharray?: string; showDots: boolean; connectNulls: boolean; strokeWidth: number; dotRadius: number }
> = {
  gdp_history_yoy: { showDots: true, connectNulls: false, strokeWidth: 2, dotRadius: 4 },
  gdp_nowcast_yoy: { strokeDasharray: '6 4', showDots: true, connectNulls: true, strokeWidth: 3, dotRadius: 4.5 },
  gdp_forecast_yoy: { strokeDasharray: '2 4', showDots: false, connectNulls: true, strokeWidth: 2, dotRadius: 0 },
}

function lineStyleForSeriesId(seriesId: string) {
  return NOWCAST_LINE_STYLES[seriesId] ?? {
    strokeDasharray: undefined,
    showDots: false,
    connectNulls: false,
    strokeWidth: 2,
    dotRadius: 0,
  }
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
      row[item.upperKey] = upper
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

function buildScreenReaderSummary(spec: ChartSpec, fallbackLabel: string): string {
  const takeaway = spec.takeaway.trim()
  if (takeaway) {
    return takeaway
  }
  const subtitle = spec.subtitle.trim()
  if (subtitle) {
    return subtitle
  }
  return `${spec.title} ${fallbackLabel}`
}

function localizeChartSpec(spec: ChartSpec, t: ReturnType<typeof useTranslation>['t']): ChartSpec {
  const key = `chartRenderer.spec.${spec.chart_id}`
  return {
    ...spec,
    title: t(`${key}.title`, { defaultValue: spec.title }),
    subtitle: t(`${key}.subtitle`, { defaultValue: spec.subtitle }),
    x: {
      ...spec.x,
      label: t(`${key}.xLabel`, { defaultValue: spec.x.label }),
    },
    y: {
      ...spec.y,
      label: t(`${key}.yLabel`, { defaultValue: spec.y.label }),
    },
    series: spec.series.map((series) => ({
      ...series,
      label: t(`${key}.series.${series.series_id}`, { defaultValue: series.label }),
    })),
    takeaway: t(`${key}.takeaway`, { defaultValue: spec.takeaway }),
  }
}

function publicAttributionLabel(
  attribution: ChartSpec['model_attribution'][number] | undefined,
  t: ReturnType<typeof useTranslation>['t'],
  locale: string | undefined,
) {
  if (!attribution) {
    return formatUnavailable(locale)
  }
  if (attribution.model_id === 'scenario-lab-mock-engine') {
    return t('scenarioLab.results.qpmReferenceBadge', { defaultValue: 'QPM reference' })
  }
  return attribution.model_id
}

export function ChartRenderer({ spec, height = 280, ariaLabel }: ChartRendererProps): JSX.Element {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const localizedSpec = localizeChartSpec(spec, t)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(() =>
    typeof document === 'undefined' ? 640 : 0,
  )
  const primaryModel = publicAttributionLabel(localizedSpec.model_attribution[0], t, locale)
  const chartAriaLabel = ariaLabel ?? localizedSpec.title
  const freshness = getFreshness(localizedSpec)

  useChartMeasureEffect(() => {
    const element = bodyRef.current
    if (!element) {
      return undefined
    }

    const updateWidth = () => {
      setMeasuredWidth(Math.max(1, Math.floor(element.getBoundingClientRect().width)))
    }
    updateWidth()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth)
      observer.observe(element)
      return () => observer.disconnect()
    }

    globalThis.addEventListener?.('resize', updateWidth)
    return () => globalThis.removeEventListener?.('resize', updateWidth)
  }, [])

  if (!hasUsableSeriesData(localizedSpec)) {
    return (
      <article className="chart-renderer" aria-labelledby={`chart-renderer-title-${localizedSpec.chart_id}`}>
        <header className="chart-renderer__header">
          <div className="chart-renderer__titles">
            <h3 id={`chart-renderer-title-${localizedSpec.chart_id}`}>{localizedSpec.title}</h3>
            {localizedSpec.subtitle.trim() ? <p>{localizedSpec.subtitle}</p> : null}
          </div>
          <AttributionBadge modelId={primaryModel} active />
        </header>
        <p className="empty-state chart-renderer__empty">
          {t('chartRenderer.empty', { defaultValue: 'No data available for this chart.' })}
        </p>
      </article>
    )
  }

  const seriesMeta = toSeriesMeta(localizedSpec)
  const bandMeta = toBandMeta(localizedSpec)
  const data = buildChartData(localizedSpec, seriesMeta, bandMeta)
  const yUnit = localizedSpec.y.unit
  const yDomain = toYAxisDomain(localizedSpec)
  const screenReaderSummary = buildScreenReaderSummary(
    localizedSpec,
    t('chartRenderer.srFallback', { defaultValue: 'chart' }),
  )
  const hasIllustrativeBand = bandMeta.some((item) => item.band.is_illustrative)
  const suppressInternalLegend = localizedSpec.series.some((series) => series.series_id === 'gdp_nowcast_yoy')
  const chartWidth = Math.max(measuredWidth, 1)

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
        padding={{ left: 14, right: 28 }}
        tick={Y_AXIS_TICK_STYLE}
        tickFormatter={(value) => formatQuarterLabel(value, locale)}
        tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 0.75 }}
      />
      <YAxis
        axisLine={false}
        domain={yDomain}
        tick={Y_AXIS_TICK_STYLE}
        tickFormatter={(value) => {
          if (!isFiniteNumber(value)) {
            return ''
          }
          return formatValueWithUnit(value, yUnit, locale, { maximumFractionDigits: 2 })
        }}
        tickLine={{ stroke: 'var(--color-border-strong)', strokeWidth: 0.75 }}
      />
      <Tooltip
        formatter={(value) => {
          if (!isFiniteNumber(value)) {
            return formatUnavailable(locale)
          }
          return formatValueWithUnit(value, yUnit, locale, { maximumFractionDigits: 2 })
        }}
        labelFormatter={(label) => formatQuarterLabel(label, locale)}
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
      {suppressInternalLegend ? null : (
        <Legend
          align="left"
          className="chart-renderer__legend"
          iconSize={8}
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 10 }}
        />
      )}
    </>
  )

  const uncertaintyPatterns = hasIllustrativeBand ? (
    <defs>
      {bandMeta
        .filter((item) => item.band.is_illustrative)
        .map((item) => (
          <pattern
            id={item.patternId}
            key={item.patternId}
            width={8}
            height={8}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <rect width={8} height={8} fill="rgba(77, 93, 116, 0.14)" />
            <line x1={0} y1={0} x2={0} y2={8} stroke="rgba(77, 93, 116, 0.55)" strokeWidth={2} />
          </pattern>
        ))}
    </defs>
  ) : null

  // Render bands widest-to-narrowest so narrower bands paint over wider
  // ones. Each successive (narrower) band uses a stronger fill opacity
  // to produce nested-ring fan geometry without flattening the
  // --color-uncertainty token.
  const orderedBandMeta = [...bandMeta].sort(
    (a, b) => b.band.confidence_level - a.band.confidence_level,
  )
  const uncertaintyBands = orderedBandMeta.map((item, index) => {
    const baseOpacity = Math.min(0.18 + index * 0.14, 0.5)
    return (
      <Area
        key={`${item.band.series_id}-${item.band.confidence_level}-band`}
        dataKey={(datum: ChartDatum) => {
          const lower = datum[item.lowerKey]
          const upper = datum[item.upperKey]
          if (!isFiniteNumber(lower) || !isFiniteNumber(upper) || upper < lower) {
            return null
          }
          return [lower, upper]
        }}
        fill={item.band.is_illustrative ? `url(#${item.patternId})` : 'var(--color-uncertainty)'}
        fillOpacity={item.band.is_illustrative ? 1 : baseOpacity}
        isAnimationActive={false}
        legendType="rect"
        name={item.name}
        stroke="var(--color-border-strong)"
        strokeDasharray={item.band.is_illustrative ? '5 3' : undefined}
        strokeWidth={1}
        type="linear"
      />
    )
  })

  const lineChartBody = (
    <ComposedChart data={data} height={height} margin={{ top: 8, right: 8, bottom: 6, left: 6 }} width={chartWidth}>
      {uncertaintyPatterns}
      {commonChartChildren}
      {uncertaintyBands}
      {seriesMeta.map((item) => {
        const style = lineStyleForSeriesId(item.series.series_id)
        return (
          <Line
            key={item.series.series_id}
            connectNulls={style.connectNulls}
            dataKey={item.key}
            dot={
              style.showDots
                ? { r: style.dotRadius, stroke: 'var(--color-surface)', strokeWidth: 1.5, fill: item.color }
                : false
            }
            isAnimationActive={false}
            name={item.series.label}
            stroke={item.color}
            strokeDasharray={style.strokeDasharray}
            strokeWidth={style.strokeWidth}
            type="linear"
          />
        )
      })}
    </ComposedChart>
  )

  const barSeries = seriesMeta.map((item) => (
    <Bar
      key={item.series.series_id}
      dataKey={item.key}
      fill={item.color}
      isAnimationActive={false}
      name={item.series.label}
      radius={[3, 3, 0, 0]}
    >
      {data.map((row, index) => (
        <Cell
          key={`${item.series.series_id}-${row[X_KEY]?.toString() ?? index}`}
          fill={item.color}
        />
      ))}
    </Bar>
  ))

  const barChartBody =
    bandMeta.length > 0 ? (
      <ComposedChart data={data} height={height} margin={{ top: 8, right: 8, bottom: 6, left: 6 }} width={chartWidth}>
        {uncertaintyPatterns}
        {commonChartChildren}
        {uncertaintyBands}
        {barSeries}
      </ComposedChart>
    ) : (
      <BarChart data={data} height={height} margin={{ top: 8, right: 8, bottom: 6, left: 6 }} width={chartWidth}>
        {commonChartChildren}
        {barSeries}
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
    <article className="chart-renderer" aria-labelledby={`chart-renderer-title-${localizedSpec.chart_id}`}>
      <header className="chart-renderer__header">
        <div className="chart-renderer__titles">
          <h3 id={`chart-renderer-title-${localizedSpec.chart_id}`}>{localizedSpec.title}</h3>
          {localizedSpec.subtitle.trim() ? <p>{localizedSpec.subtitle}</p> : null}
        </div>
        <AttributionBadge modelId={primaryModel} active />
      </header>

      <div className="chart-renderer__body" role="img" aria-label={chartAriaLabel} ref={bodyRef}>
        <p className="sr-only">{screenReaderSummary}</p>
        {measuredWidth > 0 ? chartBody : null}
      </div>
      <p className="chart-renderer__axis-note">
        {localizedSpec.x.label}
        {localizedSpec.x.unit ? ` (${formatAxisUnitLabel(localizedSpec.x.unit, locale)})` : ''} · {localizedSpec.y.label}
        {localizedSpec.y.unit ? ` (${formatAxisUnitLabel(localizedSpec.y.unit, locale)})` : ''}
      </p>
      {hasIllustrativeBand ? (
        <p className="chart-renderer__illustrative-note">
          {t('chartRenderer.illustrativeBand', { defaultValue: 'Illustrative uncertainty band (hatched).' })}
        </p>
      ) : null}

      {localizedSpec.takeaway.trim() ? (
        <p className="chart-renderer__takeaway">
          <strong>{t('chartRenderer.takeawayLabel', { defaultValue: 'Takeaway.' })}</strong> {localizedSpec.takeaway}
        </p>
      ) : null}

      {freshness ? <p className="chart-renderer__freshness">{freshness}</p> : null}
    </article>
  )
}
