import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/app-layout'
import { HomePage } from './pages/home'
import { NotFoundPage } from './pages/not-found'
import { PlanReactionPage } from './pages/plan-reaction'
import { PlansPage } from './pages/plans'
import { RespondPage } from './pages/respond'
import { TensionsPage } from './pages/tensions'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/convite/:token', element: <RespondPage /> },
      { path: '/convite/:token/plano', element: <PlanReactionPage /> },
      { path: '/viagens/:id/tensoes', element: <TensionsPage /> },
      { path: '/viagens/:id/planos', element: <PlansPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
