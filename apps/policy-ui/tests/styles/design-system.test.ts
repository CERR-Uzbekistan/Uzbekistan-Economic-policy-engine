import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')
const baseCss = readFileSync(join(process.cwd(), 'src/styles/base.css'), 'utf8')
const knowledgeHubCss = readFileSync(join(process.cwd(), 'src/pages/knowledge-hub.css'), 'utf8')
const scenarioLabCss = readFileSync(join(process.cwd(), 'src/pages/scenario-lab.css'), 'utf8')

describe('policy UI design system', () => {
  it('defines the shared institutional dashboard tokens used by pages', () => {
    for (const token of [
      '--color-link',
      '--color-success-border',
      '--color-warn-border',
      '--color-danger',
      '--color-danger-border',
      '--color-cost',
      '--color-overlay',
      '--shadow-elevated',
      '--shadow-modal',
      '--radius-pill',
      '--font-body',
    ]) {
      assert.match(tokensCss, new RegExp(`${token}:`))
    }
  })

  it('keeps shared badges and app chrome on semantic tokens instead of local hex values', () => {
    for (const selector of [
      '.app-shell__nav-badge',
      '.ui-chip--warn',
      '.trust-state-label--success',
      '.trust-state-label--warn',
      '.pending-surface__label',
    ]) {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      assert.match(baseCss, new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*var\\(--color-`, 'm'))
    }

    assert.doesNotMatch(baseCss, /#(?:e7d5a7|bed6c7)/i)
    assert.doesNotMatch(baseCss, /border-radius:\s*99px/)
  })

  it('keeps Knowledge Hub and Scenario Lab aligned to shared tokens', () => {
    assert.doesNotMatch(knowledgeHubCss, /Georgia|#[0-9a-fA-F]{3,8}|rgba\(/)
    assert.doesNotMatch(scenarioLabCss, /#[0-9a-fA-F]{3,8}|rgba\(/)
  })
})
