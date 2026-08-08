import type {
  KnowledgeHubResearchUpdate,
  ReformPackage,
  ReformPackageMilestone,
} from '../../contracts/data-contract.js'

export function dateSortKey(value: string, boundary: 'start' | 'end' = 'start'): string {
  if (/^\d{4}$/.test(value)) return boundary === 'end' ? `${value}-12-31` : `${value}-01-01`
  if (/^\d{4}-\d{2}$/.test(value)) {
    if (boundary === 'end') {
      const [year, month] = value.split('-').map(Number)
      const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
      return `${value}-${String(day).padStart(2, '0')}`
    }
    return `${value}-01`
  }
  return value
}

function compareNewestFirst(leftDate: string | undefined, rightDate: string | undefined): number {
  return dateSortKey(rightDate ?? '').localeCompare(dateSortKey(leftDate ?? ''))
}

export function sortReformPackagesNewestFirst(packages: ReformPackage[]): ReformPackage[] {
  return [...packages].sort(
    (left, right) =>
      compareNewestFirst(left.current_stage_date, right.current_stage_date) ||
      left.title.localeCompare(right.title) ||
      left.package_id.localeCompare(right.package_id),
  )
}

export function sortResearchUpdatesNewestFirst(updates: KnowledgeHubResearchUpdate[]): KnowledgeHubResearchUpdate[] {
  return [...updates].sort(
    (left, right) =>
      compareNewestFirst(left.published_at ?? left.as_of_date, right.published_at ?? right.as_of_date) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  )
}

function milestoneEventOrder(eventType: ReformPackageMilestone['event_type']): number {
  const sequence: Record<ReformPackageMilestone['event_type'], number> = {
    instructions_issued: 0,
    consultation: 0,
    approved: 0,
    amended: 0,
    effective_date: 1,
    financing_allocated: 2,
    implementation_milestone: 2,
    monitoring_update: 2,
    completed: 2,
    superseded: 2,
    target_deadline: 3,
  }
  return sequence[eventType]
}

function milestoneSortDate(milestone: ReformPackageMilestone): string {
  return dateSortKey(milestone.date, milestone.event_type === 'target_deadline' ? 'end' : 'start')
}

export function sortMilestonesChronologically(milestones: ReformPackageMilestone[]): ReformPackageMilestone[] {
  return milestones
    .map((milestone, index) => ({ milestone, index }))
    .sort(
      (left, right) =>
        milestoneSortDate(left.milestone).localeCompare(milestoneSortDate(right.milestone)) ||
        milestoneEventOrder(left.milestone.event_type) - milestoneEventOrder(right.milestone.event_type) ||
        left.index - right.index,
    )
    .map((entry) => entry.milestone)
}
