import { formatCurrency, formatDateRange } from '../../lib/format'
import { planTitle } from '../../lib/plans'
import type { Destination, Plan } from '../../types/api'

interface PlanHeadingProps {
  plan: Plan
  destinations: Destination[]
  /** Linha acima do rótulo, por exemplo a trilha da viagem. */
  context?: string
}

export function PlanHeading({ plan, destinations, context }: PlanHeadingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {context && <p className="text-[13px] text-ink-muted">{context}</p>}
      <span className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.06em] text-accent-soft">
        Plano recomendado
      </span>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-[32px]">
        {planTitle(plan, destinations)}
      </h1>
      <p className="text-[15px] text-ink-muted">
        {formatDateRange(plan.start_date, plan.end_date)} · {formatCurrency(plan.est_cost_per_person)} por pessoa,
        estimado
      </p>
    </div>
  )
}
