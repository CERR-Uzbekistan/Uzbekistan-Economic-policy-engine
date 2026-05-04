import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PendingSurface } from '../../../src/components/system/PendingSurface.js'

describe('PendingSurface', () => {
  it('renders status, message, reason label, and optional next step', () => {
    const markup = renderToStaticMarkup(
      <PendingSurface
        title="FPP pending"
        message="This model lane is not active in the preview."
        reasonLabel="Pending"
        nextStep="Next: accept the source contract."
      />,
    )

    assert.match(markup, /role="status"/)
    assert.match(markup, /FPP pending/)
    assert.match(markup, /This model lane is not active/)
    assert.match(markup, /Pending/)
    assert.match(markup, /Next: accept the source contract/)
  })

  it('omits the next-step paragraph when no next step is supplied', () => {
    const markup = renderToStaticMarkup(
      <PendingSurface title="HFI pending" message="No source feed connected." reasonLabel="Pending" />,
    )

    assert.match(markup, /HFI pending/)
    assert.match(markup, /No source feed connected/)
    assert.doesNotMatch(markup, /pending-surface__next/)
  })
})
