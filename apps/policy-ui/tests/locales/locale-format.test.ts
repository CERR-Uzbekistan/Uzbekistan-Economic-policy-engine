import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  formatCurrencyAmount,
  formatDate,
  formatNumber,
  formatPercentagePoint,
  formatPercent,
  formatQuarterLabel,
  formatSectorCount,
  formatUnavailable,
} from '../../src/lib/format/locale-format.js'

function visible(value: string): string {
  return value.replace(/\s/g, ' ')
}

function locale(locale: 'en' | 'ru' | 'uz') {
  return JSON.parse(readFileSync(join(process.cwd(), 'src', 'locales', locale, 'common.json'), 'utf8'))
}

describe('locale format helpers', () => {
  it('formats numbers, units, dates, quarters, and unavailable values by locale', () => {
    assert.equal(formatNumber(1234.5, 'en', { maximumFractionDigits: 1, minimumFractionDigits: 1 }), '1,234.5')
    assert.match(visible(formatNumber(1234.5, 'ru', { maximumFractionDigits: 1, minimumFractionDigits: 1 })), /1 234,5/)
    assert.match(visible(formatNumber(1234.5, 'uz', { maximumFractionDigits: 1, minimumFractionDigits: 1 })), /1 234,5/)

    assert.equal(formatNumber(-12.3, 'en', { maximumFractionDigits: 1, minimumFractionDigits: 1 }), '-12.3')
    assert.equal(formatNumber(0, 'en', { maximumFractionDigits: 0 }), '0')
    assert.equal(formatNumber(null, 'en'), 'n/a')
    assert.equal(formatUnavailable('ru'), 'н/д')
    assert.equal(formatUnavailable('uz'), 'mavjud emas')

    assert.equal(formatPercent(7, 'en'), '7.0%')
    assert.match(formatPercent(7, 'ru'), /7,0%/)
    assert.equal(formatPercentagePoint(1.25, 'en', 2), '1.25 pp')
    assert.match(formatPercentagePoint(1.25, 'ru', 2), /1,25 п\.п\./)

    assert.equal(formatQuarterLabel('Q1 2026', 'en'), 'Q1 2026')
    assert.equal(formatQuarterLabel('2026 Q1 nowcast', 'ru'), '1 кв. 2026')
    assert.equal(formatQuarterLabel('2026Q1', 'uz'), '2026 1-chorak')
    assert.match(formatDate('2026-05-02T00:00:00Z', 'en'), /2026/)
    assert.match(formatCurrencyAmount(1200, 'bln_uzs', 'ru', { maximumFractionDigits: 0 }), /млрд сумов/)
    assert.match(formatCurrencyAmount(1200, 'mln_usd', 'uz', { maximumFractionDigits: 0 }), /AQSH dollari/)
  })

  it('handles Russian sector-count plural forms for 1, 2, 5, and 21', () => {
    assert.equal(formatSectorCount(1, 'ru'), '1 сектор')
    assert.equal(formatSectorCount(2, 'ru'), '2 сектора')
    assert.equal(formatSectorCount(5, 'ru'), '5 секторов')
    assert.equal(formatSectorCount(21, 'ru'), '21 сектор')
  })
})

describe('locale chrome parity', () => {
  it('keeps selected RU/UZ chrome labels translated rather than English placeholders', () => {
    const en = locale('en')
    const ru = locale('ru')
    const uz = locale('uz')
    const keys = [
      ['trustState', 'labels', 'mockFixture'],
      ['trustState', 'labels', 'liveBridgeJson'],
      ['trustState', 'labels', 'fallbackMock'],
      ['shell', 'globalUtilitiesAria'],
      ['overview', 'nowcast', 'series', 'period'],
      ['scenarioLab', 'modelTabs', 'status', 'bridgePilot'],
      ['chartRenderer', 'empty'],
    ] as const

    for (const path of keys) {
      const read = (root: Record<string, unknown>) =>
        path.reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], root)
      assert.notEqual(read(ru), read(en), path.join('.'))
      assert.notEqual(read(uz), read(en), path.join('.'))
    }
  })
})
