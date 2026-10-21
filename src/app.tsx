import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { NotFoundPage } from './pages/not-found'
import { PlansPage } from './pages/plans'
import { RespondPage } from './pages/respond'
import { TensionsPage } from './pages/tensions'

const router = createBrowserRouter([
  { path: '/convite/:token', element: <RespondPage /> },
  { path: '/viagens/:id/tensoes', element: <TensionsPage /> },
  { path: '/viagens/:id/planos', element: <PlansPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}
