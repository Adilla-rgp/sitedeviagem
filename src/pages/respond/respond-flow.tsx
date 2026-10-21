import { CircleCheck, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/button'
import { buttonVariants } from '../../components/button-styles'
import { getErrorMessage, parseConstraints, saveConstraints } from '../../lib/api'
import { formatCount, formatDateRange } from '../../lib/format'
import type { Constraints, ConstraintsInput, Invite } from '../../types/api'
import { AlertMessage } from '../../components/alert-message'
import { ConstraintList } from './constraint-list'
import { ConstraintNotes } from './constraint-notes'
import { InviteHeader, type RespondStep } from './invite-header'

type FocusTarget = 'textarea' | 'interpretation' | 'sent'

interface RespondFlowProps {
  token: string
  invite: Invite
}

export function RespondFlow({ token, invite }: RespondFlowProps) {
  const [text, setText] = useState(invite.constraints?.raw_text ?? '')
  const [interpretation, setInterpretation] = useState<ConstraintsInput | null>(null)
  const [saved, setSaved] = useState<Constraints | null>(invite.constraints)
  const [isSent, setIsSent] = useState(invite.constraints !== null)

  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const interpretationHeadingRef = useRef<HTMLHeadingElement>(null)
  const sentHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)

  const textareaId = useId()
  const hintId = useId()
  const parseErrorId = useId()

  // Move o foco depois que a nova etapa já está na tela.
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const element = {
      textarea: textareaRef.current,
      interpretation: interpretationHeadingRef.current,
      sent: sentHeadingRef.current,
    }[target]
    element?.focus()
  })

  const isStale = interpretation !== null && text.trim() !== interpretation.raw_text
  const itemCount = interpretation ? interpretation.hard.length + interpretation.soft.length : 0
  const canConfirm = interpretation !== null && !isStale && itemCount > 0
  const step: RespondStep = isSent ? 3 : interpretation ? 2 : 1

  const { trip, member, organizer_name, member_count, destinations } = invite
  const tripMeta = [
    formatCount(member_count, 'pessoa', 'pessoas'),
    formatCount(destinations.length, 'destino', 'destinos'),
    `janela de ${formatDateRange(trip.date_window_start, trip.date_window_end)}`,
  ].join(' · ')

  async function handleInterpret() {
    if (text.trim() === '') {
      setParseError('Escreva sua resposta antes de interpretar.')
      pendingFocus.current = 'textarea'
      return
    }

    setIsParsing(true)
    setParseError(null)
    setSaveError(null)
    setAnnouncement('Interpretando sua resposta…')
    try {
      const result = await parseConstraints(token, text)
      setInterpretation(result)
      setAnnouncement('Interpretação pronta. Revise os itens antes de enviar.')
      pendingFocus.current = 'interpretation'
    } catch (error) {
      setParseError(getErrorMessage(error, 'Não foi possível interpretar sua resposta. Tente novamente.'))
      setAnnouncement('')
      pendingFocus.current = 'textarea'
    } finally {
      setIsParsing(false)
    }
  }

  function handleRemove(id: string, summary: string) {
    setInterpretation((current) =>
      current && {
        ...current,
        hard: current.hard.filter((item) => item.id !== id),
        soft: current.soft.filter((item) => item.id !== id),
      },
    )
    setAnnouncement(`Item removido: ${summary}.`)
    pendingFocus.current = 'interpretation'
  }

  async function handleConfirm() {
    if (!interpretation || !canConfirm) return

    setIsSaving(true)
    setSaveError(null)
    setAnnouncement('Enviando sua resposta…')
    try {
      const record = await saveConstraints(token, interpretation)
      setSaved(record)
      setIsSent(true)
      setInterpretation(null)
      setAnnouncement('')
      pendingFocus.current = 'sent'
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Não foi possível enviar sua resposta. Tente novamente.'))
      setAnnouncement('')
    } finally {
      setIsSaving(false)
    }
  }

  function handleEditResponse() {
    if (saved) {
      setText(saved.raw_text)
      setInterpretation({ raw_text: saved.raw_text, hard: saved.hard, soft: saved.soft })
    }
    setIsSent(false)
    pendingFocus.current = 'textarea'
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-6 pt-5">
      <InviteHeader step={step} />

      <main className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-ink-muted">
            {member.is_organizer ? 'Você está organizando' : `${organizer_name} convidou você para`}
          </p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">{trip.title}</h1>
          <p className="text-[13px] text-ink-muted">{tripMeta}</p>
        </div>

        {isSent && saved ? (
          <section
            aria-labelledby="sent-heading"
            className="flex flex-col gap-3 rounded border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <CircleCheck className="size-5 shrink-0 text-accent" aria-hidden="true" />
              <h2 id="sent-heading" ref={sentHeadingRef} tabIndex={-1} className="text-[15px] font-semibold focus-visible:outline-none">
                Resposta enviada
              </h2>
            </div>
            <p className="text-sm leading-normal text-ink-soft">
              Obrigado, {member.display_name}. Suas condições já entram no cálculo do grupo. Quando os planos forem
              gerados, você poderá ver o resultado e reagir por este mesmo link.
            </p>
            <ConstraintList constraints={saved} />
            <ConstraintNotes hasBudget={saved.hard.some((item) => item.kind === 'budget')} />
          </section>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor={textareaId} className="text-[15px] font-medium">
                Quais são suas condições para esta viagem?
              </label>
              <p id={hintId} className="text-[13px] text-ink-muted">
                Escreva livremente. Nós organizamos sua resposta em limites e preferências.
              </p>
              <textarea
                id={textareaId}
                ref={textareaRef}
                rows={4}
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  if (parseError) setParseError(null)
                }}
                placeholder="Ex.: Posso de 10 a 20 de julho. No máximo uns 1.100 conto com tudo. Não curto frio."
                aria-describedby={parseError ? `${hintId} ${parseErrorId}` : hintId}
                aria-invalid={parseError ? true : undefined}
                className="w-full resize-none rounded border border-line-strong bg-surface p-3 text-[15px] leading-[1.45] text-ink placeholder:text-ink-muted focus-visible:border-accent"
              />
              {parseError && <AlertMessage id={parseErrorId}>{parseError}</AlertMessage>}
            </div>

            {interpretation && (
              <section
                aria-labelledby="interpretation-heading"
                aria-busy={isParsing}
                className="flex flex-col gap-3 rounded border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2
                    id="interpretation-heading"
                    ref={interpretationHeadingRef}
                    tabIndex={-1}
                    className="text-[15px] font-semibold focus-visible:outline-none"
                  >
                    Interpretação da sua resposta
                  </h2>
                  <span className="text-xs text-ink-muted">revise antes de enviar</span>
                </div>

                {isStale && (
                  <p className="text-[13px] leading-normal text-ink-soft">
                    Você alterou o texto depois da interpretação. Interprete novamente para atualizar os itens.
                  </p>
                )}

                {itemCount > 0 ? (
                  <ConstraintList constraints={interpretation} onRemove={handleRemove} />
                ) : (
                  <p className="text-[13px] leading-normal text-ink-soft">
                    Você removeu todos os itens. Ajuste o texto e interprete novamente.
                  </p>
                )}

                <ConstraintNotes hasBudget={interpretation.hard.some((item) => item.kind === 'budget')} />
              </section>
            )}

            {saveError && <AlertMessage>{saveError}</AlertMessage>}
          </>
        )}

        <div className="mt-auto flex flex-col gap-2.5">
          {isSent ? (
            <>
              {invite.latest_round !== null && (
                <Link to={`/convite/${token}/plano`} className={buttonVariants({ size: 'lg', block: true, className: 'hover:bg-accent-soft' })}>
                  Ver o plano recomendado
                </Link>
              )}
              <Button variant="secondary" size="md" block onClick={handleEditResponse}>
                Alterar resposta
              </Button>
            </>
          ) : canConfirm ? (
            <Button size="lg" block disabled={isSaving} onClick={handleConfirm}>
              {isSaving && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSaving ? 'Enviando…' : 'Confirmar e enviar'}
            </Button>
          ) : (
            <Button size="lg" block disabled={isParsing} onClick={handleInterpret}>
              {isParsing && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isParsing ? 'Interpretando…' : interpretation ? 'Interpretar novamente' : 'Interpretar'}
            </Button>
          )}
        </div>
      </main>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
