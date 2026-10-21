import type { MemberExplanation, MemberScore } from '../types/api'

// Resposta do motor para a rodada 1 da "Viagem de julho", com as satisfações
// da referência visual (docs/design/plano.html). O front não calcula o motor:
// estes números, inclusive o score com α = 0,5, são dados prontos da API.
//
// As justificativas da Eva não citam o valor do orçamento: a tela Responder
// promete que ele nunca é exibido ao grupo.

export const ENGINE_ALPHA = 0.5

export interface PlanSeed {
  destination_id: string
  variant_label: string | null
  start_date: string
  end_date: string
  est_cost_per_person: number
  score: number
  per_member_scores: MemberScore[]
  explanation: MemberExplanation[]
}

export const roundOnePlans: PlanSeed[] = [
  {
    destination_id: 'dest-lencois',
    variant_label: null,
    start_date: '2027-07-12',
    end_date: '2027-07-18',
    est_cost_per_person: 1050,
    score: 0.695,
    per_member_scores: [
      { member_id: 'mem-ana', score: 0.84 },
      { member_id: 'mem-bruno', score: 0.8 },
      { member_id: 'mem-carla', score: 0.62 },
      { member_id: 'mem-eva', score: 0.82 },
    ],
    explanation: [
      { member_id: 'mem-ana', text: 'Ganhou o destino que indicou primeiro.' },
      { member_id: 'mem-bruno', text: 'Ganhou praia e as datas que pediu.' },
      { member_id: 'mem-carla', text: 'Cedeu na serra; em troca, ritmo tranquilo garantido.' },
      { member_id: 'mem-eva', text: 'Dentro do orçamento, com pouca folga.' },
    ],
  },
  {
    destination_id: 'dest-jericoacoara',
    variant_label: null,
    start_date: '2027-07-10',
    end_date: '2027-07-16',
    est_cost_per_person: 1090,
    score: 0.6375,
    per_member_scores: [
      { member_id: 'mem-ana', score: 0.88 },
      { member_id: 'mem-bruno', score: 0.94 },
      { member_id: 'mem-carla', score: 0.5 },
      { member_id: 'mem-eva', score: 0.78 },
    ],
    explanation: [
      { member_id: 'mem-ana', text: 'Ganhou praia; cedeu um pouco no ritmo.' },
      { member_id: 'mem-bruno', text: 'Ganhou o destino favorito e o ritmo agitado.' },
      { member_id: 'mem-carla', text: 'Cedeu na serra e no ritmo tranquilo.' },
      { member_id: 'mem-eva', text: 'Dentro do orçamento, mas no limite.' },
    ],
  },
  {
    destination_id: 'dest-lencois',
    variant_label: 'roteiro curto',
    start_date: '2027-07-14',
    end_date: '2027-07-18',
    est_cost_per_person: 820,
    score: 0.69,
    per_member_scores: [
      { member_id: 'mem-ana', score: 0.7 },
      { member_id: 'mem-bruno', score: 0.66 },
      { member_id: 'mem-carla', score: 0.66 },
      { member_id: 'mem-eva', score: 0.86 },
    ],
    explanation: [
      { member_id: 'mem-ana', text: 'Cedeu 2 dias de viagem.' },
      { member_id: 'mem-bruno', text: 'Cedeu 2 dias e as datas que queria.' },
      { member_id: 'mem-carla', text: 'Cedeu na serra; roteiro curto e tranquilo.' },
      { member_id: 'mem-eva', text: 'Sobra folga no orçamento.' },
    ],
  },
]
