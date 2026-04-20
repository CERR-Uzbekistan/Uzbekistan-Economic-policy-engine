export type NavItem = {
  labelKey: string
  path: string
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.overview', path: '/overview' },
  { labelKey: 'nav.scenarioLab', path: '/scenario-lab' },
  { labelKey: 'nav.comparison', path: '/comparison' },
  { labelKey: 'nav.modelExplorer', path: '/model-explorer' },
  { labelKey: 'nav.knowledgeHub', path: '/knowledge-hub' },
]
