import { memberName, memberNames } from '../../lib/plans'
import { summarizeScores, toPercent } from '../../lib/scoring'
import type { GroupMember, MemberScore, Plan } from '../../types/api'

interface SatisfactionPanelProps {
  plan: Plan
  members: GroupMember[]
  /** Participante que está vendo a tela, marcado com "você". */
  viewerId?: string
}

/** "46 de um máximo possível de 100" ou "48, o melhor possível para Carla dentro dos limites do grupo". */
function bestPossibleText(item: MemberScore, name: string): string {
  const value = toPercent(item.score)
  if (toPercent(item.best_possible) === value) {
    return `${value}, o melhor possível para ${name} dentro dos limites do grupo`
  }
  return `${value} de um máximo possível de ${toPercent(item.best_possible)}`
}

export function SatisfactionPanel({ plan, members, viewerId }: SatisfactionPanelProps) {
  const summary = summarizeScores(plan.per_member_scores, plan.alpha)
  const anyoneCounted = plan.per_member_scores.some((item) => item.has_preferences)

  return (
    <section
      aria-labelledby="satisfaction-heading"
      className="flex flex-col gap-4 rounded-panel border border-line bg-surface-sunken p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="satisfaction-heading" className="text-base font-semibold">
          Satisfação por participante
        </h2>
        <span className="text-xs text-ink-muted">
          {anyoneCounted
            ? `0 a 100 · média ${toPercent(summary.mean)} · pior ${toPercent(summary.worst)}: ${memberNames(members, summary.worstMemberIds)}`
            : 'Ninguém declarou preferências'}
        </span>
      </div>
      <ul className="flex flex-col gap-3.5">
        {plan.per_member_scores.map((item) => {
          const name = memberName(members, item.member_id)
          const label = (
            <span className="truncate text-sm">
              {name}
              {item.member_id === viewerId && <span className="text-ink-muted"> · você</span>}
            </span>
          )

          if (!item.has_preferences) {
            return (
              <li key={item.member_id} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                {label}
                <span className="text-[13px] text-ink-muted">Sem preferências declaradas</span>
              </li>
            )
          }

          const isWorst = summary.worstMemberIds.includes(item.member_id)
          const value = toPercent(item.score)
          return (
            <li key={item.member_id} className="grid grid-cols-[88px_minmax(0,1fr)_40px] items-center gap-x-3 gap-y-1">
              {label}
              <div className="relative flex h-2.5 rounded-full bg-line" aria-hidden="true">
                <div
                  className={`rounded-full ${isWorst ? 'bg-warn' : 'bg-accent'}`}
                  style={{ width: `${value}%` }}
                />
                {/* Marca do melhor possível para esta pessoa. */}
                <div
                  className="absolute -top-0.5 h-3.5 w-0.5 rounded-full bg-ink-muted"
                  style={{ left: `calc(${toPercent(item.best_possible)}% - 1px)` }}
                />
              </div>
              <span className="text-right font-mono text-[13px] font-medium">
                {value}
                {isWorst && <span className="sr-only">, menor satisfação</span>}
              </span>
              <span className="col-start-2 col-end-4 text-xs leading-snug text-ink-muted">
                {bestPossibleText(item, name)}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-warn">
        {summary.worstMemberIds.length > 1
          ? 'Em destaque: quem empata com a menor satisfação, que o critério de equilíbrio protege.'
          : 'Destacado: o participante com menor satisfação, que o critério de equilíbrio protege.'}
      </p>
      <p className="-mt-2 text-xs leading-normal text-ink-muted">
        A marca na barra é o melhor que cada pessoa teria em alguma alternativa que respeita os limites de todos.
        Quem não declarou preferências fica fora da média e do pior.
      </p>
    </section>
  )
}
