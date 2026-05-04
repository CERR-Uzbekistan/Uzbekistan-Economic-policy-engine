import type { ScenarioLabAssumptionState, ScenarioLabWorkspace } from '../contracts/data-contract'

export const DEFAULT_PRESET_ID = 'baseline'

export function getDefaultValuesFromWorkspace(
  workspace: ScenarioLabWorkspace,
): ScenarioLabAssumptionState {
  return workspace.assumptions.reduce<ScenarioLabAssumptionState>((acc, assumption) => {
    acc[assumption.key] = assumption.default_value
    return acc
  }, {})
}

export function getPresetValuesFromWorkspace(
  workspace: ScenarioLabWorkspace,
  presetId: string,
): ScenarioLabAssumptionState {
  const baseState = getDefaultValuesFromWorkspace(workspace)
  const preset = workspace.presets.find((entry) => entry.preset_id === presetId)
  if (!preset) {
    return baseState
  }
  return { ...baseState, ...preset.assumption_overrides }
}

export function resolveDefaultPresetId(workspace: ScenarioLabWorkspace): string {
  if (workspace.presets.some((preset) => preset.preset_id === DEFAULT_PRESET_ID)) {
    return DEFAULT_PRESET_ID
  }
  return workspace.presets[0]?.preset_id ?? ''
}

export function findPreset(workspace: ScenarioLabWorkspace, presetId: string) {
  return workspace.presets.find((preset) => preset.preset_id === presetId)
}

export type PresetHydrationResult = {
  selectedPresetId: string
  assumptionValues: ScenarioLabAssumptionState
  scenarioName: string
  warningMessage: string | null
}

export function resolvePresetHydration(
  workspace: ScenarioLabWorkspace,
  presetFromQuery: string | null,
): PresetHydrationResult {
  const defaultPresetId = resolveDefaultPresetId(workspace)
  const defaultPreset = findPreset(workspace, defaultPresetId)
  const selectedFromQuery = presetFromQuery ? findPreset(workspace, presetFromQuery) : null

  if (selectedFromQuery) {
    return {
      selectedPresetId: selectedFromQuery.preset_id,
      assumptionValues: getPresetValuesFromWorkspace(workspace, selectedFromQuery.preset_id),
      scenarioName: selectedFromQuery.title,
      warningMessage: null,
    }
  }

  const warningMessage =
    presetFromQuery && presetFromQuery.length > 0
      ? `Unknown scenario preset "${presetFromQuery}". Falling back to "${defaultPresetId}".`
      : null

  return {
    selectedPresetId: defaultPresetId,
    assumptionValues: getPresetValuesFromWorkspace(workspace, defaultPresetId),
    scenarioName: defaultPreset?.title ?? 'Scenario 1',
    warningMessage,
  }
}
