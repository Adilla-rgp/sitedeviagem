import { describe, expect, it } from 'vitest'
import { balanceScore, rankPlans, summarizeScores, toPercent } from './scoring'

const scores = (...values: number[]) => values.map((score, index) => ({ member_id: `m${index}`, score }))

// Satisfações da rodada 1 da referência visual (Ana, Bruno, Carla, Eva).
const plans = [
  { id: 'lencois', per_member_scores: scores(0.84, 0.8, 0.62, 0.82) },
  { id: 'jericoacoara', per_member_scores: scores(0.88, 0.94, 0.5, 0.78) },
  { id: 'lencois-curto', per_member_scores: scores(0.7, 0.66, 0.66, 0.86) },
]

describe('balanceScore', () => {
  it('com α = 0 é a média', () => {
    expect(balanceScore([0.2, 0.4, 0.9], 0)).toBeCloseTo(0.5)
  })

  it('com α = 1 é a pior satisfação', () => {
    expect(balanceScore([0.2, 0.4, 0.9], 1)).toBeCloseTo(0.2)
  })

  it('com α = 0,5 combina média e pior em partes iguais', () => {
    expect(balanceScore([0.84, 0.8, 0.62, 0.82], 0.5)).toBeCloseTo(0.695)
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
  it('aponta média, pior e quem sai pior', () => {
    const summary = summarizeScores(plans[1].per_member_scores, 0.5)
    expect(summary.mean).toBeCloseTo(0.775)
    expect(summary.worst).toBe(0.5)
    expect(summary.worstMemberId).toBe('m2')
    expect(summary.score).toBeCloseTo(0.6375)
  })
})

describe('rankPlans', () => {
  const order = (alpha: number) => rankPlans(plans, alpha).map((plan) => plan.id)

  it('α = 0 favorece a maior média (Jericoacoara)', () => {
    expect(order(0)).toEqual(['jericoacoara', 'lencois', 'lencois-curto'])
  })

  it('α = 0,5 recomenda Lençóis, como o motor', () => {
    expect(order(0.5)).toEqual(['lencois', 'lencois-curto', 'jericoacoara'])
  })

  it('α = 1 protege quem sai pior (roteiro curto)', () => {
    expect(order(1)).toEqual(['lencois-curto', 'lencois', 'jericoacoara'])
  })

  it('não altera a lista recebida', () => {
    rankPlans(plans, 1)
    expect(plans.map((plan) => plan.id)).toEqual(['lencois', 'jericoacoara', 'lencois-curto'])
  })
})

describe('toPercent', () => {
  it('arredonda para 0 a 100', () => {
    expect(toPercent(0.695)).toBe(70)
    expect(toPercent(0.6375)).toBe(64)
  })
})
