import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertMessage } from '../../components/alert-message'
import { AccessError } from '../../components/access-error'
import { Button } from '../../components/button'
import { FinalPlanNotice } from '../../components/plan/final-plan-notice'
import { JustificationPanel } from '../../components/plan/justification-panel'
import { PlanHeading } from '../../components/plan/plan-heading'
import { ReactionForm } from '../../components/plan/reaction-form'
import { SatisfactionPanel } from '../../components/plan/satisfaction-panel'
import { TripHeader } from '../../components/trip-header'
import { ApiError, getErrorMessage, getPlans, getTrip, isAccessError, reissueInvite } from '../../lib/api'
import { takeAdminTokenFromHash } from '../../lib/tokens'
import { reactionOf } from '../../lib/plans'
import { useDocumentTitle } from '../../lib/use-document-title'
import { useGeneratePlans } from '../../lib/use-generate-plans'
import type { PlanRound, Reaction, TripDetail } from '../../types/api'
import { BalancePanel } from './balance-panel'
import { ExcludedPanel } from './excluded-panel'
import { InfeasibleRound } from './infeasible-round'
import { ReactionsPanel } from './reactions-panel'

const MIN_RESPONSES_TO_PLAN = 2

type PageState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; trip: TripDetail; round: PlanRound | null }

async function loadPlans(tripId: string) {
  takeAdminTokenFromHash(tripId)
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

  // A reação de quem organiza entra na lista sem recarregar a página.
  function handleReactionSaved(reaction: Reaction) {
    setState((current) => {
      if (current.status !== 'ready' || !current.round) return current
      const others = current.round.reactions.filter(
        (item) => !(item.plan_id === reaction.plan_id && item.member_id === reaction.member_id),
      )
      return { ...current, round: { ...current.round, reactions: [...others, reaction] } }
    })
  }

  return (
    <>
      <TripHeader tripId={id} />
      {state.status === 'ready' ? (
        state.round && state.round.plans.length === 0 ? (
          <InfeasibleRound
            key={state.round.round}
            trip={state.trip}
            round={state.round}
            onGenerated={(round) => setState({ status: 'ready', trip: state.trip, round })}
          />
        ) : state.round ? (
          <PlansContent
            key={`${state.round.round}:${state.trip.status}`}
            trip={state.trip}
            round={state.round}
            onReactionSaved={handleReactionSaved}
            onTripClosed={() => setAttempt((value) => value + 1)}
          />
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
  onReactionSaved: (reaction: Reaction) => void
  onTripClosed: () => void
}

function PlansContent({ trip, round, onReactionSaved, onTripClosed }: PlansContentProps) {
  const recommended = round.plans.find((plan) => plan.id === round.recommended_plan_id) ?? round.plans[0]
  const [alpha, setAlpha] = useState(recommended.alpha)
  const organizer = trip.members.find((member) => member.is_organizer)
  const [organizerToken, setOrganizerToken] = useState(organizer?.invite_token ?? null)
  const isClosed = trip.status === 'agreed'

  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 pb-10 pt-7 sm:px-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <PlanHeading
          plan={recommended}
          destinations={trip.destinations}
          context={`Viagens / ${trip.title} / Rodada ${round.round}`}
          isFinal={isClosed}
        />
        {isClosed && <FinalPlanNotice />}
        <SatisfactionPanel plan={recommended} members={trip.members} />
        <JustificationPanel plan={recommended} members={trip.members} />
        {organizer &&
          (organizerToken ? (
            <ReactionForm
              key={recommended.id}
              token={organizerToken}
              planId={recommended.id}
              initialReaction={reactionOf(round.reactions, recommended.id, organizer.id)}
              destinations={trip.destinations}
              isClosed={isClosed}
              latestRoundPath={`/viagens/${trip.id}/planos`}
              respondPath={`/convite/${organizerToken}`}
              onSaved={onReactionSaved}
              onTripClosed={onTripClosed}
            />
          ) : (
            !isClosed && <OrganizerInvite tripId={trip.id} memberId={organizer.id} onToken={setOrganizerToken} />
          ))}
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
        <ExcludedPanel round={round} destinations={trip.destinations} members={trip.members} />
      </aside>
    </main>
  )
}

interface OrganizerInviteProps {
  tripId: string
  memberId: string
  onToken: (token: string) => void
}

/** Quem organiza reage pelo próprio convite; sem ele guardado aqui, gera um novo. */
function OrganizerInvite({ tripId, memberId, onToken }: OrganizerInviteProps) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReissue() {
    setIsWorking(true)
    setError(null)
    try {
      const member = await reissueInvite(tripId, memberId)
      if (member.invite_token) onToken(member.invite_token)
    } catch (caught) {
      setError(getErrorMessage(caught, 'Não foi possível gerar o link. Tente novamente.'))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section
      aria-labelledby="organizer-invite-heading"
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="organizer-invite-heading" className="text-base font-semibold">
        Sua reação
      </h2>
      <p className="text-sm leading-normal text-ink-soft">
        Você reage pelo seu link de convite, e ele não está guardado neste navegador. Gere um novo para reagir daqui; o
        link anterior deixa de valer.
      </p>
      {error && <AlertMessage>{error}</AlertMessage>}
      <Button variant="secondary" className="self-start" disabled={isWorking} onClick={handleReissue}>
        {isWorking && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {isWorking ? 'Gerando…' : 'Gerar meu link e reagir'}
      </Button>
    </section>
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
  if (isAccessError(error)) return <AccessError message={(error as ApiError).message} />

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
