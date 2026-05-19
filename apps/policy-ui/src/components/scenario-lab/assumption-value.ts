import type { ScenarioLabAssumptionInput } from '../../contracts/data-contract'

export function normalizeAssumptionValue(
  item: Pick<ScenarioLabAssumptionInput, 'default_value' | 'max' | 'min' | 'step'>,
  rawValue: number,
): number {
  if (!Number.isFinite(rawValue)) {
    return item.default_value
  }
  const clamped = Math.min(item.max, Math.max(item.min, rawValue))
  const stepped = item.step > 0 ? item.min + Math.round((clamped - item.min) / item.step) * item.step : clamped
  const bounded = Math.min(item.max, Math.max(item.min, stepped))
  const stepDecimals = Math.max(0, (item.step.toString().split('.')[1] ?? '').length)
  return Number(bounded.toFixed(Math.min(stepDecimals, 4)))
}
