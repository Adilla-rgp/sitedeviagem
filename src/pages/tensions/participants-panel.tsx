import { CopyButton } from '../../components/copy-button'
import { inviteUrl } from '../../lib/links'
import type { TripDetail } from '../../types/api'

interface ParticipantsPanelProps {
  trip: TripDetail
  respondedCount: number
}

export function ParticipantsPanel({ trip, respondedCount }: ParticipantsPanelProps) {
  // Cada participante tem um link próprio: copiamos todos, um por linha.
  function buildLinksText() {
    const lines = trip.members.map((member) => `${member.display_name}: ${inviteUrl(member.invite_token)}`)
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
      <div className="mt-2.5">
        <CopyButton
          label="Copiar links dos convites"
          getText={buildLinksText}
          successMessage="Links copiados. Envie a cada pessoa o link com o nome dela."
        />
      </div>
    </section>
  )
}
