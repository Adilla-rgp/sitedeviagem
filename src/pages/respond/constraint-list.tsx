import { X } from 'lucide-react'
import { tv } from 'tailwind-variants'
import { Button } from '../../components/button'
import { formatList } from '../../lib/format'
import type { ConstraintsInput, Destination, MemberLimit } from '../../types/api'

const tag = tv({
  base: 'shrink-0 rounded-sm border px-1.5 py-[3px] font-mono text-[11px] font-medium uppercase leading-none',
  variants: {
    type: {
      limit: 'border-warn-line text-warn',
      preference: 'border-accent-line text-accent-soft',
    },
  },
})

const TAG_LABEL = {
  limit: 'Limite',
  preference: 'Preferência',
} as const

interface ConstraintListProps {
  constraints: Pick<ConstraintsInput, 'hard' | 'soft'>
  /** O que cada limite desta pessoa elimina; só a própria pessoa vê. */
  limits?: MemberLimit[]
  destinations?: Destination[]
  /** Sem esta função a lista é só de leitura. */
  onRemove?: (id: string, summary: string) => void
}

/** "Elimina Chapada Diamantina desta viagem." ou nada, se o efeito não é conhecido. */
function limitEffect(id: string, limits: MemberLimit[], destinations: Destination[]): string | null {
  const limit = limits.find((item) => item.constraint_id === id)
  if (!limit) return null
  if (limit.eliminated_destination_ids.length === 0) return 'Não elimina nenhum destino desta viagem.'
  if (limit.eliminated_destination_ids.length === destinations.length) return 'Elimina todos os destinos desta viagem.'
  const names = limit.eliminated_destination_ids.map(
    (destinationId) => destinations.find((destination) => destination.id === destinationId)?.name ?? destinationId,
  )
  return `Elimina ${formatList(names)} desta viagem.`
}

export function ConstraintList({ constraints, limits = [], destinations = [], onRemove }: ConstraintListProps) {
  const items = [
    ...constraints.hard.map((item) => ({
      id: item.id,
      summary: item.summary,
      type: 'limit' as const,
      effect: limitEffect(item.id, limits, destinations),
    })),
    ...constraints.soft.map((item) => ({ id: item.id, summary: item.summary, type: 'preference' as const, effect: null })),
  ]

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex min-h-11 items-center gap-2.5">
          <span className={tag({ type: item.type })}>{TAG_LABEL[item.type]}</span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm">{item.summary}</span>
            {item.effect && <span className="text-xs leading-normal text-ink-muted">{item.effect}</span>}
          </span>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remover: ${item.summary}`}
              onClick={() => onRemove(item.id, item.summary)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
