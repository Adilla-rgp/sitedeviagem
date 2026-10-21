import { TriangleAlert } from 'lucide-react'

interface AlertMessageProps {
  id?: string
  children: string
}

// Erros usam tom neutro: o âmbar fica reservado para conflitos e limites.
export function AlertMessage({ id, children }: AlertMessageProps) {
  return (
    <p
      id={id}
      role="alert"
      className="flex gap-2 rounded border border-line-strong bg-surface px-3 py-2.5 text-[13px] leading-normal text-ink-soft"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
