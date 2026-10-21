import { describe, expect, it } from 'vitest'
import { engineFixture } from '../mocks/engine-fixture'
import type { MemberScore } from '../types/api'
import { balanceScore, countedScores, rankPlans, summarizeScores, toPercent } from './scoring'

const scores = (...values: number[]): MemberScore[] =>
  values.map((score, index) => ({ member_id: `m${index}`, score, has_preferences: true, best_possible: 1 }))

const round = (name: string) => {
  const found = engineFixture.rounds.find((item) => item.name === name)
  if (!found) throw new Error(`Rodada ${name} não está no fixture`)
  return found
}

// Planos da rodada recomendada da demonstração, com ids para conferir a ordem.
const planNames = ['lencois', 'lencois-curto', 'paraty-curto']
const plans = round('after_eva_response').plans.map((plan, index) => ({ ...plan, id: planNames[index] }))

describe('balanceScore', () => {
  it('com α = 0 é a média', () => {
    expect(balanceScore([0.2, 0.4, 0.9], 0)).toBeCloseTo(0.5)
  })

  it('com α = 1 é a pior satisfação', () => {
    expect(balanceScore([0.2, 0.4, 0.9], 1)).toBeCloseTo(0.2)
  })

  it('sem participantes devolve 0', () => {
    expect(balanceScore([], 0.5)).toBe(0)
  })

  it('recusa α fora de 0 a 1', () => {
    expect(() => balanceScore([0.5], -0.1)).toThrow(RangeError)
    expect(() => balanceScore([0.5], 1.1)).toThrow(RangeError)
  })
})

describe('summarizeScores', () => {
  it('reproduz o score do motor em todos os planos do fixture', () => {
    for (const engineRound of engineFixture.rounds) {
      for (const plan of engineRound.plans) {
        expect(summarizeScores(plan.per_member_scores, plan.alpha).score).toBeCloseTo(plan.score, 3)
      }
    }
  })

  it('aponta média, pior e quem sai pior (Lençóis, com Eva)', () => {
    const summary = summarizeScores(plans[0].per_member_scores, 0.5)
    expect(summary.mean).toBeCloseTo(0.6908, 4)
    expect(summary.worst).toBe(0.4571)
    expect(summary.worstMemberIds).toEqual(['mem-bruno'])
  })

  it('lista todos os empatados com a pior satisfação', () => {
    const summary = summarizeScores(scores(0.66, 0.5, 0.5), 0.5)
    expect(summary.worstMemberIds).toEqual(['m1', 'm2'])
  })

  it('ignora quem não declarou preferências na média, no mínimo e no destaque', () => {
    const withoutPreferences = [...scores(0.8, 0.6), { ...scores(0.1)[0], member_id: 'sem', has_preferences: false }]
    const summary = summarizeScores(withoutPreferences, 0.5)
    expect(summary.mean).toBeCloseTo(0.7)
    expect(summary.worst).toBe(0.6)
    expect(summary.worstMemberIds).toEqual(['m1'])
  })

  it('no fixture, Eva sem preferências não conta (rodada eva_limits_only)', () => {
    const plan = round('eva_limits_only').plans[0]
    expect(countedScores(plan.per_member_scores).map((item) => item.member_id)).not.toContain('mem-eva')
    expect(summarizeScores(plan.per_member_scores, plan.alpha).worstMemberIds).toEqual(['mem-bruno'])
  })

  it('sem ninguém com preferências não aponta ninguém', () => {
    const nobody = scores(0.5, 0.5).map((item) => ({ ...item, has_preferences: false }))
    expect(summarizeScores(nobody, 0.5)).toEqual({ mean: 0, worst: 0, worstMemberIds: [], score: 0 })
  })
})

describe('rankPlans', () => {
  const order = (alpha: number) => rankPlans(plans, alpha).map((plan) => plan.id)

  it('α = 0,5 mantém a ordem do motor', () => {
    expect(order(0.5)).toEqual(['lencois', 'lencois-curto', 'paraty-curto'])
  })

  it('α = 1 protege quem sai pior', () => {
    // Pior satisfação: Lençóis 0,4571 (Bruno), curto 0,4114 (Bruno), Paraty curto 0,4336 (Carla).
    expect(order(1)).toEqual(['lencois', 'paraty-curto', 'lencois-curto'])
  })

  it('não altera a lista recebida', () => {
    rankPlans(plans, 1)
    expect(plans.map((plan) => plan.id)).toEqual(['lencois', 'lencois-curto', 'paraty-curto'])
  })
})

describe('toPercent', () => {
  it('arredonda para 0 a 100', () => {
    expect(toPercent(0.574)).toBe(57)
    expect(toPercent(0.4571)).toBe(46)
  })
})
