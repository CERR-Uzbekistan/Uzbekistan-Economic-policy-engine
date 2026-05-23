import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getRovingTabIndexForKey } from '../../../src/components/scenario-lab/tabKeyboard.js'

describe('Scenario Lab roving-tab keyboard helper', () => {
  it('moves across tabs with arrow keys and wraps at each end', () => {
    assert.equal(getRovingTabIndexForKey('ArrowRight', 0, 4), 1)
    assert.equal(getRovingTabIndexForKey('ArrowDown', 3, 4), 0)
    assert.equal(getRovingTabIndexForKey('ArrowLeft', 0, 4), 3)
    assert.equal(getRovingTabIndexForKey('ArrowUp', 2, 4), 1)
  })

  it('supports Home and End keys', () => {
    assert.equal(getRovingTabIndexForKey('Home', 2, 4), 0)
    assert.equal(getRovingTabIndexForKey('End', 1, 4), 3)
  })

  it('ignores non-navigation keys and invalid tablists', () => {
    assert.equal(getRovingTabIndexForKey('Enter', 1, 4), null)
    assert.equal(getRovingTabIndexForKey('ArrowRight', -1, 4), null)
    assert.equal(getRovingTabIndexForKey('ArrowRight', 0, 0), null)
  })
})
