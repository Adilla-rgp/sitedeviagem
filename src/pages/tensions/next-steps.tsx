import { LoaderCircle } from 'lucide-react'
import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertMessage } from '../../components/alert-message'
import { Button } from '../../components/button'
import { CopyButton } from '../../components/copy-button'
import { formatList } from '../../lib/format'
import { inviteLinks, missingLinks } from '../../lib/invites'
import { useGeneratePlans } from '../../lib/use-generate-plans'
import type { TripDetail } from '../../types/api'

const MIN_RESPONSES_TO_PLAN = 2

interface NextStepsProps {
  trip: TripDetail
  respondedCount: number
}

export function NextSteps({ trip, respondedCount }: NextStepsProps) {
  const navigate = useNavigate()
  const hintId = useId()
  const { generate, isGenerating, error } = useGeneratePlans(trip.id)
  const pending = trip.members.filter((member) => !member.responded_at)
  const isClosed = trip.status === 'agreed'
  const canPlan = respondedCount >= MIN_RESPONSES_TO_PLAN && !isClosed
  const missing = missingLinks(trip.id, pending)
  const plansPath = `/viagens/${trip.id}/planos`
  const responsesLabel = `${respondedCount} ${respondedCount === 1 ? 'resposta' : 'respostas'}`

  async function handleGenerate() {
    if (await generate()) navigate(plansPath)
  }

  async function buildReminderText() {
    const links = await inviteLinks(trip.id, pending)
    if (pending.length === 1) {
      const [member] = pending
      return `Oi, ${member.display_name}! Falta só a sua resposta para a viagem "${trip.title}". Leva um minuto: ${links.get(member.id) ?? ''}`
    }
    const names = formatList(pending.map((member) => member.display_name))
    const lines = pending.map((member) => `${member.display_name}: ${links.get(member.id) ?? ''}`)
    return [
      `Oi! Ainda faltam as respostas de ${names} para a viagem "${trip.title}". Cada pessoa tem o próprio link:`,
      ...lines,
    ].join('\n')
  }

  const generateContent = (
    <>
      {isGenerating && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {isGenerating
        ? 'Gerando planos…'
        : trip.latest_round === null
          ? `Gerar planos com ${responsesLabel}`
          : `Gerar nova rodada com ${responsesLabel}`}
    </>
  )

  return (
    <div className="flex flex-col gap-2">
      {trip.latest_round === null ? (
        <Button
          size="lg"
          block
          className="text-[15px]"
          disabled={!canPlan || isGenerating}
          aria-describedby={canPlan ? undefined : hintId}
          onClick={handleGenerate}
        >
          {generateContent}
        </Button>
      ) : (
        <>
          {/* Já existe rodada: ver os planos é a ação principal; gerar outra reinicia as reações. */}
          <Button size="lg" block className="text-[15px]" onClick={() => navigate(plansPath)}>
            {isClosed ? 'Ver o plano final' : `Ver planos da rodada ${trip.latest_round}`}
          </Button>
          <Button
            variant="secondary"
            block
            className="text-sm"
            disabled={!canPlan || isGenerating}
            aria-describedby={hintId}
            onClick={handleGenerate}
          >
            {generateContent}
          </Button>
        </>
      )}
      {isClosed ? (
        <p id={hintId} className="text-[13px] text-ink-muted">
          A viagem fechou: todos que responderam aceitaram o plano recomendado. Não há novas rodadas.
        </p>
      ) : !canPlan ? (
        <p id={hintId} className="text-[13px] text-ink-muted">
          São necessárias pelo menos {MIN_RESPONSES_TO_PLAN} respostas para gerar planos.
        </p>
      ) : (
        trip.latest_round !== null && (
          <p id={hintId} className="text-[13px] text-ink-muted">
            Uma nova rodada começa sem reações.
          </p>
        )
      )}
      {error && <AlertMessage>{error}</AlertMessage>}
      {pending.length > 0 && !isClosed && (
        <>
          {missing.length > 0 && (
            <p className="text-xs leading-normal text-ink-muted">
              Sem link guardado neste navegador para {formatList(missing.map((member) => member.display_name))}: ao
              copiar o lembrete, um link novo é gerado e o anterior deixa de valer.
            </p>
          )}
          <CopyButton
            label={pending.length === 1 ? `Copiar lembrete para ${pending[0].display_name}` : 'Copiar lembrete para quem falta'}
            getText={buildReminderText}
            successMessage="Lembrete copiado com o link do convite. Cole na conversa."
            errorMessage="Não foi possível gerar o link do convite. Tente novamente."
          />
        </>
      )}
    </div>
  )
}
