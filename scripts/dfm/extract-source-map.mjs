import { inflateRawSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const WORKBOOK_PATH = 'model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx'
const OUTPUT_JSON = 'docs/data-bridge/dfm-transformation-map.json'
const OUTPUT_CSV = 'docs/data-bridge/dfm-transformation-map.csv'

const MONTHLY_SHEET = 'Request Monthly'
const QUARTERLY_SHEET = 'Request Quarterly'

const MODEL_INPUT_RULE =
  'Source R workflow: optional X-13 seasonal adjustment when flagged, then log-difference over non-missing observations; first three rows are dropped so the estimation sample starts at settings.R start_date.'
const MISSING_RULE =
  'Missing observations are retained as NA in the ragged-edge panel. Growth is computed only across non-missing observations, then written back to the original positions; leading/ending all-NA rows are removed before EM estimation and the Kalman filter smooths remaining gaps.'
const SOURCE_WORKFLOW_CONFIRMATION =
  'Confirmed in main.R -> prepare_data.R -> calculate_growth.R: the current source workflow applies the same log-difference rule to every variable after optional X-13 seasonal adjustment.'
const DEFAULT_PUBLIC_DISPLAY =
  'Yes for internal preview: contribution is a standardized common-factor signal and must not be read as a GDP percentage-point effect.'

const REVIEW_DECISIONS = {
  gdp: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Quarterly GDP level -> log quarter-on-quarter growth for model input; postprocess predicted QoQ path into GDP levels and YoY percent.',
    rationale:
      'GDP is the quarterly target level, so log QoQ growth is economically meaningful for the state-space model; published YoY growth should come only from the GDP post-processing step.',
    riskFlags: ['target_postprocess', 'seasonality'],
    publicDisplayAllowed: false,
    publicDisplayGuidance:
      'No as a top high-frequency contribution: GDP is the target row and should be excluded from indicator-contribution diagnostics.',
  },
  ip_cppy: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Treat as an already year-on-year index: use log(index / 100) or index minus 100 as the growth signal; do not log-difference the index again.',
    rationale:
      'CPPY=100 means the observation already compares output with the corresponding period of the previous year. Differencing its log measures acceleration of the YoY rate, not industrial-output growth.',
    riskFlags: ['index', 'already_growth_series', 'seasonality'],
  },
  financial_sound: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the NPL ratio as a monthly percentage-point change for model input; keep the ratio level only for descriptive diagnostics.',
    rationale:
      'The nonperforming-loan share is a financial ratio, not a quantity level. A percentage-point change is interpretable as credit-quality deterioration or improvement, while log-changing the ratio can overstate movements when the ratio is low.',
    riskFlags: ['ratio', 'rate'],
  },
  rate_1y: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the month-to-month percentage-point change in the 1-year deposit rate for the DFM input; keep the rate level for interpretation.',
    rationale:
      'Interest rates are already measured in percent per year. A percentage-point change captures monetary and funding-cost news directly; a log-change of the rate itself is not a standard macro-financial signal.',
    riskFlags: ['rate', 'unit_mismatch'],
  },
  uzs_usd: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Aggregate weekly UZS/USD observations to a monthly average, then use the log monthly change in UZS per USD as depreciation/appreciation news.',
    rationale:
      'The exchange-rate level can be transformed with log changes, but the source frequency is weekly. A monthly average gives a stable monthly signal and avoids making the DFM depend on a single end-of-month quote.',
    riskFlags: ['weekly_frequency', 'unit_mismatch'],
  },
  kazakh_leadind: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use index minus 100 as a YTD-over-previous-year foreign-activity signal; do not log-difference the cumulative YTD index.',
    rationale:
      'The source is a change YTD PY=100 index, so it is already a cumulative growth comparison. Using the deviation from 100 preserves the foreign-activity signal; log-differencing would mix monthly revisions with changes in the YTD comparison window.',
    riskFlags: ['index', 'already_growth_series', 'seasonality', 'label_ambiguity'],
  },
  IDA_yoy: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the native YoY business-activity signal after owner confirmation of scaling; do not apply an additional log-difference.',
    rationale:
      'The label says year-on-year, so the series already represents a growth comparison. The unusually large index scale needs a documented scaling convention before production.',
    riskFlags: ['already_growth_series', 'index', 'unit_mismatch'],
  },
  IDA_mom: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the native MoM business-activity signal after owner confirmation of scaling; do not apply an additional log-difference.',
    rationale:
      'The label says month-on-month, so the series is already a short-run change indicator. Log-differencing it would turn the model input into a change in the change rate.',
    riskFlags: ['already_growth_series', 'index', 'unit_mismatch'],
  },
  ind_percap_grwth: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the growth-rate index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'Industrial production per capita is already supplied as a growth-rate index near 100. The economically relevant signal is the growth rate itself, not its month-to-month acceleration.',
    riskFlags: ['already_growth_series', 'index'],
  },
  const_grwth: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the construction growth-rate index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'The construction row is labelled as a growth rate and has values around a PY=100 index. Differencing the log would measure acceleration rather than construction growth.',
    riskFlags: ['already_growth_series', 'index'],
  },
  IND_YOY: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the industry YoY index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'This row is explicitly year-on-year industry growth. A second log-difference would remove the level of YoY growth that the model owner likely wants as the activity signal.',
    riskFlags: ['already_growth_series', 'index'],
  },
  wholesale_trade_grwth: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the wholesale-trade growth-rate index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'The source is a trade growth indicator, so the model input should preserve that growth signal. Log-differencing would convert it to a change in the reported growth rate.',
    riskFlags: ['already_growth_series', 'index'],
  },
  retail_trade_grwth: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the retail-trade growth-rate index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'The row already reports retail trade growth. The DFM should standardize that growth signal rather than model the growth rate acceleration created by log-differencing.',
    riskFlags: ['already_growth_series', 'index', 'label_ambiguity'],
  },
  services_grwth: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the services growth-rate index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'The source is a services growth indicator. Keeping the growth rate is easier to interpret and avoids turning the signal into a second difference.',
    riskFlags: ['already_growth_series', 'index'],
  },
  manf_YOY: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the manufacturing YoY index directly as log(index / 100) or index minus 100; do not log-difference it again.',
    rationale:
      'This row is explicitly year-on-year manufacturing growth. The recommended transformation keeps the production-growth signal in the DFM instead of differencing it away.',
    riskFlags: ['already_growth_series', 'index'],
  },
  cpi_services: {
    status: 'approved',
    recommendedTransformation:
      'Use log-difference of the positive PP=100 price index to measure monthly services inflation.',
    rationale:
      'A CPI index is a price level. Log-differencing a positive price index produces an inflation-rate signal suitable for a stationary DFM input.',
    riskFlags: ['index'],
  },
  cpi_goods: {
    status: 'approved',
    recommendedTransformation:
      'Use log-difference of the positive PP=100 price index to measure monthly goods inflation.',
    rationale:
      'A CPI index is a price level. Log-differencing a positive price index produces an inflation-rate signal suitable for a stationary DFM input.',
    riskFlags: ['index'],
  },
  ppi: {
    status: 'approved',
    recommendedTransformation:
      'Use log-difference of the positive PP=100 producer-price index to measure monthly producer-price inflation.',
    rationale:
      'A producer-price index is a price level. Log-differencing a positive price index yields a producer inflation signal.',
    riskFlags: ['index'],
  },
  bus_clim: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the business-climate index in levels or first differences after owner confirmation of the survey scale; avoid treating it as a physical quantity level.',
    rationale:
      'Survey climate indexes are sentiment measures. They can help the factor, but the scale and zero point should be documented before a production refit.',
    riskFlags: ['index', 'label_ambiguity'],
  },
  bus_clim_exp: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Use the business-climate expectations index in levels or first differences after owner confirmation of the survey scale; avoid treating it as a physical quantity level.',
    rationale:
      'Expectations indexes are survey signals. Their economic interpretation depends on the survey scale, so production use needs the owner to document level versus change treatment.',
    riskFlags: ['index', 'label_ambiguity'],
  },
  stock_deals: {
    status: 'approved_with_caveat',
    recommendedTransformation:
      'Treat as a transaction-count level and use log-difference after confirming the unit should be Number, not Index.',
    rationale:
      'The label says number of stock-market deals while the metadata says Index. The log-growth transformation is plausible for a count, but the unit mismatch should be corrected.',
    riskFlags: ['unit_mismatch', 'label_ambiguity'],
  },
}

function readUInt(buffer, offset, length) {
  if (length === 2) return buffer.readUInt16LE(offset)
  if (length === 4) return buffer.readUInt32LE(offset)
  throw new Error(`Unsupported integer width: ${length}`)
}

function readZipEntries(path) {
  const buffer = readFileSync(path)
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error(`Could not find ZIP end record in ${path}`)

  const totalEntries = readUInt(buffer, eocd + 10, 2)
  const centralDirectoryOffset = readUInt(buffer, eocd + 16, 4)
  const entries = new Map()
  let offset = centralDirectoryOffset

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${i}`)
    }
    const method = readUInt(buffer, offset + 10, 2)
    const compressedSize = readUInt(buffer, offset + 20, 4)
    const uncompressedSize = readUInt(buffer, offset + 24, 4)
    const fileNameLength = readUInt(buffer, offset + 28, 2)
    const extraLength = readUInt(buffer, offset + 30, 2)
    const commentLength = readUInt(buffer, offset + 32, 2)
    const localOffset = readUInt(buffer, offset + 42, 4)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength)

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${name}`)
    }
    const localNameLength = readUInt(buffer, localOffset + 26, 2)
    const localExtraLength = readUInt(buffer, localOffset + 28, 2)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    let data
    if (method === 0) {
      data = compressed
    } else if (method === 8) {
      data = inflateRawSync(compressed)
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${name}`)
    }
    if (data.length !== uncompressedSize) {
      throw new Error(`Unexpected uncompressed size for ${name}`)
    }
    entries.set(name, data.toString('utf8'))
    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function xmlDecode(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`))
  return match ? xmlDecode(match[1]) : ''
}

function stripTags(value) {
  return xmlDecode(value.replace(/<[^>]+>/g, ''))
}

function columnLetters(index) {
  let n = index
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function columnIndex(cellRef) {
  const letters = cellRef.replace(/[0-9]/g, '')
  let n = 0
  for (const letter of letters) {
    n = n * 26 + letter.charCodeAt(0) - 64
  }
  return n
}

function parseSharedStrings(entries) {
  const xml = entries.get('xl/sharedStrings.xml')
  if (!xml) return []
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const item = match[1]
    const textNodes = [...item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    return xmlDecode(textNodes.map((node) => node[1]).join(''))
  })
}

function parseWorkbookSheets(entries) {
  const workbook = entries.get('xl/workbook.xml')
  const rels = entries.get('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error('Workbook metadata is incomplete')

  const relTargets = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((match) => [
      attr(match[0], 'Id'),
      attr(match[0], 'Target'),
    ]),
  )

  return new Map(
    [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((match) => {
      const tag = match[0]
      const id = attr(tag, 'r:id')
      return [attr(tag, 'name'), `xl/${relTargets.get(id)}`]
    }),
  )
}

function parseSheet(entries, sheetPath, sharedStrings) {
  const xml = entries.get(sheetPath)
  if (!xml) throw new Error(`Missing sheet XML: ${sheetPath}`)
  const rows = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = []
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cellTag = cellMatch[0]
      const cellAttrs = cellMatch[1]
      const cellBody = cellMatch[2]
      const ref = attr(cellTag, 'r')
      const type = attr(`<c ${cellAttrs}>`, 't')
      const vMatch = cellBody.match(/<v[^>]*>([\s\S]*?)<\/v>/)
      let value = ''
      if (type === 's' && vMatch) {
        value = sharedStrings[Number(vMatch[1])] ?? ''
      } else if (type === 'inlineStr') {
        value = stripTags(cellBody)
      } else if (vMatch) {
        value = xmlDecode(vMatch[1])
      } else {
        value = stripTags(cellBody)
      }
      cells[columnIndex(ref) - 1] = value
    }
    rows.push(cells)
  }
  return rows
}

function normalizeHeader(header) {
  return String(header).trim()
}

function rowsToObjects(rows) {
  const headers = rows[0].map(normalizeHeader)
  return rows.slice(1).map((row) => {
    const object = {}
    headers.forEach((header, index) => {
      object[header] = row[index] ?? ''
    })
    return object
  })
}

function sourceColumnFor(rowIndex, frequency) {
  if (frequency === 'Quarterly') return 'B'
  return columnLetters(rowIndex)
}

function modelRole(row) {
  return row['Category'] === 'Target variable' ? 'target_quarterly_gdp' : 'high_frequency_indicator'
}

function transformationReview(row) {
  const id = row['Code key']
  const decision = REVIEW_DECISIONS[id]
  if (decision) {
    return {
      contributionGuardrail:
        decision.publicDisplayGuidance ??
        (decision.publicDisplayAllowed === false
          ? 'No public indicator-contribution display until model-owner sign-off.'
          : DEFAULT_PUBLIC_DISPLAY),
      publicDisplayAllowed: decision.publicDisplayAllowed ?? true,
      ...decision,
    }
  }
  return {
    status: 'approved',
    recommendedTransformation:
      'Use optional X-13 seasonal adjustment where flagged, then log-difference the positive level/count/currency series over non-missing observations.',
    rationale:
      'This row is a native level, count, or currency series, so log growth is a standard stationary activity signal for the DFM.',
    riskFlags: [],
    publicDisplayAllowed: true,
    contributionGuardrail: DEFAULT_PUBLIC_DISPLAY,
  }
}

function hashFile(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function writeCsv(path, rows) {
  const fields = [
    'source_sheet',
    'source_column',
    'variable_id',
    'label',
    'category',
    'frequency',
    'unit',
    'seasonal_adjustment',
    'transformation',
    'source_workflow_confirmation',
    'recommended_transformation',
    'rationale',
    'risk_flags',
    'model_owner_decision_status',
    'public_display_allowed',
    'public_display_guidance',
    'missing_value_rule',
    'model_role',
    'transformation_status',
  ]
  const lines = [fields.join(',')]
  for (const row of rows) {
    lines.push(
      fields
        .map((field) => csvEscape(Array.isArray(row[field]) ? row[field].join('; ') : row[field]))
        .join(','),
    )
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${lines.join('\n')}\n`)
}

function buildMap() {
  const workbook = resolve(WORKBOOK_PATH)
  if (!existsSync(workbook)) {
    throw new Error(`DFM source workbook not found: ${WORKBOOK_PATH}`)
  }

  const entries = readZipEntries(workbook)
  const sharedStrings = parseSharedStrings(entries)
  const sheetPaths = parseWorkbookSheets(entries)
  const metaRows = rowsToObjects(parseSheet(entries, sheetPaths.get('Series Information'), sharedStrings))
  const monthlyRows = parseSheet(entries, sheetPaths.get(MONTHLY_SHEET), sharedStrings)
  const quarterlyRows = parseSheet(entries, sheetPaths.get(QUARTERLY_SHEET), sharedStrings)
  const monthlyHeaders = monthlyRows[0] ?? []
  const quarterlyHeaders = quarterlyRows[0] ?? []

  const variables = metaRows.map((row, index) => {
    const frequency = row['Frequency']
    const sourceSheet = frequency === 'Quarterly' ? QUARTERLY_SHEET : MONTHLY_SHEET
    const sourceColumn = sourceColumnFor(index + 1, frequency)
    const sourceHeader =
      frequency === 'Quarterly'
        ? quarterlyHeaders[columnIndex(sourceColumn) - 1]
        : monthlyHeaders[columnIndex(sourceColumn) - 1]
    const review = transformationReview(row)
    return {
      source_sheet: sourceSheet,
      source_column: sourceColumn,
      source_header: sourceHeader || row['Series description'],
      variable_id: row['Code key'],
      label: row['Series description'],
      category: row['Category'],
      frequency: String(frequency).toLowerCase(),
      unit: row['Unit'],
      source: row['Source'],
      seasonal_adjustment: row['Seasonal adjustment'] || 'None',
      transformation: MODEL_INPUT_RULE,
      transformation_status: review.status,
      source_workflow_confirmation: SOURCE_WORKFLOW_CONFIRMATION,
      recommended_transformation: review.recommendedTransformation,
      rationale: review.rationale,
      risk_flags: review.riskFlags,
      model_owner_decision_status: review.status,
      public_display_allowed: review.publicDisplayAllowed,
      public_display_guidance: review.contributionGuardrail,
      missing_value_rule: MISSING_RULE,
      model_role: modelRole(row),
      contribution_guardrail: review.contributionGuardrail,
    }
  })
  const statusCounts = variables.reduce((counts, row) => {
    counts[row.transformation_status] = (counts[row.transformation_status] ?? 0) + 1
    return counts
  }, {})

  return {
    artifact: {
      id: 'dfm-transformation-map',
      generated_at: new Date().toISOString(),
      source_workbook: WORKBOOK_PATH,
      source_workbook_md5: hashFile(workbook),
      source_scripts: [
        'model sources/Fore+Nowcast/DFM/main.R',
        'model sources/Fore+Nowcast/DFM/functions/prepare_data.R',
        'model sources/Fore+Nowcast/DFM/functions/calculate_growth.R',
        'model sources/Fore+Nowcast/DFM/functions/estimate_dfm.R',
        'model sources/Fore+Nowcast/DFM/functions/predict_dfm.R',
        'model sources/Fore+Nowcast/DFM/functions/postprocess_gdp.R',
      ],
      workbook_sheets: [QUARTERLY_SHEET, MONTHLY_SHEET, 'Series Information'],
      variable_count: variables.length,
      target_count: variables.filter((row) => row.model_role === 'target_quarterly_gdp').length,
      high_frequency_input_count: variables.filter((row) => row.model_role === 'high_frequency_indicator').length,
      transformation_rule: MODEL_INPUT_RULE,
      missing_value_rule: MISSING_RULE,
      transformation_status_counts: statusCounts,
      blocked_owner_decision_count: statusCounts.blocked_needs_owner_decision ?? 0,
      production_note:
        'This artifact documents the current source workflow and proposes row-level owner-review decisions before a production refit. It is not a claim that every source transformation has model-owner sign-off.',
    },
    variables,
  }
}

const map = buildMap()
mkdirSync(dirname(OUTPUT_JSON), { recursive: true })
writeFileSync(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`)
writeCsv(OUTPUT_CSV, map.variables)
console.log(`[dfm:source-map] wrote ${OUTPUT_JSON}`)
console.log(`[dfm:source-map] wrote ${OUTPUT_CSV}`)
