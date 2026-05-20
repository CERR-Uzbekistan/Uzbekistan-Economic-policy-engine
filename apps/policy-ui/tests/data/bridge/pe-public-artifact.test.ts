import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  runScenarioLabPeTradeShock,
  toScenarioLabPeAnalyticsWorkspace,
} from '../../../src/data/bridge/pe-adapter.js'
import {
  fetchPeBridgePayload,
  PeTransportError,
  PeValidationError,
  resolvePeDefaultDataUrl,
} from '../../../src/data/bridge/pe-client.js'
import { validatePeBridgePayload } from '../../../src/data/bridge/pe-guard.js'
import type { PeBridgePayload } from '../../../src/data/bridge/pe-types.js'

const PE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/pe.json', import.meta.url))

function loadPublicPePayload(): PeBridgePayload {
  return JSON.parse(readFileSync(PE_PUBLIC_ARTIFACT_PATH, 'utf8')) as PeBridgePayload
}

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

describe('pe bridge public artifact', () => {
  it('accepts the generated public PE bridge payload', () => {
    const validation = validatePeBridgePayload(loadPublicPePayload())

    assert.equal(validation.ok, true)
    assert.ok(validation.value)
    assert.equal(validation.value.metadata.source_artifact, 'mcp_server/data/pe_data.json')
    assert.equal(validation.value.metadata.hs_sections, 19)
    assert.equal(validation.value.metadata.hs_chapters, 97)
    assert.equal(validation.value.metadata.partners, 60)
    assert.equal(validation.value.sections.length, 19)
    assert.equal(Object.keys(validation.value.chapters).length, 97)
    assert.equal(validation.value.partners.length, 60)
    assert.equal(validation.value.elasticities.XVII, 2.8)
  })

  it('rejects malformed section elasticities with a path-scoped issue', () => {
    const payload = clonePayload(loadPublicPePayload())
    delete payload.elasticities.XVII

    const validation = validatePeBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'elasticities'),
      true,
    )
  })

  it('runs direct tariff-incidence shocks with section and partner filters', () => {
    const validation = validatePeBridgePayload(loadPublicPePayload())
    assert.ok(validation.value)

    const workspace = toScenarioLabPeAnalyticsWorkspace(validation.value)
    const allTransport = runScenarioLabPeTradeShock(validation.value, {
      tariff_cut_pct: 20,
      section_id: 'XVII',
      regime: 'all',
      partner_name: 'all',
    })
    const doubleCut = runScenarioLabPeTradeShock(validation.value, {
      tariff_cut_pct: 40,
      section_id: 'XVII',
      regime: 'all',
      partner_name: 'all',
    })
    const firstPartner = workspace.partners[0]
    const partnerRun = runScenarioLabPeTradeShock(validation.value, {
      tariff_cut_pct: 20,
      section_id: 'XVII',
      regime: 'all',
      partner_name: firstPartner.name,
    })

    assert.equal(workspace.section_count, 19)
    assert.equal(allTransport.top_sections[0].section_id, 'XVII')
    assert.equal(doubleCut.totals.trade_effect_usd, allTransport.totals.trade_effect_usd * 2)
    assert.equal(partnerRun.totals.partner_import_share, Number(firstPartner.import_share.toFixed(6)))
    assert.ok(partnerRun.totals.trade_effect_usd < allTransport.totals.trade_effect_usd)
  })

  it('supports tariff increases by reversing the direct PE effect signs', () => {
    const validation = validatePeBridgePayload(loadPublicPePayload())
    assert.ok(validation.value)

    const tariffCut = runScenarioLabPeTradeShock(validation.value, {
      tariff_cut_pct: 20,
      section_id: 'XVII',
      regime: 'all',
      partner_name: 'all',
    })
    const tariffIncrease = runScenarioLabPeTradeShock(validation.value, {
      tariff_cut_pct: -20,
      section_id: 'XVII',
      regime: 'all',
      partner_name: 'all',
    })

    assert.equal(tariffIncrease.request.tariff_cut_pct, -20)
    assert.equal(tariffIncrease.totals.trade_effect_usd, -tariffCut.totals.trade_effect_usd)
    assert.equal(tariffIncrease.totals.welfare_usd, -tariffCut.totals.welfare_usd)
    assert.equal(tariffIncrease.totals.revenue_change_usd, -tariffCut.totals.revenue_change_usd)
  })
})

describe('pe bridge client', () => {
  it('resolves the default public artifact URL against the Vite base path', () => {
    assert.equal(resolvePeDefaultDataUrl(undefined), '/data/pe.json')
    assert.equal(
      resolvePeDefaultDataUrl('/Uzbekistan-Economic-policy-engine/policy-ui/'),
      '/Uzbekistan-Economic-policy-engine/policy-ui/data/pe.json',
    )
  })

  it('fetches and validates PE bridge payload through the shared bridge fetch helper', async () => {
    const payload = loadPublicPePayload()
    const fetched = await fetchPeBridgePayload(() =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    assert.equal(fetched.attribution.model_id, 'pe-trade-shock')
    assert.equal(fetched.metadata.hs_sections, 19)
  })

  it('preserves PE-specific transport and validation errors', async () => {
    await assert.rejects(
      () => fetchPeBridgePayload(() => Promise.resolve(new Response('', { status: 404 }))),
      (error) => error instanceof PeTransportError && error.kind === 'http' && error.status === 404,
    )

    await assert.rejects(
      () =>
        fetchPeBridgePayload(() =>
          Promise.resolve(
            new Response(JSON.stringify({ sections: [] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        ),
      (error) => error instanceof PeValidationError && error.issues.length > 0,
    )
  })
})
