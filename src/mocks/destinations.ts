import type { Destination } from '../types/api'

const COST_SOURCE = 'Estimativa própria: passagem ida e volta e hospedagem para 6 noites, base julho de 2026'

export const destinations: Destination[] = [
  {
    id: 'dest-lencois',
    name: 'Lençóis Maranhenses',
    state: 'MA',
    climate: 'hot',
    est_cost_per_person: 1050,
    cost_source: COST_SOURCE,
    tags: ['praia', 'dunas', 'natureza'],
  },
  {
    id: 'dest-jericoacoara',
    name: 'Jericoacoara',
    state: 'CE',
    climate: 'hot',
    est_cost_per_person: 1090,
    cost_source: COST_SOURCE,
    tags: ['praia', 'vida noturna', 'esportes'],
  },
  {
    id: 'dest-chapada',
    name: 'Chapada Diamantina',
    state: 'BA',
    climate: 'cold',
    est_cost_per_person: 980,
    cost_source: COST_SOURCE,
    tags: ['serra', 'trilhas', 'cachoeiras'],
  },
  {
    id: 'dest-paraty',
    name: 'Paraty',
    state: 'RJ',
    climate: 'mild',
    est_cost_per_person: 1380,
    cost_source: COST_SOURCE,
    tags: ['praia', 'centro histórico', 'gastronomia'],
  },
]
