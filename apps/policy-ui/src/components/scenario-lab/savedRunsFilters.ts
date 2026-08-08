import {
  isIoSectorShockRecord,
  isPeTradeShockRecord,
  type SavedScenarioRecord,
} from '../../state/scenarioStore.js'

export type SavedRunsFilter = 'all' | 'macro_qpm' | 'io' | 'pe'

export function filterSavedScenarios(
  savedScenarios: SavedScenarioRecord[],
  filter: SavedRunsFilter,
): SavedScenarioRecord[] {
  if (filter === 'macro_qpm') {
    return savedScenarios.filter(
      (scenario) => !isIoSectorShockRecord(scenario) && !isPeTradeShockRecord(scenario),
    )
  }
  if (filter === 'io') {
    return savedScenarios.filter(isIoSectorShockRecord)
  }
  if (filter === 'pe') {
    return savedScenarios.filter(isPeTradeShockRecord)
  }
  return savedScenarios
}
