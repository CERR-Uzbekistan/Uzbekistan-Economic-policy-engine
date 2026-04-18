import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { ComparisonPage } from '../pages/ComparisonPage'
import { KnowledgeHubPage } from '../pages/KnowledgeHubPage'
import { ModelExplorerPage } from '../pages/ModelExplorerPage'
import { OverviewPage } from '../pages/OverviewPage'
import { ScenarioLabPage } from '../pages/ScenarioLabPage'

export const appRouter = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/overview" replace /> },
        { path: 'overview', element: <OverviewPage /> },
        { path: 'scenario-lab', element: <ScenarioLabPage /> },
        { path: 'comparison', element: <ComparisonPage /> },
        { path: 'model-explorer', element: <ModelExplorerPage /> },
        { path: 'knowledge-hub', element: <KnowledgeHubPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
