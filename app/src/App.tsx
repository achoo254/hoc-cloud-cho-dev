import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'
import { Skeleton } from '@/components/ui/skeleton'

// ── Lazy-loaded route chunks ──────────────────────────────────────────────────
// Each route gets its own chunk, reducing initial bundle size significantly.

const IndexPage       = lazy(() => import('./routes/index'))
const LabViewerPage   = lazy(() => import('./routes/lab-viewer'))
const SearchPage      = lazy(() => import('./routes/search'))
const DevPlayground   = lazy(() => import('./routes/dev-playground'))
const NotFoundPage    = lazy(() => import('./routes/not-found'))

// ── Route-level loading fallback ──────────────────────────────────────────────

function RouteSkeleton() {
  return (
    <div className="container py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-5/6 max-w-xl" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,            element: <Suspense fallback={<RouteSkeleton />}><IndexPage /></Suspense> },
      { path: 'lab/:slug',      element: <Suspense fallback={<RouteSkeleton />}><LabViewerPage /></Suspense> },
      { path: 'search',         element: <Suspense fallback={<RouteSkeleton />}><SearchPage /></Suspense> },
      { path: 'dev/playground', element: <Suspense fallback={<RouteSkeleton />}><DevPlayground /></Suspense> },
      { path: '*',              element: <Suspense fallback={<RouteSkeleton />}><NotFoundPage /></Suspense> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
