import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { AlertMessage } from '../alert-message'
import { Button } from '../button'
import { createReaction, getErrorMessage } from '../../lib/api'
import { VERDICT_LABEL } from '../../lib/plans'
import type { Reaction, Verdict } from '../../types/api'

type CommentVerdict = Exclude<Verdict, 'accepted'>

const COMMENT_PROMPT: Record<CommentVerdict, { label: string; hint: string; submit: string }> = {
  accepted_with_reservation: {
    label: 'Qual é a sua ressalva?',
    hint: 'O grupo vê sua ressalva junto com a reação.',
    submit: 'Enviar ressalva',
  },
  rejected: {
    label: 'Por que você recusa este plano?',
    hint: 'Seu motivo vira uma restrição na próxima rodada.',
    submit: 'Enviar recusa',
  },
}

const CONFIRMATION: Record<Verdict, string> = {
  accepted: 'Você aceitou o plano recomendado.',
  accepted_with_reservation: 'Você aceitou o plano com uma ressalva.',
  rejected: 'Você recusou o plano. Seu motivo entra como restrição na próxima rodada.',
}

type FocusTarget = 'choices' | 'comment' | 'confirmation'

interface ReactionFormProps {
  /** Token do convite de quem reage (convidado ou organizadora). */
  token: string
  planId: string
  initialReaction: Reaction | null
  onSaved?: (reaction: Reaction) => void
}

export function ReactionForm({ token, planId, initialReaction, onSaved }: ReactionFormProps) {
  const [reaction, setReaction] = useState(initialReaction)
  const [isEditing, setIsEditing] = useState(initialReaction === null)
  const [pendingVerdict, setPendingVerdict] = useState<CommentVerdict | null>(null)
  const [comment, setComment] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choicesRef = useRef<HTMLHeadingElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const confirmationRef = useRef<HTMLHeadingElement>(null)
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
    }[target]
    element?.focus()
  })

  async function submit(verdict: Verdict, text: string | null) {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await createReaction(planId, { invite_token: token, verdict, comment: text })
      setReaction(saved)
      onSaved?.(saved)
      setIsEditing(false)
      setPendingVerdict(null)
      pendingFocus.current = 'confirmation'
    } catch (caught) {
      setError(getErrorMessage(caught, 'Não foi possível enviar sua reação. Tente novamente.'))
      pendingFocus.current = pendingVerdict ? 'comment' : null
    } finally {
      setIsSaving(false)
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
    pendingFocus.current = 'choices'
  }

  if (!isEditing && reaction) {
    return (
      <section aria-labelledby="reaction-done-heading" className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5">
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
