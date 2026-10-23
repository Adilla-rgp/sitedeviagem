import { CircleCheck } from 'lucide-react'

/** Viagem fechada: o plano recomendado virou o plano final. */
export function FinalPlanNotice() {
  return (
    <section
      aria-labelledby="final-plan-heading"
      className="flex gap-3 rounded-panel border border-accent-line bg-surface-raised p-4 sm:p-5"
    >
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 id="final-plan-heading" className="text-base font-semibold">
          Viagem fechada
        </h2>
        <p className="text-sm leading-normal text-ink-soft">
          Todos que responderam aceitaram este plano: ele é o plano final. Reações, respostas e novas rodadas estão
          encerradas.
        </p>
      </div>
    </section>
  )
}
