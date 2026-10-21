import { formatCount } from '../../lib/format'
import { memberName } from '../../lib/plans'
import type { Member, Plan } from '../../types/api'

interface JustificationPanelProps {
  plan: Plan
  members: Member[]
}

export function JustificationPanel({ plan, members }: JustificationPanelProps) {
  return (
    <section
      aria-labelledby="justification-heading"
      className="flex flex-col gap-3.5 rounded-panel border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="justification-heading" className="text-base font-semibold">
        Justificativa
      </h2>
      <ul className="flex flex-col gap-3">
        {plan.explanation.map((item) => (
          <li
            key={item.member_id}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-sm leading-[1.45]"
          >
            <span className="font-medium">{memberName(members, item.member_id)}</span>
            <span className="text-ink-soft">{item.text}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-normal text-ink-muted">
        Justificativa gerada por regras a partir do cálculo.{' '}
        {formatCount(plan.alternatives_evaluated, 'alternativa avaliada', 'alternativas avaliadas')} ·{' '}
        {formatCount(plan.violated_limits, 'limite violado', 'limites violados')}.
      </p>
    </section>
  )
}
