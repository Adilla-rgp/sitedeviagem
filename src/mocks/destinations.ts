import type { Destination } from '../types/api'

// est_cost_per_person é o custo com as 6 noites da Viagem de julho:
// fixed_cost + 6 × nightly_cost. Os valores são os do motor (fixtures/july-trip.json).
const COST_SOURCE = 'Estimativa própria: passagem ida e volta e hospedagem por noite, base julho de 2026'

export const destinations: Destination[] = [
  {
    id: 'dest-lencois',
    name: 'Lençóis Maranhenses',
    state: 'MA',
    climate: 'hot',
    pace: 'relaxed',
    fixed_cost: 360,
    nightly_cost: 115,
    est_cost_per_person: 1050,
    cost_source: COST_SOURCE,
    tags: ['praia', 'dunas', 'natureza'],
  },
  {
    id: 'dest-jericoacoara',
    name: 'Jericoacoara',
    state: 'CE',
    climate: 'hot',
    pace: 'intense',
    fixed_cost: 370,
    nightly_cost: 120,
    est_cost_per_person: 1090,
    cost_source: COST_SOURCE,
    tags: ['praia', 'vida noturna', 'esportes'],
  },
  {
    id: 'dest-chapada',
    name: 'Chapada Diamantina',
    state: 'BA',
    climate: 'cold',
    pace: 'balanced',
    fixed_cost: 320,
    nightly_cost: 110,
    est_cost_per_person: 980,
    cost_source: COST_SOURCE,
    tags: ['serra', 'trilhas', 'cachoeiras'],
  },
  {
    id: 'dest-paraty',
    name: 'Paraty',
    state: 'RJ',
    climate: 'mild',
    pace: 'relaxed',
    fixed_cost: 480,
    nightly_cost: 150,
    est_cost_per_person: 1380,
    cost_source: COST_SOURCE,
    tags: ['praia', 'centro histórico', 'gastronomia'],
  },
]
