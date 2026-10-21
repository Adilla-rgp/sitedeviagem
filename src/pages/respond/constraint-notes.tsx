import { Lock } from 'lucide-react'

interface ConstraintNotesProps {
  hasBudget: boolean
}

export function ConstraintNotes({ hasBudget }: ConstraintNotesProps) {
  return (
    <>
      <p className="text-xs leading-normal text-ink-muted">
        Limites nunca são violados no plano. Preferências entram no cálculo de satisfação.
      </p>
      {hasBudget && (
        <p className="flex gap-2 border-t border-line pt-3 text-xs leading-normal text-ink-soft">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>Seu orçamento é confidencial: usado apenas no cálculo, nunca exibido ao grupo.</span>
        </p>
      )}
    </>
  )
}
