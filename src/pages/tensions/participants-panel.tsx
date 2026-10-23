import { CopyButton } from '../../components/copy-button'
import { formatList } from '../../lib/format'
import { inviteLinks, missingLinks } from '../../lib/invites'
import type { TripDetail } from '../../types/api'

interface ParticipantsPanelProps {
  trip: TripDetail
  respondedCount: number
}

export function ParticipantsPanel({ trip, respondedCount }: ParticipantsPanelProps) {
  const missing = missingLinks(trip.id, trip.members)

  // Cada participante tem um link próprio: copiamos todos, um por linha.
  async function buildLinksText() {
    const links = await inviteLinks(trip.id, trip.members)
    const lines = trip.members.map((member) => `${member.display_name}: ${links.get(member.id) ?? ''}`)
    return [`${trip.title}: links de convite (cada pessoa tem o próprio link)`, ...lines].join('\n')
  }

  return (
    <section aria-labelledby="participants-heading" className="flex flex-col gap-2.5">
      <h2 id="participants-heading" className="text-[13px] font-medium text-ink-muted">
        {respondedCount} de {trip.members.length} responderam
      </h2>
      <ul className="flex flex-col text-sm">
        {trip.members.map((member) => (
          <li
            key={member.id}
            className="flex justify-between gap-3 border-b border-line-subtle py-2 last:border-b-0"
          >
            <span>
              {member.display_name}
              {member.is_organizer && <span className="text-ink-muted"> · você</span>}
            </span>
            {member.responded_at ? (
              <span className="text-ink-muted">respondeu</span>
            ) : (
              <span className="text-warn">aguardando</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex flex-col gap-2">
        {missing.length > 0 && (
          <p className="text-xs leading-normal text-ink-muted">
            {missing.length === 1
              ? `O link de ${missing[0].display_name} não está guardado neste navegador.`
              : `Os links de ${formatList(missing.map((member) => member.display_name))} não estão guardados neste navegador.`}{' '}
            Ao copiar, um link novo é gerado e o anterior deixa de valer.
          </p>
        )}
        <CopyButton
          label={missing.length > 0 ? 'Gerar os links que faltam e copiar' : 'Copiar links dos convites'}
          getText={buildLinksText}
          successMessage="Links copiados. Envie a cada pessoa o link com o nome dela."
          errorMessage="Não foi possível gerar os links. Tente novamente."
        />
      </div>
    </section>
  )
}
