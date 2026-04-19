import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/root-layout'
import IndexPage from '@/routes/index'
import LabViewerPage from '@/routes/lab-viewer'
import SearchPage from '@/routes/search'
import NotFoundPage from '@/routes/not-found'
import DevPlaygroundPage from '@/routes/dev-playground'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'lab/:slug', element: <LabViewerPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'dev/playground', element: <DevPlaygroundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
