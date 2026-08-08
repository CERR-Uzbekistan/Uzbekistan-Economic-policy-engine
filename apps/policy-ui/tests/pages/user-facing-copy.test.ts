import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const LOCALE_SOURCES = ['en', 'ru', 'uz'].map((locale) =>
  fileURLToPath(new URL(`../../../src/locales/${locale}/common.json`, import.meta.url)),
)

const KNOWLEDGE_HUB_COMPONENTS = [
  'BriefCard.tsx',
  'ResearchBriefList.tsx',
  'ReformCandidateList.tsx',
  'ReformTimeline.tsx',
  'TimelineItem.tsx',
]

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

function visibleCopy(locale: Record<string, unknown>): string {
  return collectStrings({
    trustState: locale.trustState,
    nav: locale.nav,
    pages: locale.pages,
    overview: locale.overview,
    scenarioLab: locale.scenarioLab,
    comparison: locale.comparison,
    dataRegistry: locale.dataRegistry,
    modelExplorer: locale.modelExplorer,
    states: locale.states,
  }).join('\n')
}

describe('user-facing page copy', () => {
  it('keeps internal implementation labels out of active page locales', () => {
    const banned = /\b(artifact|guard|fallback|mock fixture|mock engine|live bridge json|bridge output|bridge evidence|bridge caveats|source vintage|artifact export|metadata source|overview metadata|SME content|MCP|sprint|shell|static fallback)\b/i

    for (const localePath of LOCALE_SOURCES) {
      const locale = JSON.parse(readFileSync(localePath, 'utf8'))
      assert.doesNotMatch(visibleCopy(locale), banned, localePath)
    }
  })

  it('does not keep orphaned Knowledge Hub candidate/review components in source', () => {
    for (const fileName of KNOWLEDGE_HUB_COMPONENTS) {
      assert.throws(
        () => readFileSync(fileURLToPath(new URL(`../../../src/components/knowledge-hub/${fileName}`, import.meta.url))),
        /ENOENT/,
        `${fileName} should not remain as an unused visible-copy surface`,
      )
    }
  })
})
