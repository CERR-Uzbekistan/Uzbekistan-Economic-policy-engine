/* eslint-disable react-refresh/only-export-components -- Router exports route config and owns route-level lazy components. */
import { lazy, Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { AppShell } from './shell/AppShell'

const OverviewPage = lazy(() => import('../pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const ScenarioLabPage = lazy(() => import('../pages/ScenarioLabPage').then((m) => ({ default: m.ScenarioLabPage })))
const PolicyChatPage = lazy(() => import('../pages/PolicyChatPage').then((m) => ({ default: m.PolicyChatPage })))
const ComparisonPage = lazy(() => import('../pages/ComparisonPage').then((m) => ({ default: m.ComparisonPage })))
const ModelExplorerPage = lazy(() =>
  import('../pages/ModelExplorerPage').then((m) => ({ default: m.ModelExplorerPage })),
)
const DataRegistryPage = lazy(() =>
  import('../pages/DataRegistryPage').then((m) => ({ default: m.DataRegistryPage })),
)
const KnowledgeHubPage = lazy(() =>
  import('../pages/KnowledgeHubPage').then((m) => ({ default: m.KnowledgeHubPage })),
)

type RouteFallbackProps = {
  titleKey: string
  descriptionKey: string
  loadingKey: string
}

function RouteFallback({ titleKey, descriptionKey, loadingKey }: RouteFallbackProps) {
  const { t } = useTranslation()

  return (
    <PageContainer>
      <PageHeader title={t(titleKey)} description={t(descriptionKey)} />
      <p className="empty-state" role="status" aria-live="polite">
        {t(loadingKey)}
      </p>
    </PageContainer>
  )
}

function lazyRoute(element: ReactNode, fallbackProps: RouteFallbackProps) {
  return <Suspense fallback={<RouteFallback {...fallbackProps} />}>{element}</Suspense>
}

export const appRoutes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      {
        path: 'overview',
        element: lazyRoute(<OverviewPage />, {
          titleKey: 'pages.overview.title',
          descriptionKey: 'pages.overview.description',
          loadingKey: 'states.loading.overview',
        }),
      },
      {
        path: 'scenario-lab',
        element: lazyRoute(<ScenarioLabPage />, {
          titleKey: 'pages.scenarioLab.title',
          descriptionKey: 'pages.scenarioLab.description',
          loadingKey: 'states.loading.scenarioLabRun',
        }),
      },
      {
        path: 'policy-chat',
        element: lazyRoute(<PolicyChatPage />, {
          titleKey: 'pages.policyChat.title',
          descriptionKey: 'pages.policyChat.description',
          loadingKey: 'policyChat.status.interpreting',
        }),
      },
      {
        path: 'comparison',
        element: lazyRoute(<ComparisonPage />, {
          titleKey: 'pages.comparison.title',
          descriptionKey: 'pages.comparison.description',
          loadingKey: 'states.loading.comparison',
        }),
      },
      {
        path: 'model-explorer',
        element: lazyRoute(<ModelExplorerPage />, {
          titleKey: 'pages.modelExplorer.title',
          descriptionKey: 'pages.modelExplorer.description',
          loadingKey: 'states.loading.modelExplorer',
        }),
      },
      {
        path: 'data-registry',
        element: lazyRoute(<DataRegistryPage />, {
          titleKey: 'pages.dataRegistry.title',
          descriptionKey: 'pages.dataRegistry.description',
          loadingKey: 'states.loading.dataRegistry',
        }),
      },
      {
        path: 'knowledge-hub',
        element: lazyRoute(<KnowledgeHubPage />, {
          titleKey: 'pages.knowledgeHub.title',
          descriptionKey: 'pages.knowledgeHub.description',
          loadingKey: 'states.loading.knowledgeHub',
        }),
      },
    ],
  },
]

// HashRouter in production so SPA deep links survive static hosting (GitHub Pages).
// BrowserRouter in dev keeps clean URLs for local development.
export const appRouter = import.meta.env.PROD
  ? createHashRouter(appRoutes)
  : createBrowserRouter(appRoutes)
