import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertMessage } from '../alert-message'
import { Button } from '../button'
import { buttonVariants } from '../button-styles'
import { ConstraintList } from '../constraints/constraint-list'
import { ConstraintNotes } from '../constraints/constraint-notes'
import { confirmRejection, conflictKind, createReaction, getErrorMessage } from '../../lib/api'
import { VERDICT_LABEL } from '../../lib/plans'
import type { ConstraintDraft, Destination, Reaction, Verdict } from '../../types/api'

type CommentVerdict = Exclude<Verdict, 'accepted'>

const COMMENT_PROMPT: Record<CommentVerdict, { label: string; hint: string; submit: string }> = {
  accepted_with_reservation: {
    label: 'Qual é a sua ressalva?',
    hint: 'O grupo vê sua ressalva junto com a reação.',
    submit: 'Enviar ressalva',
  },
  rejected: {
    label: 'Por que você recusa este plano?',
    hint: 'Depois de enviar, você confere como o motivo foi interpretado e confirma o que entra na próxima rodada.',
    submit: 'Enviar recusa',
  },
}

const CONFIRMATION: Record<Verdict, string> = {
  accepted: 'Você aceitou o plano recomendado.',
  accepted_with_reservation: 'Você aceitou o plano com uma ressalva.',
  rejected: 'Você recusou o plano.',
}

/** O que acontece com o motivo da recusa: interpretado, confirmado ou deixado de lado. */
type DraftState =
  | { status: 'none' }
  /** found: quantos itens a interpretação encontrou, antes de a pessoa remover algum. */
  | { status: 'review'; draft: ConstraintDraft; found: number }
  | { status: 'confirmed'; draft: ConstraintDraft }
  | { status: 'skipped' }

type FocusTarget = 'choices' | 'comment' | 'confirmation' | 'draft'

interface ReactionFormProps {
  /** Token do convite de quem reage (convidado ou quem organiza). */
  token: string
  planId: string
  initialReaction: Reaction | null
  /** Destinos da viagem, para dizer o que cada limite do motivo elimina. */
  destinations: Destination[]
  /** Viagem fechada: mostra a reação e desabilita as ações. */
  isClosed: boolean
  /** Onde ver a rodada mais recente, se esta ficar antiga enquanto a tela está aberta. */
  latestRoundPath: string
  /** Onde alterar a resposta (as condições), pelo convite. */
  respondPath: string
  onSaved?: (reaction: Reaction) => void
  /** A API respondeu que a viagem fechou: a página carrega de novo. */
  onTripClosed?: () => void
}

export function ReactionForm({
  token,
  planId,
  initialReaction,
  destinations,
  isClosed,
  latestRoundPath,
  respondPath,
  onSaved,
  onTripClosed,
}: ReactionFormProps) {
  const [reaction, setReaction] = useState(initialReaction)
  const [isEditing, setIsEditing] = useState(initialReaction === null)
  const [pendingVerdict, setPendingVerdict] = useState<CommentVerdict | null>(null)
  const [comment, setComment] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOldRound, setIsOldRound] = useState(false)
  const [draft, setDraft] = useState<DraftState>({ status: 'none' })
  const [isConfirming, setIsConfirming] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const choicesRef = useRef<HTMLHeadingElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const confirmationRef = useRef<HTMLHeadingElement>(null)
  const draftRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)
  const commentId = useId()
  const hintId = useId()
  const errorId = useId()

  // Move o foco depois que a nova etapa já está na tela.
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const element = {
      choices: choicesRef.current,
      comment: commentRef.current,
      confirmation: confirmationRef.current,
      draft: draftRef.current,
    }[target]
    element?.focus()
  })

  /** 409: rodada antiga ou viagem fechada. Devolve true se tratou o erro. */
  function handleConflict(caught: unknown): boolean {
    const kind = conflictKind(caught)
    if (kind === 'old_round') {
      setIsOldRound(true)
      return true
    }
    if (kind === 'trip_closed') {
      onTripClosed?.()
      return true
    }
    return false
  }

  async function submit(verdict: Verdict, text: string | null) {
    setIsSaving(true)
    setError(null)
    try {
      const { constraint_draft, trip_status, ...saved } = await createReaction(planId, {
        invite_token: token,
        verdict,
        comment: text,
      })
      setReaction(saved)
      onSaved?.(saved)
      setIsEditing(false)
      setPendingVerdict(null)
      setDraft(
        constraint_draft
          ? {
              status: 'review',
              draft: constraint_draft,
              found: constraint_draft.hard.length + constraint_draft.soft.length,
            }
          : { status: 'none' },
      )
      setDraftError(null)
      pendingFocus.current = constraint_draft ? 'draft' : 'confirmation'
      if (trip_status === 'agreed') onTripClosed?.()
    } catch (caught) {
      if (handleConflict(caught)) return
      setError(getErrorMessage(caught, 'Não foi possível enviar sua reação. Tente novamente.'))
      pendingFocus.current = pendingVerdict ? 'comment' : null
    } finally {
      setIsSaving(false)
    }
  }

  function removeDraftItem(id: string) {
    setDraft((current) =>
      current.status === 'review'
        ? {
            ...current,
            draft: {
              ...current.draft,
              hard: current.draft.hard.filter((item) => item.id !== id),
              soft: current.draft.soft.filter((item) => item.id !== id),
            },
          }
        : current,
    )
    pendingFocus.current = 'draft'
  }

  async function confirmDraft() {
    if (draft.status !== 'review') return
    setIsConfirming(true)
    setDraftError(null)
    try {
      await confirmRejection(planId, { invite_token: token, hard: draft.draft.hard, soft: draft.draft.soft })
      setDraft({ status: 'confirmed', draft: draft.draft })
      pendingFocus.current = 'draft'
    } catch (caught) {
      if (handleConflict(caught)) return
      setDraftError(getErrorMessage(caught, 'Não foi possível confirmar a restrição. Tente novamente.'))
    } finally {
      setIsConfirming(false)
    }
  }

  function chooseWithComment(verdict: CommentVerdict) {
    setPendingVerdict(verdict)
    setError(null)
    setComment(reaction?.verdict === verdict ? (reaction.comment ?? '') : '')
    pendingFocus.current = 'comment'
  }

  function handleCommentSubmit() {
    if (!pendingVerdict) return
    if (comment.trim().length === 0) {
      setError(pendingVerdict === 'rejected' ? 'Conte o motivo da recusa.' : 'Conte qual é a sua ressalva.')
      pendingFocus.current = 'comment'
      return
    }
    void submit(pendingVerdict, comment.trim())
  }

  function cancelComment() {
    setPendingVerdict(null)
    setError(null)
    pendingFocus.current = 'choices'
  }

  function startChange() {
    setIsEditing(true)
    setDraft({ status: 'none' })
    pendingFocus.current = 'choices'
  }

  if (isOldRound) {
    return (
      <section
        role="alert"
        aria-labelledby="old-round-heading"
        className="flex flex-col gap-3 rounded-panel border border-line-strong bg-surface p-4 sm:p-5"
      >
        <h2 id="old-round-heading" className="text-base font-semibold">
          Há uma rodada mais recente
        </h2>
        <p className="text-sm leading-normal text-ink-soft">
          Este plano é de uma rodada anterior, e as reações valem só para a rodada mais recente. Veja os planos novos e
          reaja de novo.
        </p>
        {/* Link comum: recarrega a página com a rodada mais recente. */}
        <a href={latestRoundPath} className={buttonVariants({ className: 'self-start hover:bg-accent-soft' })}>
          Ver a rodada mais recente
        </a>
      </section>
    )
  }

  if (isClosed) {
    return (
      <section
        aria-labelledby="reaction-closed-heading"
        className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-4 sm:p-5"
      >
        <h2 id="reaction-closed-heading" className="text-base font-semibold">
          {reaction ? `Sua reação: ${VERDICT_LABEL[reaction.verdict]}` : 'Reações encerradas'}
        </h2>
        {reaction?.comment && <p className="text-sm leading-normal text-ink-soft">“{reaction.comment}”</p>}
        <p className="text-sm leading-normal text-ink-muted">
          A viagem fechou com este plano: todos que responderam aceitaram. Não é mais possível mudar a reação.
        </p>
      </section>
    )
  }

  if (!isEditing && reaction) {
    return (
      <div className="flex flex-col gap-4">
        <section
          aria-labelledby="reaction-done-heading"
          className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5"
        >
          <h2
            id="reaction-done-heading"
            ref={confirmationRef}
            tabIndex={-1}
            className="text-base font-semibold focus-visible:outline-none"
          >
            Sua reação: {VERDICT_LABEL[reaction.verdict]}
          </h2>
          <p className="text-sm leading-normal text-ink-soft">{CONFIRMATION[reaction.verdict]}</p>
          {reaction.comment && <p className="text-sm leading-normal text-ink-soft">“{reaction.comment}”</p>}
          <Button variant="secondary" className="self-start" onClick={startChange}>
            Mudar minha reação
          </Button>
        </section>
        {draft.status !== 'none' && (
          <RejectionDraft
            state={draft}
            destinations={destinations}
            headingRef={draftRef}
            isConfirming={isConfirming}
            error={draftError}
            respondPath={respondPath}
            onRemove={removeDraftItem}
            onConfirm={confirmDraft}
            onSkip={() => {
              setDraft({ status: 'skipped' })
              pendingFocus.current = 'draft'
            }}
          />
        )}
      </div>
    )
  }

  const prompt = pendingVerdict ? COMMENT_PROMPT[pendingVerdict] : null

  return (
    <section aria-labelledby="reaction-heading" className="flex flex-col gap-3">
      <h2
        id="reaction-heading"
        ref={choicesRef}
        tabIndex={-1}
        className="text-base font-semibold focus-visible:outline-none"
      >
        O que você acha deste plano?
      </h2>

      {prompt && pendingVerdict ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={commentId} className="text-[15px] font-medium">
            {prompt.label}
          </label>
          <p id={hintId} className="text-[13px] text-ink-muted">
            {prompt.hint}
          </p>
          <textarea
            id={commentId}
            ref={commentRef}
            rows={3}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value)
              if (error) setError(null)
            }}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
            className="w-full resize-none rounded border border-line-strong bg-surface p-3 text-[15px] leading-[1.45] text-ink placeholder:text-ink-muted focus-visible:border-accent"
          />
          {error && <AlertMessage id={errorId}>{error}</AlertMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button size="lg" className="flex-[1_1_160px] text-[15px]" disabled={isSaving} onClick={handleCommentSubmit}>
              {isSaving && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSaving ? 'Enviando…' : prompt.submit}
            </Button>
            <Button variant="secondary" size="lg" className="flex-[1_1_160px] text-[15px]" disabled={isSaving} onClick={cancelComment}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            <Button
              size="lg"
              className="flex-[1_1_160px] text-[15px]"
              disabled={isSaving}
              onClick={() => void submit('accepted', null)}
            >
              {isSaving && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSaving ? 'Enviando…' : VERDICT_LABEL.accepted}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-[1_1_160px] text-[15px]"
              disabled={isSaving}
              onClick={() => chooseWithComment('accepted_with_reservation')}
            >
              {VERDICT_LABEL.accepted_with_reservation}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-[1_1_160px] text-[15px]"
              disabled={isSaving}
              onClick={() => chooseWithComment('rejected')}
            >
              {VERDICT_LABEL.rejected}
            </Button>
          </div>
          {error && <AlertMessage>{error}</AlertMessage>}
          {reaction && (
            <Button
              variant="ghost"
              className="self-start text-sm"
              onClick={() => {
                setIsEditing(false)
                pendingFocus.current = 'confirmation'
              }}
            >
              Manter minha reação atual ({VERDICT_LABEL[reaction.verdict].toLowerCase()})
            </Button>
          )}
        </>
      )}
    </section>
  )
}

interface RejectionDraftProps {
  state: Exclude<DraftState, { status: 'none' }>
  destinations: Destination[]
  headingRef: React.RefObject<HTMLHeadingElement>
  isConfirming: boolean
  error: string | null
  respondPath: string
  onRemove: (id: string) => void
  onConfirm: () => void
  onSkip: () => void
}

/** A interpretação do motivo da recusa, para revisar e confirmar como na tela Responder. */
function RejectionDraft({
  state,
  destinations,
  headingRef,
  isConfirming,
  error,
  respondPath,
  onRemove,
  onConfirm,
  onSkip,
}: RejectionDraftProps) {
  const heading = (text: string) => (
    <h2 ref={headingRef} tabIndex={-1} id="draft-heading" className="text-[15px] font-semibold focus-visible:outline-none">
      {text}
    </h2>
  )
  const respondLink = (
    <Link to={respondPath} className="text-accent-soft underline underline-offset-2 hover:text-ink">
      alterar sua resposta
    </Link>
  )

  if (state.status === 'skipped') {
    return (
      <section aria-labelledby="draft-heading" className="flex flex-col gap-2 rounded border border-line bg-surface p-4">
        {heading('Motivo não confirmado')}
        <p className="text-sm leading-normal text-ink-soft">
          Nada muda nas suas condições. O grupo vê o motivo junto com a recusa; para mudar o que entra no cálculo, você
          pode {respondLink}.
        </p>
      </section>
    )
  }

  const { draft } = state
  const itemCount = draft.hard.length + draft.soft.length
  const hasBudget = draft.hard.some((item) => item.kind === 'budget')

  if (state.status === 'confirmed') {
    return (
      <section aria-labelledby="draft-heading" className="flex flex-col gap-3 rounded border border-line bg-surface p-4">
        {heading('Restrição confirmada')}
        <p className="text-sm leading-normal text-ink-soft">
          Ela entra nas suas condições e vale a partir da próxima rodada de planos.
        </p>
        <ConstraintList constraints={draft} limits={draft.member_limits} destinations={destinations} />
        <ConstraintNotes hasBudget={hasBudget} />
      </section>
    )
  }

  return (
    <section
      aria-labelledby="draft-heading"
      aria-busy={isConfirming}
      className="flex flex-col gap-3 rounded border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {heading('Interpretação do motivo')}
        <span className="text-xs text-ink-muted">revise antes de confirmar</span>
      </div>
      {itemCount > 0 ? (
        <>
          <p className="text-[13px] leading-normal text-ink-soft">
            Confirme o que deve valer na próxima rodada. Limites se somam aos que você já tem; uma preferência nova
            substitui a anterior do mesmo tipo.
          </p>
          <ConstraintList
            constraints={draft}
            limits={draft.member_limits}
            destinations={destinations}
            onRemove={(id) => onRemove(id)}
          />
          <ConstraintNotes hasBudget={hasBudget} />
          {error && <AlertMessage>{error}</AlertMessage>}
          <div className="flex flex-wrap gap-2.5">
            <Button size="lg" className="flex-[1_1_160px] text-[15px]" disabled={isConfirming} onClick={onConfirm}>
              {isConfirming && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isConfirming ? 'Confirmando…' : 'Confirmar restrição'}
            </Button>
            <Button variant="secondary" size="lg" className="flex-[1_1_160px] text-[15px]" disabled={isConfirming} onClick={onSkip}>
              Agora não
            </Button>
          </div>
        </>
      ) : state.found > 0 ? (
        <>
          <p className="text-sm leading-normal text-ink-soft">
            Você removeu todos os itens. Se nada do motivo deve entrar no cálculo, deixe a restrição de lado.
          </p>
          <Button variant="secondary" className="self-start" onClick={onSkip}>
            Deixar de lado
          </Button>
        </>
      ) : (
        <p className="text-sm leading-normal text-ink-soft">
          Não encontramos um limite ou uma preferência no motivo. O grupo vê o motivo junto com a recusa; para mudar o
          que entra no cálculo, você pode {respondLink}.
        </p>
      )}
    </section>
  )
}
