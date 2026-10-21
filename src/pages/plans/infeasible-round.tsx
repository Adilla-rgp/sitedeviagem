import { LoaderCircle } from 'lucide-react'
import { AlertMessage } from '../../components/alert-message'
import { Button } from '../../components/button'
import { blockingSentence, unblockSuggestions } from '../../lib/limits'
import { useGeneratePlans } from '../../lib/use-generate-plans'
import type { PlanRound, TripDetail } from '../../types/api'
import { ExcludedPanel } from './excluded-panel'

interface InfeasibleRoundProps {
  trip: TripDetail
  round: PlanRound
  onGenerated: (round: PlanRound) => void
}

/** Rodada sem plano viável: quais limites bloqueiam e o que pode destravar. */
export function InfeasibleRound({ trip, round, onGenerated }: InfeasibleRoundProps) {
  const { generate, isGenerating, error } = useGeneratePlans(trip.id)
  const suggestions = unblockSuggestions(round.blocking_limits, trip.nights)

  async function handleGenerate() {
    const next = await generate()
    if (next) onGenerated(next)
  }

  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 pb-10 pt-7 sm:px-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-ink-muted">
            Viagens / {trip.title} / Rodada {round.round}
          </p>
          <span className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.06em] text-warn">
            Sem plano viável
          </span>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-[32px]">
            Nenhum plano respeita os limites de todos
          </h1>
          <p className="text-[15px] leading-normal text-ink-muted">
            O motor avaliou {round.alternatives_evaluated} alternativas (destino, duração e dia de ida) e todas ferem
            pelo menos um limite. Limites nunca são violados, então não há plano para recomendar nesta rodada.
          </p>
        </div>

        <section
          aria-labelledby="blocking-heading"
          className="flex flex-col gap-3 rounded-panel border border-warn-line bg-surface-sunken p-4 sm:p-5"
        >
          <h2 id="blocking-heading" className="text-base font-semibold">
            O que bloqueia
          </h2>
          <ul className="flex flex-col gap-2.5">
            {round.blocking_limits.map((item) => (
              <li key={`${item.kind}:${item.member_id ?? ''}`} className="flex gap-2.5 text-sm leading-[1.45]">
                <span className="mt-0.5 shrink-0 rounded-sm border border-warn-line bg-warn-bg px-1.5 py-[3px] font-mono text-[11px] font-medium uppercase leading-none text-warn">
                  Limite
                </span>
                <span>{blockingSentence(item, trip.members, round.alternatives_evaluated)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="unblock-heading"
          className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5"
        >
          <h2 id="unblock-heading" className="text-base font-semibold">
            O que pode destravar
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-[18px] text-sm leading-[1.45] text-ink-soft">
            {suggestions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <p className="text-xs leading-normal text-ink-muted">
            Depois de ajustar a viagem ou de alguém alterar a resposta, gere uma nova rodada.
          </p>
          <Button variant="secondary" className="self-start" disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {isGenerating ? 'Gerando…' : 'Gerar nova rodada'}
          </Button>
          {error && <AlertMessage>{error}</AlertMessage>}
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
        <ExcludedPanel round={round} destinations={trip.destinations} members={trip.members} />
      </aside>
    </main>
  )
}
