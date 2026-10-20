import type { Constraints, Destination, Member, Plan, Reaction, Trip } from '../types/api'
import { destinations } from './destinations'
import { constraints, members, trip, tripDestinationIds } from './trip-july'

// Banco em memória que src/lib/api.ts lê e altera. Volta ao estado inicial a
// cada recarga da página.

interface MockDb {
  destinations: Destination[]
  trips: Trip[]
  tripDestinations: { trip_id: string; destination_id: string }[]
  members: Member[]
  constraints: Constraints[]
  plans: Plan[]
  reactions: Reaction[]
}

export const db: MockDb = structuredClone({
  destinations,
  trips: [trip],
  tripDestinations: tripDestinationIds.map((destination_id) => ({ trip_id: trip.id, destination_id })),
  members,
  constraints,
  plans: [],
  reactions: [],
})

let sequence = 0

export function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${Date.now().toString(36)}${sequence}`
}
