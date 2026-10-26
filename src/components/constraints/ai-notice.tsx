import { Info } from 'lucide-react'

interface AiNoticeProps {
  id?: string
}

/** Só quando a API interpreta o texto com um LLM (constraint_parser: 'llm'). */
export function AiNotice({ id }: AiNoticeProps) {
  return (
    <p id={id} className="flex gap-2 text-xs leading-normal text-ink-soft">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Seu texto é enviado a um serviço de IA externo, que só o organiza em limites e preferências. Nada é salvo sem a
        sua confirmação.
      </span>
    </p>
  )
}
