import { exclusionReason } from '../../lib/limits'
import type { Destination, GroupMember, PlanRound } from '../../types/api'

interface ExcludedPanelProps {
  round: PlanRound
  destinations: Destination[]
  members: GroupMember[]
}

/** "Por que não…": cada destino da viagem que ficou fora das alternativas e o motivo. */
export function ExcludedPanel({ round, destinations, members }: ExcludedPanelProps) {
  if (round.excluded_destinations.length === 0) return null
  const recommended = round.plans.find((plan) => plan.id === round.recommended_plan_id)

  return (
    <section
      aria-labelledby="excluded-heading"
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-[18px]"
    >
      <h2 id="excluded-heading" className="text-[15px] font-semibold">
        Por que não…
      </h2>
      <ul className="flex flex-col gap-3">
        {round.excluded_destinations.map((item) => {
          const destination = destinations.find((candidate) => candidate.id === item.destination_id)
          return (
            <li key={item.destination_id} className="flex flex-col gap-0.5 text-sm leading-[1.45]">
              <span className="font-medium">{destination?.name ?? item.destination_id}</span>
              <span className="text-ink-soft">{exclusionReason(item, members, recommended?.score ?? null)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
