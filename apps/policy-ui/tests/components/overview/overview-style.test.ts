import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const css = readFileSync(join(process.cwd(), 'src/pages/overview.css'), 'utf8')

describe('Overview CSS contracts', () => {
  it('keeps delta color semantics neutral', () => {
    const deltaColorRules = [
      /\.overview-kpi-trend__glyph\s*\{[^}]*color:\s*var\(--color-text-muted\)/s,
      /\.overview-indicator-row__delta\s*\{[^}]*color:\s*var\(--color-text-muted\)/s,
    ]

    for (const rule of deltaColorRules) {
      assert.match(css, rule)
    }

    assert.doesNotMatch(
      css,
      /(?:overview-kpi-trend(?:__glyph)?|overview-indicator-row__delta)[^{]*\{[^}]*(?:--color-(?:upside|downside|success|danger)|#(?:0f|16|22|b9|dc|ef))/is,
    )
  })
})
