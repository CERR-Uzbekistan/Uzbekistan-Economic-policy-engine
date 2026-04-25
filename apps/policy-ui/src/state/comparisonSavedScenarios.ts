import type { ComparisonWorkspace } from '../contracts/data-contract.js'
import { toComparisonScenario } from './scenarioComparisonAdapter.js'
import type { SavedScenarioRecord } from './scenarioStore.js'

export const COMPARISON_SLOT_LIMIT = 3

export function mergeSavedScenariosIntoWorkspace(
  workspace: ComparisonWorkspace,
  savedScenarios: SavedScenarioRecord[],
  addedSavedScenarioIds: string[],
): ComparisonWorkspace {
  if (addedSavedScenarioIds.length === 0) {
    return workspace
  }

  const addedIds = new Set(addedSavedScenarioIds)
  const scenariosById = new Map(
    workspace.scenarios.map((scenario) => [scenario.scenario_id, scenario]),
  )

  for (const savedScenario of savedScenarios) {
    if (addedIds.has(savedScenario.scenario_id)) {
      const mappedScenario = toComparisonScenario(savedScenario)
      scenariosById.set(mappedScenario.scenario_id, mappedScenario)
    }
  }

  return {
    ...workspace,
    scenarios: Array.from(scenariosById.values()),
  }
}

type AddSavedScenarioSelectionInput = {
  currentSelectedIds: string[]
  baselineId: string
  savedScenarioIds: string[]
  slotLimit?: number
}

export function addSavedScenarioIdsToSelection({
  currentSelectedIds,
  baselineId,
  savedScenarioIds,
  slotLimit = COMPARISON_SLOT_LIMIT,
}: AddSavedScenarioSelectionInput): string[] {
  const baseline = baselineId || currentSelectedIds[0] || ''
  const savedIds = Array.from(new Set(savedScenarioIds)).filter(Boolean)
  const savedIdSet = new Set(savedIds)
  const existingNonBaseline = currentSelectedIds.filter(
    (id) => id !== baseline && !savedIdSet.has(id),
  )
  const addedNonBaseline = savedIds.filter((id) => id !== baseline)
  const nonBaselineLimit = Math.max(0, slotLimit - (baseline ? 1 : 0))
  const nextNonBaseline = [...existingNonBaseline, ...addedNonBaseline].slice(-nonBaselineLimit)
  return Array.from(new Set([baseline, ...nextNonBaseline].filter(Boolean))).slice(0, slotLimit)
}
