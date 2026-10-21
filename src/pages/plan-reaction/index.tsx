import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BrandMark } from '../../components/brand-mark'
import { Button } from '../../components/button'
import { buttonVariants } from '../../components/button-styles'
import { JustificationPanel } from '../../components/plan/justification-panel'
import { PlanHeading } from '../../components/plan/plan-heading'
import { ReactionForm } from '../../components/plan/reaction-form'
import { SatisfactionPanel } from '../../components/plan/satisfaction-panel'
import { ApiError, getInvite, getPlans } from '../../lib/api'
import { reactionOf } from '../../lib/plans'
import { useDocumentTitle } from '../../lib/use-document-title'
import type { Invite, PlanRound } from '../../types/api'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; invite: Invite; round: PlanRound | null }

async function loadPlan(token: string) {
  const invite = await getInvite(token)
  const round = invite.latest_round === null ? null : await getPlans(invite.trip.id, invite.latest_round)
  return { invite, round }
}

export function PlanReactionPage() {
  const { token = '' } = useParams()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useDocumentTitle('Plano da viagem')

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    loadPlan(token).then(
      (data) => {
        if (active) setState({ status: 'ready', ...data })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error })
      },
    )
    return () => {
      active = false
    }
  }, [token, attempt])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-5 pb-8 pt-5">
      <header>
        <BrandMark />
      </header>
      <main className="flex flex-col gap-5">
        {state.status === 'loading' && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Carregando o plano…
          </p>
        )}
        {state.status === 'error' && (
          <PlanError error={state.error} onRetry={() => setAttempt((value) => value + 1)} />
        )}
        {state.status === 'ready' && <PlanContent token={token} invite={state.invite} round={state.round} />}
      </main>
    </div>
  )
}

interface PlanContentProps {
  token: string
  invite: Invite
  round: PlanRound | null
}

function PlanContent({ token, invite, round }: PlanContentProps) {
  const { trip, member } = invite
  const context = round ? `${trip.title} · rodada ${round.round}` : trip.title

  if (!round) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-muted">{trip.title}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">Os planos ainda não foram gerados</h1>
        <p className="text-sm leading-normal text-ink-muted">
          {invite.organizer_name} gera os planos quando o grupo tiver respondido. Volte por este mesmo link para ver o
          resultado e reagir.
        </p>
        <Link to={`/convite/${token}`} className={buttonVariants({ variant: 'secondary', className: 'self-start hover:bg-surface' })}>
          Ver minha resposta
        </Link>
      </div>
    )
  }

  const plan = round.plans.find((item) => item.id === round.recommended_plan_id) ?? round.plans[0]
  // A API real devolve ao convidado só a própria reação; aqui filtramos do mesmo jeito.
  const ownReaction = reactionOf(round.reactions, plan.id, member.id)
  const wasCounted = plan.per_member_scores.some((item) => item.member_id === member.id)

  return (
    <>
      <PlanHeading plan={plan} destinations={invite.destinations} context={context} />
      {!wasCounted && (
        <p className="rounded border border-line-strong bg-surface px-3 py-2.5 text-[13px] leading-normal text-ink-soft">
          Este plano foi calculado sem as suas condições, porque você ainda não tinha respondido.{' '}
          <Link to={`/convite/${token}`} className="text-accent-soft underline underline-offset-2 hover:text-ink">
            Responder agora
          </Link>
        </p>
      )}
      <SatisfactionPanel plan={plan} members={invite.members} viewerId={member.id} />
      <JustificationPanel plan={plan} members={invite.members} />
      <ReactionForm key={plan.id} token={token} planId={plan.id} initialReaction={ownReaction} />
    </>
  )
}

interface PlanErrorProps {
  error: unknown
  onRetry: () => void
}

function PlanError({ error, onRetry }: PlanErrorProps) {
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div role="alert" className="flex flex-col gap-3">
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">
        {notFound ? 'Convite não encontrado' : 'Não foi possível carregar o plano'}
      </h1>
      <p className="text-sm leading-normal text-ink-muted">
        {notFound
          ? 'Confira se o link está completo ou peça um novo convite a quem organizou a viagem.'
          : 'Verifique sua conexão e tente novamente.'}
      </p>
      {!notFound && (
        <Button variant="secondary" className="self-start" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
