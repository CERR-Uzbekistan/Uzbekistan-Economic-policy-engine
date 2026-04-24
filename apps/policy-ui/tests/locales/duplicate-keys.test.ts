import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it } from 'node:test'

type DuplicateJsonKey = {
  path: string
  key: string
}

type ParserState = {
  text: string
  index: number
  duplicates: DuplicateJsonKey[]
}

function skipWhitespace(state: ParserState): void {
  while (/\s/.test(state.text[state.index] ?? '')) {
    state.index += 1
  }
}

function parseString(state: ParserState): string {
  assert.equal(state.text[state.index], '"')
  state.index += 1
  let value = ''
  while (state.index < state.text.length) {
    const char = state.text[state.index]
    if (char === '"') {
      state.index += 1
      return value
    }
    if (char === '\\') {
      const escaped = state.text[state.index + 1]
      if (escaped === 'u') {
        value += state.text.slice(state.index, state.index + 6)
        state.index += 6
      } else {
        value += escaped
        state.index += 2
      }
      continue
    }
    value += char
    state.index += 1
  }
  throw new Error('Unterminated JSON string.')
}

function parseLiteralOrNumber(state: ParserState): void {
  while (state.index < state.text.length && !/[\s,\]}]/.test(state.text[state.index])) {
    state.index += 1
  }
}

function parseArray(state: ParserState, path: string): void {
  assert.equal(state.text[state.index], '[')
  state.index += 1
  let itemIndex = 0
  skipWhitespace(state)
  while (state.text[state.index] !== ']') {
    parseValue(state, `${path}[${itemIndex}]`)
    itemIndex += 1
    skipWhitespace(state)
    if (state.text[state.index] === ',') {
      state.index += 1
      skipWhitespace(state)
      continue
    }
    break
  }
  assert.equal(state.text[state.index], ']')
  state.index += 1
}

function parseObject(state: ParserState, path: string): void {
  assert.equal(state.text[state.index], '{')
  state.index += 1
  const seen = new Set<string>()
  skipWhitespace(state)
  while (state.text[state.index] !== '}') {
    const key = parseString(state)
    if (seen.has(key)) {
      state.duplicates.push({ path, key })
    }
    seen.add(key)
    skipWhitespace(state)
    assert.equal(state.text[state.index], ':')
    state.index += 1
    skipWhitespace(state)
    parseValue(state, path === '$' ? key : `${path}.${key}`)
    skipWhitespace(state)
    if (state.text[state.index] === ',') {
      state.index += 1
      skipWhitespace(state)
      continue
    }
    break
  }
  assert.equal(state.text[state.index], '}')
  state.index += 1
}

function parseValue(state: ParserState, path: string): void {
  skipWhitespace(state)
  const char = state.text[state.index]
  if (char === '{') {
    parseObject(state, path)
    return
  }
  if (char === '[') {
    parseArray(state, path)
    return
  }
  if (char === '"') {
    parseString(state)
    return
  }
  parseLiteralOrNumber(state)
}

function findDuplicateJsonKeys(text: string): DuplicateJsonKey[] {
  const state: ParserState = { text, index: 0, duplicates: [] }
  parseValue(state, '$')
  skipWhitespace(state)
  assert.equal(state.index, text.length)
  return state.duplicates
}

describe('locale JSON duplicate-key guard', () => {
  it('detects duplicate keys before JSON.parse would overwrite them', () => {
    const duplicates = findDuplicateJsonKeys('{"nav":{"overview":"A","overview":"B"}}')
    assert.deepEqual(duplicates, [{ path: 'nav', key: 'overview' }])
  })

  it('keeps all active locale files duplicate-free', () => {
    const localeDir = join(process.cwd(), 'src', 'locales')
    const localeFiles = ['en/common.json', 'ru/common.json', 'uz/common.json']
    const failures = localeFiles.flatMap((relativePath) => {
      const fullPath = join(localeDir, relativePath)
      return findDuplicateJsonKeys(readFileSync(fullPath, 'utf8')).map(
        (duplicate) => `${basename(relativePath)} ${duplicate.path}.${duplicate.key}`,
      )
    })

    assert.deepEqual(failures, [])
  })
})

