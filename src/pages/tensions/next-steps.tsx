import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/button'
import { CopyButton } from '../../components/copy-button'
import { formatList } from '../../lib/format'
import { inviteUrl } from '../../lib/links'
import type { TripDetail } from '../../types/api'

const MIN_RESPONSES_TO_PLAN = 2

interface NextStepsProps {
  trip: TripDetail
  respondedCount: number
}

export function NextSteps({ trip, respondedCount }: NextStepsProps) {
  const navigate = useNavigate()
  const hintId = useId()
  const pending = trip.members.filter((member) => !member.responded_at)
  const canPlan = respondedCount >= MIN_RESPONSES_TO_PLAN

  function buildReminderText() {
    if (pending.length === 1) {
      const [member] = pending
      return `Oi, ${member.display_name}! Falta só a sua resposta para a viagem "${trip.title}". Leva um minuto: ${inviteUrl(member.invite_token)}`
    }
    const names = formatList(pending.map((member) => member.display_name))
    const lines = pending.map((member) => `${member.display_name}: ${inviteUrl(member.invite_token)}`)
    return [
      `Oi! Ainda faltam as respostas de ${names} para a viagem "${trip.title}". Cada pessoa tem o próprio link:`,
      ...lines,
    ].join('\n')
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        block
        className="text-[15px]"
        disabled={!canPlan}
        aria-describedby={canPlan ? undefined : hintId}
        onClick={() => navigate(`/viagens/${trip.id}/planos`)}
      >
        Gerar planos com {respondedCount} {respondedCount === 1 ? 'resposta' : 'respostas'}
      </Button>
      {!canPlan && (
        <p id={hintId} className="text-[13px] text-ink-muted">
          São necessárias pelo menos {MIN_RESPONSES_TO_PLAN} respostas para gerar planos.
        </p>
      )}
      {pending.length > 0 && (
        <CopyButton
          label={pending.length === 1 ? `Copiar lembrete para ${pending[0].display_name}` : 'Copiar lembrete para quem falta'}
          getText={buildReminderText}
          successMessage="Lembrete copiado com o link do convite. Cole na conversa."
        />
      )}
    </div>
  )
}
