import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const TRANSFORM_MAP_PATH = fileURLToPath(
  new URL('../../../../../../docs/data-bridge/dfm-transformation-map.json', import.meta.url),
)
const DFM_PUBLIC_ARTIFACT_PATH = fileURLToPath(
  new URL('../../../../public/data/dfm.json', import.meta.url),
)
const SOURCE_REFIT_SUMMARY_PATH = fileURLToPath(
  new URL('../../../../../../docs/data-bridge/dfm-source-refit-summary.json', import.meta.url),
)

type TransformRow = {
  source_sheet: string
  source_column: string
  variable_id: string
  transformation: string
  source_workflow_confirmation: string
  recommended_transformation: string
  rationale: string
  risk_flags: string[]
  model_owner_decision_status: string
  public_display_allowed: boolean
  public_display_guidance: string
  unit: string
  frequency: string
  missing_value_rule: string
  model_role: string
  transformation_status: string
}

function loadTransformMap(): { variables: TransformRow[] } {
  return JSON.parse(readFileSync(TRANSFORM_MAP_PATH, 'utf8')) as { variables: TransformRow[] }
}

describe('DFM transformation map', () => {
  it('covers every current public DFM indicator with explicit source and transformation fields', () => {
    const transformMap = loadTransformMap()
    const payload = JSON.parse(readFileSync(DFM_PUBLIC_ARTIFACT_PATH, 'utf8')) as {
      indicators: Array<{ indicator_id: string }>
      metadata: { transformation_map: { public_indicator_coverage: string } }
    }
    const rowsById = new Map(transformMap.variables.map((row) => [row.variable_id, row]))

    assert.equal(payload.metadata.transformation_map.public_indicator_coverage, '36_of_36')
    for (const indicator of payload.indicators) {
      const row = rowsById.get(indicator.indicator_id)
      assert.ok(row, `missing transform map row for ${indicator.indicator_id}`)
      assert.ok(row.source_sheet.length > 0)
      assert.ok(row.source_column.length > 0)
      assert.ok(row.transformation.includes('log-difference'))
      assert.ok(row.source_workflow_confirmation.includes('calculate_growth.R'))
      assert.ok(row.unit.length > 0)
      assert.match(row.frequency, /monthly|quarterly|weekly/)
      assert.ok(row.missing_value_rule.includes('Missing observations'))
      assert.match(row.model_role, /target_quarterly_gdp|high_frequency_indicator/)
      assert.match(row.model_owner_decision_status, /approved|approved_with_caveat|blocked_needs_owner_decision/)
      assert.equal(row.model_owner_decision_status, row.transformation_status)
      assert.ok(row.recommended_transformation.length > 30)
      assert.ok(row.rationale.length > 60)
      assert.equal(typeof row.public_display_allowed, 'boolean')
      assert.ok(row.public_display_guidance.includes('standardized') || row.model_role === 'target_quarterly_gdp')
    }
  })

  it('records row-level owner-review decisions for risky indicators', () => {
    const rowsById = new Map(loadTransformMap().variables.map((row) => [row.variable_id, row]))
    const required = [
      'ip_cppy',
      'financial_sound',
      'rate_1y',
      'uzs_usd',
      'kazakh_leadind',
      'IDA_yoy',
      'IDA_mom',
      'ind_percap_grwth',
      'const_grwth',
      'IND_YOY',
      'wholesale_trade_grwth',
      'retail_trade_grwth',
      'services_grwth',
      'manf_YOY',
    ]

    for (const id of required) {
      const row = rowsById.get(id)
      assert.ok(row, `missing transform row for ${id}`)
      assert.ok(row.risk_flags.length > 0, `missing risk flags for ${id}`)
      assert.notEqual(row.model_owner_decision_status, 'needs_economist_review')
      assert.match(row.model_owner_decision_status, /approved_with_caveat|blocked_needs_owner_decision/)
      assert.doesNotMatch(row.rationale.toLowerCase(), /tbd|todo|review needed|confirm whether/)
      assert.ok(row.public_display_allowed, `${id} contribution should remain displayable as a factor signal`)
    }

    assert.equal(rowsById.get('gdp')?.model_role, 'target_quarterly_gdp')
    assert.equal(rowsById.get('rate_1y')?.transformation_status, 'blocked_needs_owner_decision')
    assert.equal(rowsById.get('IND_YOY')?.transformation_status, 'approved_with_caveat')
    assert.equal(rowsById.get('uzs_usd')?.frequency, 'weekly')
    assert.equal(rowsById.get('uzs_usd')?.transformation_status, 'blocked_needs_owner_decision')
  })

  it('preserves the public contribution guardrail in the transformation map', () => {
    const transformMap = loadTransformMap()

    for (const row of transformMap.variables) {
      if (row.model_role === 'target_quarterly_gdp') continue
      assert.ok(
        row.public_display_guidance.includes('not be read as a GDP percentage-point effect'),
        `missing factor-signal guardrail for ${row.variable_id}`,
      )
    }
  })

  it('records a completed local source refit that matches the public nowcast', () => {
    const refit = JSON.parse(readFileSync(SOURCE_REFIT_SUMMARY_PATH, 'utf8')) as {
      artifact: { status: string; r_version: string }
      runtime: { report_render_status: string }
      estimation: { status: string; converged: boolean; iterations: number }
      current_nowcast: {
        source_period: string
        public_period: string
        source_gdp_growth_yoy_pct: number
        public_gdp_growth_yoy_pct: number
        yoy_difference_source_minus_public_pp: number
      }
    }

    assert.equal(refit.artifact.status, 'completed_without_pdf_report')
    assert.match(refit.artifact.r_version, /^4\./)
    assert.equal(refit.estimation.status, 'completed')
    assert.equal(refit.estimation.converged, true)
    assert.equal(refit.estimation.iterations, 155)
    assert.equal(refit.current_nowcast.source_period, refit.current_nowcast.public_period)
    assert.equal(refit.current_nowcast.source_gdp_growth_yoy_pct, refit.current_nowcast.public_gdp_growth_yoy_pct)
    assert.equal(refit.current_nowcast.yoy_difference_source_minus_public_pp, 0)
    assert.equal(refit.runtime.report_render_status, 'skipped_by_runner_pandoc_not_available')
  })
})
