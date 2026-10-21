import { NavLink } from 'react-router-dom'
import { BrandMark } from './brand-mark'

interface TripHeaderProps {
  tripId: string
}

const tabs = [
  { path: 'tensoes', label: 'Tensões' },
  { path: 'planos', label: 'Planos' },
]

export function TripHeader({ tripId }: TripHeaderProps) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <BrandMark />
        <nav aria-label="Etapas da viagem" className="flex gap-1 text-sm">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/viagens/${tripId}/${tab.path}`}
              className={({ isActive }) =>
                `flex h-11 items-center rounded px-3.5 transition-colors ${
                  isActive ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
