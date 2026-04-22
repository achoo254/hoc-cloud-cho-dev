import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'
import { queryClient } from '@/lib/query-client'
import { getProgress } from '@/lib/api'
import { PROGRESS_QUERY_KEY } from '@/lib/hooks/use-progress'

// ── Lazy-loaded route chunks ──────────────────────────────────────────────────
// Each route gets its own chunk, reducing initial bundle size significantly.
// Suspense boundary lives in RootLayout (outside AnimatePresence) so that a
// suspending lazy chunk doesn't freeze framer-motion's enter animation.

const IndexPage       = lazy(() => import('./routes/index'))
const LabViewerPage   = lazy(() => import('./routes/lab-viewer'))
const SearchPage      = lazy(() => import('./routes/search'))
const DevPlayground   = lazy(() => import('./routes/dev-playground'))
const SpikePlayground = lazy(() => import('./routes/spike-playground'))
const NotFoundPage    = lazy(() => import('./routes/not-found'))

// ── Loaders ───────────────────────────────────────────────────────────────────
// Warm the React Query cache in parallel with the route chunk fetch. Swallow
// errors so a failing /api/progress never blocks navigation — the component's
// useQuery will surface the error state on mount.

const prefetchProgress = () => {
  void queryClient
    .ensureQueryData({ queryKey: PROGRESS_QUERY_KEY, queryFn: getProgress })
    .catch(() => undefined)
  return null
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,            element: <IndexPage />,     loader: prefetchProgress },
      { path: 'lab/:slug',      element: <LabViewerPage />, loader: prefetchProgress },
      { path: 'search',         element: <SearchPage /> },
      { path: 'dev/playground', element: <DevPlayground /> },
      { path: 'dev/spike',      element: <SpikePlayground /> },
      { path: '*',              element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
