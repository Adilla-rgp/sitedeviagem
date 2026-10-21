import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertMessage } from '../../components/alert-message'
import { Button } from '../../components/button'
import { JustificationPanel } from '../../components/plan/justification-panel'
import { PlanHeading } from '../../components/plan/plan-heading'
import { SatisfactionPanel } from '../../components/plan/satisfaction-panel'
import { TripHeader } from '../../components/trip-header'
import { ApiError, getPlans, getTrip } from '../../lib/api'
import { useDocumentTitle } from '../../lib/use-document-title'
import { useGeneratePlans } from '../../lib/use-generate-plans'
import type { PlanRound, TripDetail } from '../../types/api'
import { BalancePanel } from './balance-panel'
import { ReactionsPanel } from './reactions-panel'

const MIN_RESPONSES_TO_PLAN = 2

type PageState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; trip: TripDetail; round: PlanRound | null }

async function loadPlans(tripId: string) {
  const trip = await getTrip(tripId)
  const round = trip.latest_round === null ? null : await getPlans(tripId, trip.latest_round)
  return { trip, round }
}

export function PlansPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useDocumentTitle('Planos e concessões')

  const fetchData = useCallback(() => loadPlans(id), [id])

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    fetchData().then(
      (data) => {
        if (active) setState({ status: 'ready', ...data })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error })
      },
    )

    // Ao voltar para a aba, busca de novo em silêncio: alguém pode ter reagido.
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      fetchData().then(
        (data) => {
          if (active) setState({ status: 'ready', ...data })
        },
        () => {
          // Mantém os dados atuais; o erro aparece na próxima carga completa.
        },
      )
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData, attempt])

  return (
    <>
      <TripHeader tripId={id} />
      {state.status === 'ready' ? (
        state.round ? (
          <PlansContent key={state.round.round} trip={state.trip} round={state.round} />
        ) : (
          <NoPlans trip={state.trip} onGenerated={(round) => setState({ status: 'ready', trip: state.trip, round })} />
        )
      ) : (
        <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-7 sm:px-8">
          {state.status === 'loading' ? (
            <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Carregando os planos…
            </p>
          ) : (
            <PlansError error={state.error} onRetry={() => setAttempt((value) => value + 1)} />
          )}
        </main>
      )}
    </>
  )
}

interface PlansContentProps {
  trip: TripDetail
  round: PlanRound
}

function PlansContent({ trip, round }: PlansContentProps) {
  const recommended = round.plans.find((plan) => plan.id === round.recommended_plan_id) ?? round.plans[0]
  const [alpha, setAlpha] = useState(recommended.alpha)

  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 pb-10 pt-7 sm:px-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <PlanHeading
          plan={recommended}
          destinations={trip.destinations}
          context={`Viagens / ${trip.title} / Rodada ${round.round}`}
        />
        <SatisfactionPanel plan={recommended} members={trip.members} />
        <JustificationPanel plan={recommended} members={trip.members} />
        <ReactionsPanel round={round} members={trip.members} />
      </div>

      <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
        <BalancePanel
          round={round}
          destinations={trip.destinations}
          members={trip.members}
          alpha={alpha}
          onAlphaChange={setAlpha}
        />
      </aside>
    </main>
  )
}

interface NoPlansProps {
  trip: TripDetail
  onGenerated: (round: PlanRound) => void
}

function NoPlans({ trip, onGenerated }: NoPlansProps) {
  const { generate, isGenerating, error } = useGeneratePlans(trip.id)
  const hintId = useId()
  const responded = trip.members.filter((member) => member.responded_at).length
  const canPlan = responded >= MIN_RESPONSES_TO_PLAN

  async function handleGenerate() {
    const round = await generate()
    if (round) onGenerated(round)
  }

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-7 sm:px-8">
      <div className="flex max-w-xl flex-col gap-3">
        <p className="text-[13px] text-ink-muted">Viagens / {trip.title}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Planos e concessões</h1>
        <p id={hintId} className="text-sm leading-normal text-ink-muted">
          {canPlan
            ? `Ainda não há planos para esta viagem. O motor gera até 3 alternativas com as ${responded} respostas recebidas e recomenda a mais justa.`
            : `Ainda não há planos. São necessárias pelo menos ${MIN_RESPONSES_TO_PLAN} respostas; até agora, ${responded}.`}
        </p>
        <Button
          size="lg"
          className="self-start text-[15px]"
          disabled={!canPlan || isGenerating}
          aria-describedby={hintId}
          onClick={handleGenerate}
        >
          {isGenerating && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {isGenerating ? 'Gerando planos…' : 'Gerar planos'}
        </Button>
        {error && <AlertMessage>{error}</AlertMessage>}
      </div>
    </main>
  )
}

interface PlansErrorProps {
  error: unknown
  onRetry: () => void
}

function PlansError({ error, onRetry }: PlansErrorProps) {
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div role="alert" className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">
        {notFound ? 'Viagem não encontrada' : 'Não foi possível carregar os planos'}
      </h1>
      <p className="text-sm text-ink-muted">
        {notFound ? 'Confira se o endereço está completo.' : 'Verifique sua conexão e tente novamente.'}
      </p>
      {!notFound && (
        <Button variant="secondary" className="self-start" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
