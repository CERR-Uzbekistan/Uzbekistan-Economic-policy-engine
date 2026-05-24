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

type TransformRow = {
  source_sheet: string
  source_column: string
  variable_id: string
  transformation: string
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
      assert.ok(row.unit.length > 0)
      assert.match(row.frequency, /monthly|quarterly|weekly/)
      assert.ok(row.missing_value_rule.includes('Missing observations'))
      assert.match(row.model_role, /target_quarterly_gdp|high_frequency_indicator/)
    }
  })

  it('flags rate, native-unit, and already-growth indicators for guarded interpretation', () => {
    const rowsById = new Map(loadTransformMap().variables.map((row) => [row.variable_id, row]))
    const required = ['gdp', 'm0', 'rate_1y', 'IND_YOY', 'wholesale_trade_grwth', 'uzs_usd']

    for (const id of required) {
      const row = rowsById.get(id)
      assert.ok(row, `missing transform row for ${id}`)
      assert.ok(row.transformation_status.length > 0)
    }

    assert.equal(rowsById.get('gdp')?.model_role, 'target_quarterly_gdp')
    assert.equal(rowsById.get('rate_1y')?.transformation_status, 'needs_economist_review')
    assert.equal(rowsById.get('IND_YOY')?.transformation_status, 'needs_economist_review')
    assert.equal(rowsById.get('uzs_usd')?.frequency, 'weekly')
  })
})
