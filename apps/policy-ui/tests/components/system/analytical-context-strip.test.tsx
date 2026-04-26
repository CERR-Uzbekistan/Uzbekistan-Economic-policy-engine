import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnalyticalContextStrip } from '../../../src/components/system/AnalyticalContextStrip.js'

describe('AnalyticalContextStrip', () => {
  it('renders current analytical context for Macro/QPM', () => {
    const markup = renderToStaticMarkup(
      <AnalyticalContextStrip
        label="Context:"
        lane="Macro scenario"
        model="QPM"
        runName="Baseline"
        dataVintage="data vintage mock-v1"
        saveState="unsaved"
      />,
    )

    assert.match(markup, /Context:/)
    assert.match(markup, /Macro scenario · QPM · Baseline · data vintage mock-v1 · unsaved/)
  })

  it('renders current analytical context for I-O sector linkage', () => {
    const markup = renderToStaticMarkup(
      <AnalyticalContextStrip
        label="Context:"
        lane="Sector linkage"
        model="I-O"
        runName="I-O Sector Shock"
        dataVintage="data vintage 2022"
        saveState="unsaved"
      />,
    )

    assert.match(markup, /Sector linkage · I-O · I-O Sector Shock · data vintage 2022 · unsaved/)
  })
})
