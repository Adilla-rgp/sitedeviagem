import type { Constraints, ConstraintsInput, Member, Trip } from '../types/api'

// "Viagem de julho": o grupo usado em todas as telas. Ana organiza; Ana, Bruno e
// Carla já responderam. Eva responde pela tela do convidado (a interpretação
// abaixo é a da referência visual) e Diego ainda não respondeu.

export const TRIP_ID = 'trip-julho'

export const trip: Trip = {
  id: TRIP_ID,
  title: 'Viagem de julho',
  organizer_id: 'user-ana',
  date_window_start: '2027-07-05',
  date_window_end: '2027-07-26',
  alpha: 0.5,
  status: 'collecting',
  created_at: '2026-10-12T14:30:00Z',
}

export const tripDestinationIds = ['dest-lencois', 'dest-jericoacoara', 'dest-chapada', 'dest-paraty']

export const members: Member[] = [
  {
    id: 'mem-ana',
    trip_id: TRIP_ID,
    display_name: 'Ana',
    invite_token: 'ana-7f3k',
    is_organizer: true,
    responded_at: '2026-10-12T14:42:00Z',
  },
  {
    id: 'mem-bruno',
    trip_id: TRIP_ID,
    display_name: 'Bruno',
    invite_token: 'bruno-2m8q',
    is_organizer: false,
    responded_at: '2026-10-13T09:15:00Z',
  },
  {
    id: 'mem-carla',
    trip_id: TRIP_ID,
    display_name: 'Carla',
    invite_token: 'carla-9d4w',
    is_organizer: false,
    responded_at: '2026-10-14T21:03:00Z',
  },
  {
    id: 'mem-eva',
    trip_id: TRIP_ID,
    display_name: 'Eva',
    invite_token: 'eva-4k9x',
    is_organizer: false,
    responded_at: null,
  },
  {
    id: 'mem-diego',
    trip_id: TRIP_ID,
    display_name: 'Diego',
    invite_token: 'diego-8m2q',
    is_organizer: false,
    responded_at: null,
  },
]

export const constraints: Constraints[] = [
  {
    id: 'cons-ana-1',
    member_id: 'mem-ana',
    raw_text: 'Topo qualquer data dentro da janela. Queria muito os Lençóis, praia de preferência.',
    hard: [],
    soft: [
      {
        id: 'ana-s1',
        kind: 'prefer_destination',
        destination_ids: ['dest-lencois'],
        weight: 0.8,
        summary: 'Lençóis Maranhenses como primeira opção',
      },
      { id: 'ana-s2', kind: 'prefer_tags', tags: ['praia'], weight: 0.5, summary: 'Prefere praia' },
    ],
    confirmed_at: '2026-10-12T14:42:00Z',
    version: 1,
  },
  {
    id: 'cons-bruno-1',
    member_id: 'mem-bruno',
    raw_text: 'Só consigo de 8 a 18 de julho. Quero praia e agito, Jeri seria perfeito.',
    hard: [
      {
        id: 'bruno-h1',
        kind: 'date_range',
        start: '2027-07-08',
        end: '2027-07-18',
        summary: 'Datas entre 8 e 18 de julho',
      },
    ],
    soft: [
      {
        id: 'bruno-s1',
        kind: 'prefer_destination',
        destination_ids: ['dest-jericoacoara'],
        weight: 0.9,
        summary: 'Jericoacoara como primeira opção',
      },
      { id: 'bruno-s2', kind: 'prefer_tags', tags: ['praia'], weight: 0.6, summary: 'Prefere praia' },
      { id: 'bruno-s3', kind: 'pace', pace: 'intense', weight: 0.6, summary: 'Ritmo agitado' },
    ],
    confirmed_at: '2026-10-13T09:15:00Z',
    version: 1,
  },
  {
    id: 'cons-carla-1',
    member_id: 'mem-carla',
    raw_text: 'Prefiro serra, a Chapada seria ótima. Ritmo tranquilo, por favor.',
    hard: [],
    soft: [
      {
        id: 'carla-s1',
        kind: 'prefer_destination',
        destination_ids: ['dest-chapada'],
        weight: 0.9,
        summary: 'Chapada Diamantina como primeira opção',
      },
      { id: 'carla-s2', kind: 'prefer_tags', tags: ['serra'], weight: 0.6, summary: 'Prefere serra' },
      { id: 'carla-s3', kind: 'pace', pace: 'relaxed', weight: 0.7, summary: 'Ritmo tranquilo' },
    ],
    confirmed_at: '2026-10-14T21:03:00Z',
    version: 1,
  },
]

/** Resposta de exemplo de POST /invite/{token}/constraints/parse (referência visual). */
export function sampleInterpretation(rawText: string): ConstraintsInput {
  return {
    raw_text: rawText,
    hard: [
      {
        id: 'parsed-h1',
        kind: 'date_range',
        start: '2027-07-10',
        end: '2027-07-20',
        summary: 'Datas entre 10 e 20 de julho',
      },
      {
        id: 'parsed-h2',
        kind: 'budget',
        max_per_person: 1100,
        all_inclusive: true,
        summary: 'Até R$ 1.100 por pessoa, tudo incluso',
      },
      { id: 'parsed-h3', kind: 'exclude_climate', climates: ['cold'], summary: 'Nada de destino frio' },
    ],
    soft: [
      { id: 'parsed-s1', kind: 'pace', pace: 'relaxed', weight: 0.6, summary: 'Ritmo tranquilo, sem acordar cedo' },
    ],
  }
}
