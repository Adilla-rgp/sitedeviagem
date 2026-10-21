import { useId } from 'react'
import { Button } from '../../components/button'
import { formatCurrency, formatDateRange, formatDecimal } from '../../lib/format'
import { memberNames, planTitle } from '../../lib/plans'
import { rankPlans, toPercent } from '../../lib/scoring'
import type { Destination, Member, PlanRound } from '../../types/api'

const ALPHA_STEPS = 10

function modeDescription(alpha: number): string {
  if (alpha <= 0.2) return 'Prioriza a média do grupo: um participante pode ficar muito abaixo dos demais.'
  if (alpha >= 0.8) return 'Prioriza o participante menos atendido, com pequena perda na média.'
  return 'Equilibrado: boa média sem concessões desproporcionais.'
}

interface BalancePanelProps {
  round: PlanRound
  destinations: Destination[]
  members: Member[]
  alpha: number
  onAlphaChange: (alpha: number) => void
}

export function BalancePanel({ round, destinations, members, alpha, onAlphaChange }: BalancePanelProps) {
  const inputId = useId()
  const engineAlpha = round.alpha
  const ranked = rankPlans(round.plans, alpha)
  const simulatedLeader = ranked[0]
  const leaderChanged = simulatedLeader && simulatedLeader.id !== round.recommended_plan_id

  return (
    <>
      <section
        aria-labelledby={`${inputId}-heading`}
        className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-[18px]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`${inputId}-heading`} className="text-[15px] font-semibold">
            <label htmlFor={inputId}>Critério de equilíbrio</label>
          </h2>
          <span className="font-mono text-[13px] font-medium">α = {formatDecimal(alpha)}</span>
        </div>
        <input
          id={inputId}
          type="range"
          min={0}
          max={ALPHA_STEPS}
          step={1}
          value={Math.round(alpha * ALPHA_STEPS)}
          onChange={(event) => onAlphaChange(Number(event.target.value) / ALPHA_STEPS)}
          aria-valuetext={`α ${formatDecimal(alpha)}. ${modeDescription(alpha)}`}
          className="h-11 w-full cursor-pointer accent-accent"
        />
        <div className="flex justify-between text-xs text-ink-muted" aria-hidden="true">
          <span>média do grupo</span>
          <span>menos atendido</span>
        </div>
        <p className="text-[13px] leading-normal text-ink-soft">{modeDescription(alpha)}</p>
        <p className="font-mono text-xs font-medium text-ink-muted">score = (1 − α) · média + α · pior</p>
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-xs leading-normal text-ink-muted">
            Simulação no navegador: o controle só reordena as alternativas abaixo. O motor usou{' '}
            <span className="font-mono font-medium text-ink-soft">α = {formatDecimal(engineAlpha)}</span> nesta rodada,
            e o plano recomendado só muda numa nova rodada.
          </p>
          {alpha !== engineAlpha && (
            <Button variant="secondary" className="self-start text-sm" onClick={() => onAlphaChange(engineAlpha)}>
              Voltar ao α do motor
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="alternatives-heading" className="flex flex-col gap-2.5">
        <h2 id="alternatives-heading" className="text-[15px] font-semibold">
          Alternativas avaliadas
        </h2>
        <p role="status" className="text-[13px] leading-normal text-ink-soft empty:sr-only">
          {leaderChanged &&
            `Com α = ${formatDecimal(alpha)}, a primeira alternativa seria ${planTitle(simulatedLeader, destinations)}.`}
        </p>
        <ol className="flex flex-col gap-2.5">
          {ranked.map((plan, index) => {
            const isLeader = index === 0
            const isRecommended = plan.id === round.recommended_plan_id
            return (
              <li
                key={plan.id}
                className={`flex flex-col gap-1 rounded border px-4 py-3.5 ${
                  isLeader ? 'border-accent bg-surface-raised' : 'border-line bg-surface-sunken'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {index + 1}º {planTitle(plan, destinations)}
                  </span>
                  <span className="font-mono text-[15px] font-medium">
                    <span className="sr-only">score </span>
                    {toPercent(plan.simulated.score)}
                  </span>
                </div>
                <span className="text-[13px] text-ink-muted">
                  {formatDateRange(plan.start_date, plan.end_date)} · {formatCurrency(plan.est_cost_per_person)}
                </span>
                <span className="text-xs text-ink-muted">
                  média {toPercent(plan.simulated.mean)} · pior {toPercent(plan.simulated.worst)}:{' '}
                  {memberNames(members, plan.simulated.worstMemberIds)}
                </span>
                {isRecommended && (
                  <span className="mt-1 self-start font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-accent-soft">
                    Recomendado pelo motor
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
