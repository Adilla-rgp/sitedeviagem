import { useEffect, useId, useRef, useState } from 'react'
import { copyText } from '../lib/clipboard'
import { Button } from './button'

const FEEDBACK_MS = 5000

interface CopyButtonProps {
  label: string
  /** Texto copiado; calculado só no clique. */
  getText: () => string
  successMessage: string
}

type Feedback = { status: 'idle' } | { status: 'copied' } | { status: 'failed'; text: string }

export function CopyButton({ label, getText, successMessage }: CopyButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>({ status: 'idle' })
  const timer = useRef<number>()
  const fallbackId = useId()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleCopy() {
    const text = getText()
    window.clearTimeout(timer.current)
    if (await copyText(text)) {
      setFeedback({ status: 'copied' })
      timer.current = window.setTimeout(() => setFeedback({ status: 'idle' }), FEEDBACK_MS)
    } else {
      setFeedback({ status: 'failed', text })
    }
  }

  return (
    <div className="flex flex-col">
      <Button variant="secondary" block className="text-sm" onClick={handleCopy}>
        {label}
      </Button>
      <p role="status" className="text-[13px] leading-normal text-ink-soft [&:not(:empty)]:mt-2">
        {feedback.status === 'copied' && successMessage}
        {feedback.status === 'failed' && 'Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.'}
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
