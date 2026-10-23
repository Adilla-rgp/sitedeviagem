import type { Destination, TripTensions } from '../../types/api'

interface KeyConstraintsPanelProps {
  tensions: TripTensions
}

export function KeyConstraintsPanel({ tensions }: KeyConstraintsPanelProps) {
  return (
    <section
      aria-labelledby="key-constraints-heading"
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-[18px]"
    >
      <h2 id="key-constraints-heading" className="text-[15px] font-semibold">
        Principais restrições
      </h2>
      {tensions.key_constraints.length > 0 ? (
        <ol className="flex list-decimal flex-col gap-2.5 pl-[18px] text-sm leading-[1.45]">
          {tensions.key_constraints.map((item) => (
            <li key={item.id}>{item.summary}</li>
          ))}
        </ol>
      ) : (
        <p className="text-sm leading-[1.45] text-ink-soft">
          Nenhum limite restringe os destinos ou as datas até agora.
        </p>
      )}
    </section>
  )
}

interface ViabilityPanelProps {
  tensions: TripTensions
  destinations: Destination[]
}

export function ViabilityPanel({ tensions, destinations }: ViabilityPanelProps) {
  return (
    <section
      aria-labelledby="viability-heading"
      className="flex flex-col gap-3.5 rounded-panel border border-line bg-surface p-[18px]"
    >
      <h2 id="viability-heading" className="text-[15px] font-semibold">
        Viabilidade por destino
      </h2>
      <ul className="flex flex-col gap-3.5">
        {/* Na ordem da viagem: a API devolve a viabilidade ordenada pelo id do destino. */}
        {destinations.map((destination) => {
          const item = tensions.viability.find((candidate) => candidate.destination_id === destination.id)
          if (!item) return null
          const share = item.responded_count > 0 ? item.accepted_count / item.responded_count : 0
          return (
            <li key={item.destination_id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-sm">
                <span>
                  {destination.name} <span className="text-ink-muted">· {destination.state}</span>
                </span>
                <span className="shrink-0 font-mono text-[13px] font-medium">
                  <span className="sr-only">aceito por </span>
                  {item.accepted_count} de {item.responded_count}
                </span>
              </div>
              <div className="flex h-1.5 rounded-full bg-line" aria-hidden="true">
                <div className="rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
