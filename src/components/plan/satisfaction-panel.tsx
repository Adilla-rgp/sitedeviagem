import { memberName, memberNames } from '../../lib/plans'
import { summarizeScores, toPercent } from '../../lib/scoring'
import type { GroupMember, Plan } from '../../types/api'

interface SatisfactionPanelProps {
  plan: Plan
  members: GroupMember[]
  /** Participante que está vendo a tela, marcado com "você". */
  viewerId?: string
}

export function SatisfactionPanel({ plan, members, viewerId }: SatisfactionPanelProps) {
  const summary = summarizeScores(plan.per_member_scores, plan.alpha)

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
          0 a 100 · média {toPercent(summary.mean)} · pior {toPercent(summary.worst)}:{' '}
          {memberNames(members, summary.worstMemberIds)}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {plan.per_member_scores.map((item) => {
          const isWorst = summary.worstMemberIds.includes(item.member_id)
          const value = toPercent(item.score)
          return (
            <li key={item.member_id} className="grid grid-cols-[88px_minmax(0,1fr)_40px] items-center gap-3">
              <span className="truncate text-sm">
                {memberName(members, item.member_id)}
                {item.member_id === viewerId && <span className="text-ink-muted"> · você</span>}
              </span>
              <div className="flex h-2.5 rounded-full bg-line" aria-hidden="true">
                <div
                  className={`rounded-full ${isWorst ? 'bg-warn' : 'bg-accent'}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-right font-mono text-[13px] font-medium">
                {value}
                {isWorst && <span className="sr-only">, menor satisfação</span>}
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
    </section>
  )
}
