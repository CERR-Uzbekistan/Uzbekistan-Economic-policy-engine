import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { PRIMARY_NAV_ITEMS } from '../../src/app/shell/nav.js'

const ROUTER_PATH = fileURLToPath(new URL('../../../src/app/router.tsx', import.meta.url))
const PAGE_PATH = fileURLToPath(new URL('../../../src/pages/PolicyChatPage.tsx', import.meta.url))
const CSS_PATH = fileURLToPath(new URL('../../../src/pages/policy-chat.css', import.meta.url))
const CLIENT_PATH = fileURLToPath(new URL('../../../src/data/policy-chat/client.ts', import.meta.url))

type LocaleShape = {
  nav: { policyChat: string }
  pages: { policyChat: { title: string; description: string } }
}

function locale(locale: string): LocaleShape {
  const path = fileURLToPath(new URL(`../../../src/locales/${locale}/common.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as LocaleShape
}

describe('Policy Chat page foundation', () => {
  it('places Policy Chat after Scenario Lab in route and development navigation order', () => {
    const router = readFileSync(ROUTER_PATH, 'utf8')
    assert.ok(router.indexOf("path: 'scenario-lab'") < router.indexOf("path: 'policy-chat'"))
    assert.ok(router.indexOf("path: 'policy-chat'") < router.indexOf("path: 'comparison'"))

    const paths = PRIMARY_NAV_ITEMS.map((item) => item.path)
    assert.equal(paths.indexOf('/policy-chat'), paths.indexOf('/scenario-lab') + 1)
  })

  it('keeps execution behind an explicit assumption-review action', () => {
    const page = readFileSync(PAGE_PATH, 'utf8')
    assert.match(page, /isDirty \? \(/)
    assert.match(page, /executePolicyChatProposal\(proposal\)/)
    assert.match(page, /disabled=\{isBusy \|\| isDirty\}/)
    const client = readFileSync(CLIENT_PATH, 'utf8')
    assert.match(client, /proposal_hash: proposal\.proposal_hash/)
  })

  it('includes accessible chart semantics and a tabular alternative', () => {
    const page = readFileSync(PAGE_PATH, 'utf8')
    assert.match(page, /role="img"/)
    assert.match(page, /<title id="policy-chat-chart-title">/)
    assert.match(page, /<desc id="policy-chat-chart-desc">/)
    assert.match(page, /<table>/)
    assert.match(page, /<th scope="row">/)
  })

  it('renders governed QPM, DFM, and I-O result surfaces and scenario handoff', () => {
    const page = readFileSync(PAGE_PATH, 'utf8')
    assert.match(page, /run\.model_id === 'qpm'/)
    assert.match(page, /run\.model_id === 'dfm'/)
    assert.match(page, /run\.model_id === 'io'/)
    assert.match(page, /saveScenario\(/)
    assert.match(page, /navigate\('\/scenario-lab'\)/)
  })
  it('exposes localized navigation and page identity in all supported locales', () => {
    for (const language of ['en', 'ru', 'uz']) {
      const value = locale(language)
      assert.equal(typeof value.nav.policyChat, 'string')
      assert.ok(value.nav.policyChat.length > 0)
      assert.equal(typeof value.pages.policyChat.title, 'string')
      assert.ok(value.pages.policyChat.description.length > 0)
    }
  })

  it('avoids the prohibited accent-stripe and gradient-text patterns', () => {
    const css = readFileSync(CSS_PATH, 'utf8')
    assert.doesNotMatch(css, /border-(?:left|right):\s*[2-9]/)
    assert.doesNotMatch(css, /background-clip:\s*text/)
  })
})
