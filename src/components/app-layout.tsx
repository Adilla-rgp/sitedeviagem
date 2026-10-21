import { Outlet } from 'react-router-dom'
import { demoConfig } from '../config/demo'
import { DemoBanner } from './demo-banner'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {demoConfig.enabled && <DemoBanner />}
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
