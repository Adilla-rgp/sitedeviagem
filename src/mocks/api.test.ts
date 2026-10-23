import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '../lib/api'

// A API de demonstração segue as regras da planner-api: reação só na rodada
// mais recente, viagem fechada quando todos aceitam e recusa confirmada como
// nova versão das restrições.

let mockApi: Api
let resetDb: () => void

beforeAll(async () => {
  // store.ts lê o endereço e escuta outras abas ao carregar: sem navegador nos testes.
  vi.stubGlobal('window', { location: { search: '', origin: 'http://front.test' }, addEventListener: () => {} })
  ;({ mockApi } = await import('./api'))
  ;({ resetDb } = await import('./store'))
})

beforeEach(() => {
  vi.useFakeTimers()
  resetDb()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Cada chamada responde depois do atraso simulado. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const result = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  )
  await vi.runAllTimersAsync()
  const outcome = await result
  if (!outcome.ok) throw outcome.error
  return outcome.value
}

const TOKENS = { Ana: 'ana-7f3k', Bruno: 'bruno-2m8q', Carla: 'carla-9d4w' }

async function firstRound() {
  return settle(mockApi.generatePlans('trip-julho'))
}

describe('API de demonstração', () => {
  it('fecha a viagem quando todos que responderam aceitam o recomendado', async () => {
    const round = await firstRound()
    const planId = round.recommended_plan_id!
    const react = (token: string, verdict: 'accepted' | 'rejected', comment?: string) =>
      settle(mockApi.createReaction(planId, { invite_token: token, verdict, comment }))

    expect((await react(TOKENS.Ana, 'accepted')).trip_status).toBe('planned')
    expect((await react(TOKENS.Bruno, 'accepted')).trip_status).toBe('planned')
    const last = await react(TOKENS.Carla, 'accepted')
    expect(last.trip_status).toBe('agreed')
    expect(last.constraint_draft).toBeNull()

    await expect(react(TOKENS.Ana, 'rejected', 'Mudei de ideia.')).rejects.toMatchObject({ status: 409 })
    await expect(settle(mockApi.generatePlans('trip-julho'))).rejects.toMatchObject({ status: 409 })
  })

  it('recusa um plano de rodada anterior com 409', async () => {
    const first = await firstRound()
    await firstRound()
    await expect(
      settle(mockApi.createReaction(first.recommended_plan_id!, { invite_token: TOKENS.Ana, verdict: 'accepted' })),
    ).rejects.toMatchObject({ status: 409, message: 'Este plano é de uma rodada anterior. Veja a rodada mais recente.' })
  })

  it('devolve o rascunho da recusa e grava a restrição confirmada como nova versão', async () => {
    const round = await firstRound()
    const planId = round.recommended_plan_id!
    const rejected = await settle(
      mockApi.createReaction(planId, { invite_token: TOKENS.Carla, verdict: 'rejected', comment: 'Lençóis não.' }),
    )
    expect(rejected.constraint_draft).toEqual({ hard: [], soft: [], member_limits: [] })

    const saved = await settle(
      mockApi.confirmRejection(planId, {
        invite_token: TOKENS.Carla,
        hard: [{ id: 'h1', kind: 'exclude_destination', destination_ids: ['dest-lencois'], summary: 'Sem Lençóis Maranhenses' }],
        soft: [{ id: 's1', kind: 'prefer_destination', destination_ids: ['dest-paraty'], weight: 0.8, summary: 'Paraty' }],
      }),
    )
    expect(saved.version).toBe(2)
    expect(saved.hard.map((item) => item.id)).toEqual(['v2-h1'])
    // A preferência de destino nova substitui a anterior; as outras ficam.
    expect(saved.soft.map((item) => item.id)).toEqual(['carla-s2', 'carla-s3', 'v2-s1'])

    await expect(
      settle(mockApi.confirmRejection(planId, { invite_token: TOKENS.Ana, hard: saved.hard, soft: [] })),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('mostra ao convidado só a própria reação', async () => {
    const round = await firstRound()
    const planId = round.recommended_plan_id!
    await settle(mockApi.createReaction(planId, { invite_token: TOKENS.Ana, verdict: 'accepted' }))
    await settle(mockApi.createReaction(planId, { invite_token: TOKENS.Bruno, verdict: 'accepted' }))
    const asBruno = await settle(mockApi.getPlans('trip-julho', round.round, TOKENS.Bruno))
    expect(asBruno.reactions.map((item) => item.member_id)).toEqual(['mem-bruno'])
    const asOrganizer = await settle(mockApi.getPlans('trip-julho', round.round))
    expect(asOrganizer.reactions).toHaveLength(2)
  })

  it('devolve o mapa de tensões que o motor calculou para as respostas salvas', async () => {
    const tensions = await settle(mockApi.getTripTensions('trip-julho'))
    expect(tensions.responded_count).toBe(3)
    expect(tensions.pairs.every((pair) => pair.status === 'compatible')).toBe(true)
  })
})
