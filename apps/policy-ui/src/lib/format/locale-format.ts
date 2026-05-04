export type SupportedLocale = 'en' | 'ru' | 'uz'

type NumericValue = number | null | undefined

const INTL_LOCALE: Record<SupportedLocale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uz: 'uz-UZ',
}

const UNAVAILABLE = {
  short: {
    en: 'n/a',
    ru: 'н/д',
    uz: 'mavjud emas',
  },
  long: {
    en: 'Unavailable',
    ru: 'Недоступно',
    uz: 'Mavjud emas',
  },
} satisfies Record<'short' | 'long', Record<SupportedLocale, string>>

const UNIT_LABELS = {
  percent: {
    en: '%',
    ru: '%',
    uz: '%',
  },
  percentagePoint: {
    en: 'pp',
    ru: 'п.п.',
    uz: 'f.p.',
  },
  blnUzs: {
    en: 'bln UZS',
    ru: 'млрд сумов',
    uz: "mlrd so'm",
  },
  mlnUsd: {
    en: 'mln USD',
    ru: 'млн долл. США',
    uz: 'mln AQSH dollari',
  },
  uzsUsd: {
    en: 'UZS/USD',
    ru: 'сум/USD',
    uz: "so'm/USD",
  },
  uzs: {
    en: 'UZS',
    ru: 'сум',
    uz: "so'm",
  },
  usd: {
    en: 'USD',
    ru: 'долл. США',
    uz: 'AQSH dollari',
  },
} satisfies Record<string, Record<SupportedLocale, string>>

const SECTOR_FORMS: Record<SupportedLocale, Record<Intl.LDMLPluralRule, string>> = {
  en: {
    zero: 'sectors',
    one: 'sector',
    two: 'sectors',
    few: 'sectors',
    many: 'sectors',
    other: 'sectors',
  },
  ru: {
    zero: 'секторов',
    one: 'сектор',
    two: 'сектора',
    few: 'сектора',
    many: 'секторов',
    other: 'сектора',
  },
  uz: {
    zero: 'sektor',
    one: 'sektor',
    two: 'sektor',
    few: 'sektor',
    many: 'sektor',
    other: 'sektor',
  },
}

export function normalizeLocale(value: string | undefined): SupportedLocale {
  if (value === 'ru' || value?.startsWith('ru-')) {
    return 'ru'
  }
  if (value === 'uz' || value?.startsWith('uz-')) {
    return 'uz'
  }
  return 'en'
}

export function formatUnavailable(locale: string | undefined, variant: 'short' | 'long' = 'short') {
  return UNAVAILABLE[variant][normalizeLocale(locale)]
}

export function formatNumber(
  value: NumericValue,
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }

  const normalized = normalizeLocale(locale)
  return new Intl.NumberFormat(INTL_LOCALE[normalized], options).format(value)
}

export function formatCompactNumber(value: NumericValue, locale: string | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }

  const magnitude = Math.abs(value)
  if (magnitude >= 1000) {
    return formatNumber(value, locale, { maximumFractionDigits: 0 })
  }
  if (magnitude >= 100) {
    return formatNumber(value, locale, { maximumFractionDigits: 0 })
  }
  if (magnitude >= 10) {
    return formatNumber(value, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  }
  return formatNumber(value, locale, { maximumFractionDigits: 2 })
}

export function formatSignedNumber(
  value: NumericValue,
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }

  const normalized = normalizeLocale(locale)
  return new Intl.NumberFormat(INTL_LOCALE[normalized], {
    signDisplay: 'exceptZero',
    ...options,
  }).format(value)
}

export function formatUnitLabel(
  unit: 'percent' | 'percentagePoint' | 'blnUzs' | 'mlnUsd' | 'uzsUsd' | 'uzs' | 'usd',
  locale: string | undefined,
): string {
  return UNIT_LABELS[unit][normalizeLocale(locale)]
}

export function formatPercent(value: NumericValue, locale: string | undefined, digits = 1): string {
  return `${formatNumber(value, locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}${formatUnitLabel('percent', locale)}`
}

export function formatPercentagePoint(value: NumericValue, locale: string | undefined, digits = 1): string {
  return `${formatNumber(value, locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} ${formatUnitLabel('percentagePoint', locale)}`
}

export function formatValueWithUnit(
  value: NumericValue,
  unit: string,
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }

  if (unit === '%') {
    return `${formatNumber(value, locale, options)}${formatUnitLabel('percent', locale)}`
  }
  if (unit === 'pp') {
    return `${formatNumber(value, locale, options)} ${formatUnitLabel('percentagePoint', locale)}`
  }
  if (unit === 'UZS/USD') {
    return `${formatNumber(value, locale, options)} ${formatUnitLabel('uzsUsd', locale)}`
  }
  if (!unit) {
    return formatNumber(value, locale, options)
  }
  return `${formatNumber(value, locale, options)} ${unit}`
}

export function formatAxisUnitLabel(unit: string, locale: string | undefined): string {
  if (unit === '%') {
    return formatUnitLabel('percent', locale)
  }
  if (unit === 'pp') {
    return formatUnitLabel('percentagePoint', locale)
  }
  if (unit === 'UZS/USD') {
    return formatUnitLabel('uzsUsd', locale)
  }
  if (unit === 'UZS') {
    return formatUnitLabel('uzs', locale)
  }
  if (unit === 'USD') {
    return formatUnitLabel('usd', locale)
  }
  return unit
}

export function getDefaultFractionDigitsForUnit(unit: string): number {
  return unit === 'UZS/USD' ? 0 : 1
}

export function formatCurrencyAmount(
  value: NumericValue,
  unit: 'bln_uzs' | 'mln_usd' | 'uzs_usd',
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const unitKey = unit === 'bln_uzs' ? 'blnUzs' : unit === 'mln_usd' ? 'mlnUsd' : 'uzsUsd'
  return `${formatNumber(value, locale, options)} ${formatUnitLabel(unitKey, locale)}`
}

export function formatDate(value: string | number | Date, locale: string | undefined): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return formatUnavailable(locale)
  }
  const normalized = normalizeLocale(locale)
  return new Intl.DateTimeFormat(INTL_LOCALE[normalized], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function parseQuarterRef(value: string | number | null | undefined): { year: number; quarter: number } | null {
  if (value === null || value === undefined) {
    return null
  }
  const label = String(value).trim()
  const yearFirst = /(\d{4})\s*Q\s*([1-4])/i.exec(label)
  if (yearFirst) {
    return {
      year: Number(yearFirst[1]),
      quarter: Number(yearFirst[2]),
    }
  }
  const quarterFirst = /Q\s*([1-4])\s*(\d{4})/i.exec(label)
  if (quarterFirst) {
    return {
      year: Number(quarterFirst[2]),
      quarter: Number(quarterFirst[1]),
    }
  }
  return null
}

export function formatQuarterLabel(value: string | number | null | undefined, locale: string | undefined): string {
  const quarter = parseQuarterRef(value)
  if (!quarter) {
    return value === null || value === undefined ? formatUnavailable(locale) : String(value)
  }

  const normalized = normalizeLocale(locale)
  if (normalized === 'ru') {
    return `${quarter.quarter} кв. ${quarter.year}`
  }
  if (normalized === 'uz') {
    return `${quarter.year} ${quarter.quarter}-chorak`
  }
  return `Q${quarter.quarter} ${quarter.year}`
}

export function formatSectorCount(count: number, locale: string | undefined): string {
  const normalized = normalizeLocale(locale)
  const plural = new Intl.PluralRules(INTL_LOCALE[normalized]).select(count)
  return `${formatNumber(count, normalized, { maximumFractionDigits: 0 })} ${SECTOR_FORMS[normalized][plural]}`
}
