import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { ComparisonPage } from '../pages/ComparisonPage'
import { DataRegistryPage } from '../pages/DataRegistryPage'
import { KnowledgeHubPage } from '../pages/KnowledgeHubPage'
import { ModelExplorerPage } from '../pages/ModelExplorerPage'
import { OverviewPage } from '../pages/OverviewPage'
import { ScenarioLabPage } from '../pages/ScenarioLabPage'

export const appRoutes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'scenario-lab', element: <ScenarioLabPage /> },
      { path: 'comparison', element: <ComparisonPage /> },
      { path: 'model-explorer', element: <ModelExplorerPage /> },
      { path: 'data-registry', element: <DataRegistryPage /> },
      { path: 'knowledge-hub', element: <KnowledgeHubPage /> },
    ],
  },
]

// HashRouter in production so SPA deep links survive static hosting (GitHub Pages).
// BrowserRouter in dev keeps clean URLs for local development.
export const appRouter = import.meta.env.PROD
  ? createHashRouter(appRoutes)
  : createBrowserRouter(appRoutes)
