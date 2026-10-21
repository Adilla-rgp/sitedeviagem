import { reactionOf, VERDICT_STATUS } from '../../lib/plans'
import type { Member, PlanRound } from '../../types/api'

interface ReactionsPanelProps {
  round: PlanRound
  members: Member[]
}

export function ReactionsPanel({ round, members }: ReactionsPanelProps) {
  const planId = round.recommended_plan_id ?? ''
  const reacted = members.filter((member) => reactionOf(round.reactions, planId, member.id)).length

  return (
    <section
      aria-labelledby="reactions-heading"
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reactions-heading" className="text-base font-semibold">
          Reações ao plano recomendado
        </h2>
        <span className="text-xs text-ink-muted">
          {reacted} de {members.length} reagiram
        </span>
      </div>
      <ul className="flex flex-col text-sm">
        {members.map((member) => {
          const reaction = reactionOf(round.reactions, planId, member.id)
          return (
            <li key={member.id} className="flex flex-col gap-1 border-b border-line-subtle py-2.5 last:border-b-0">
              <div className="flex justify-between gap-3">
                <span>
                  {member.display_name}
                  {member.is_organizer && <span className="text-ink-muted"> · você</span>}
                </span>
                <span className={reaction?.verdict === 'rejected' ? 'text-warn' : reaction ? 'text-ink' : 'text-ink-muted'}>
                  {reaction ? VERDICT_STATUS[reaction.verdict] : 'aguardando'}
                </span>
              </div>
              {reaction?.comment && <p className="text-[13px] leading-normal text-ink-soft">“{reaction.comment}”</p>}
            </li>
          )
        })}
      </ul>
      <p className="text-xs leading-normal text-ink-muted">
        Cada pessoa reage pelo próprio link de convite. Recusas viram restrições na próxima rodada.
      </p>
    </section>
  )
}
