import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'

// ── Lazy-loaded route chunks ──────────────────────────────────────────────────
// Each route gets its own chunk, reducing initial bundle size significantly.
// Suspense boundary lives in RootLayout (outside AnimatePresence) so that a
// suspending lazy chunk doesn't freeze framer-motion's enter animation.

const IndexPage       = lazy(() => import('./routes/index'))
const LabViewerPage   = lazy(() => import('./routes/lab-viewer'))
const SearchPage      = lazy(() => import('./routes/search'))
const DevPlayground   = lazy(() => import('./routes/dev-playground'))
const NotFoundPage    = lazy(() => import('./routes/not-found'))

// ── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,            element: <IndexPage /> },
      { path: 'lab/:slug',      element: <LabViewerPage /> },
      { path: 'search',         element: <SearchPage /> },
      { path: 'dev/playground', element: <DevPlayground /> },
      { path: '*',              element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
