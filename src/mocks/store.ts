import type { Constraints, Destination, Member, Plan, PlanRoundRecord, Reaction, Trip } from '../types/api'
import { destinations } from './destinations'
import { constraints, members, trip, tripDestinationIds } from './trip-july'

// Banco em memória que src/lib/api.ts lê e altera. É salvo no localStorage para
// que uma resposta dada em /convite/:token apareça no mapa mesmo depois de
// recarregar a página ou abrir outra aba. Para voltar ao estado inicial, abra
// qualquer página com ?reset-mocks no endereço.

const STORAGE_KEY = 'mock-db:v4'
const RESET_PARAM = 'reset-mocks'

interface MockDb {
  destinations: Destination[]
  trips: Trip[]
  tripDestinations: { trip_id: string; destination_id: string }[]
  members: Member[]
  constraints: Constraints[]
  /** Uma por rodada, mesmo sem planos (rodada sem plano viável). */
  planRounds: PlanRoundRecord[]
  plans: Plan[]
  reactions: Reaction[]
}

function createSeed(): MockDb {
  return structuredClone({
    destinations,
    trips: [trip],
    tripDestinations: tripDestinationIds.map((destination_id) => ({ trip_id: trip.id, destination_id })),
    members,
    constraints,
    planRounds: [],
    plans: [],
    reactions: [],
  })
}

function load(): MockDb {
  try {
    if (new URLSearchParams(window.location.search).has(RESET_PARAM)) {
      localStorage.removeItem(STORAGE_KEY)
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as MockDb
  } catch {
    // Armazenamento indisponível (aba privada, bloqueio): segue só em memória.
  }
  return createSeed()
}

export const db: MockDb = load()

export function persistDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Idem: sem armazenamento, os dados valem até recarregar a página.
  }
}

/** Volta todos os dados ao estado inicial (3 de 5 respostas, sem planos). */
export function resetDb() {
  Object.assign(db, createSeed())
  persistDb()
}

// Outra aba (por exemplo, o convidado respondendo) alterou o banco.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return
  try {
    Object.assign(db, JSON.parse(event.newValue) as MockDb)
  } catch {
    // Valor inválido: mantém o banco atual.
  }
})

let sequence = 0

export function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${Date.now().toString(36)}${sequence}`
}
