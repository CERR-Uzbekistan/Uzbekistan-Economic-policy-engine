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

  it('does not size or clip Recharts internal wrappers or surfaces', () => {
    // Regression: sizing/clipping rules on Recharts internals caused the
    // nowcast chart to disappear. Constrain only the outer chart container
    // and chart body; never Recharts-generated wrappers or SVG internals.
    assert.doesNotMatch(
      css,
      /\.overview-nowcast-column[^{]*\.recharts-responsive-container[^{]*\{[^}]*(?:max-width|width|height|min-width|max-height|min-height|overflow|clip|clip-path)[^}]*\}/s,
    )
    assert.doesNotMatch(
      css,
      /\.overview-nowcast-column[^{]*\.recharts-wrapper[^{]*\{[^}]*(?:max-width|width|height|min-width|max-height|min-height|overflow|clip|clip-path)[^}]*\}/s,
    )
    assert.doesNotMatch(
      css,
      /\.overview-nowcast-column[^{]*\.recharts-surface[^{]*\{[^}]*(?:max-width|width|height|min-width|max-height|min-height|overflow|clip|clip-path)[^}]*\}/s,
    )
  })

  it('keeps first-screen overview rows wrap-safe at narrow widths', () => {
    const requiredRules = [
      /\.overview-page \.page-header__meta\s*\{[^}]*overflow-wrap:\s*anywhere/s,
      /\.overview-state-header__pulse\s*\{[^}]*overflow-wrap:\s*anywhere/s,
      /\.overview-kpi-card__label\s*\{[^}]*overflow-wrap:\s*anywhere/s,
      /\.overview-kpi-card__context-note\s*\{[^}]*-webkit-line-clamp:\s*2/s,
      /\.overview-data-notes__summary\s*\{[^}]*overflow-wrap:\s*anywhere/s,
    ]

    for (const rule of requiredRules) {
      assert.match(css, rule)
    }
  })
})
