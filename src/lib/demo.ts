import { resetDb } from '../mocks/store'
import { members, trip, TRIP_ID, tripDestinationIds } from '../mocks/trip-july'

// Atalhos do roteiro de demonstração, todos sobre a "Viagem de julho" dos mocks.

const guest = members.find((member) => member.display_name === 'Eva') ?? members[0]

export const demoGuestName = guest.display_name

/** Resumo do estado inicial, para a página inicial. */
export const demoSummary = {
  tripTitle: trip.title,
  memberCount: members.length,
  destinationCount: tripDestinationIds.length,
  respondedCount: members.filter((member) => member.responded_at).length,
}

export const demoPaths = {
  tensions: `/viagens/${TRIP_ID}/tensoes`,
  plans: `/viagens/${TRIP_ID}/planos`,
  guestResponse: `/convite/${guest.invite_token}`,
  guestPlan: `/convite/${guest.invite_token}/plano`,
}

/** Volta os dados de exemplo ao início: 3 de 5 respostas e nenhum plano. */
export function resetDemo() {
  resetDb()
}
