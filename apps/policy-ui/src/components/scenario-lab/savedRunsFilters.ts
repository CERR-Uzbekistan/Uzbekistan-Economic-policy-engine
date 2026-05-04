import { isIoSectorShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'

export type SavedRunsFilter = 'all' | 'macro_qpm' | 'io'

export function filterSavedScenarios(
  savedScenarios: SavedScenarioRecord[],
  filter: SavedRunsFilter,
): SavedScenarioRecord[] {
  if (filter === 'macro_qpm') {
    return savedScenarios.filter((scenario) => !isIoSectorShockRecord(scenario))
  }
  if (filter === 'io') {
    return savedScenarios.filter(isIoSectorShockRecord)
  }
  return savedScenarios
}
