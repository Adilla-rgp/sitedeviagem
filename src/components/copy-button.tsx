import { useEffect, useId, useRef, useState } from 'react'
import { getErrorMessage } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { Button } from './button'

const FEEDBACK_MS = 5000

interface CopyButtonProps {
  label: string
  /** Texto copiado; calculado só no clique, e pode depender da API (por exemplo, gerar um link). */
  getText: () => string | Promise<string>
  successMessage: string
  /** Mensagem quando getText falha; sem ela, a do erro. */
  errorMessage?: string
}

type Feedback =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'copied' }
  | { status: 'failed'; text: string }
  | { status: 'error'; message: string }

export function CopyButton({ label, getText, successMessage, errorMessage }: CopyButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>({ status: 'idle' })
  const timer = useRef<number>()
  const fallbackId = useId()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleCopy() {
    window.clearTimeout(timer.current)
    let text: string
    try {
      setFeedback({ status: 'working' })
      text = await getText()
    } catch (error) {
      setFeedback({ status: 'error', message: getErrorMessage(error, errorMessage ?? 'Não foi possível montar o texto. Tente novamente.') })
      return
    }
    if (await copyText(text)) {
      setFeedback({ status: 'copied' })
      timer.current = window.setTimeout(() => setFeedback({ status: 'idle' }), FEEDBACK_MS)
    } else {
      setFeedback({ status: 'failed', text })
    }
  }

  return (
    <div className="flex flex-col">
      <Button variant="secondary" block className="text-sm" disabled={feedback.status === 'working'} onClick={handleCopy}>
        {label}
      </Button>
      <p role="status" className="text-[13px] leading-normal text-ink-soft [&:not(:empty)]:mt-2">
        {feedback.status === 'copied' && successMessage}
        {feedback.status === 'failed' && 'Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.'}
        {feedback.status === 'error' && feedback.message}
      </p>
      {feedback.status === 'failed' && (
        <>
          <label htmlFor={fallbackId} className="sr-only">
            Texto para copiar
          </label>
          <textarea
            id={fallbackId}
            readOnly
            rows={4}
            value={feedback.text}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full resize-none rounded border border-line-strong bg-surface p-3 text-[13px] text-ink"
          />
        </>
      )}
    </div>
  )
}
