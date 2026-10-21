import { describe, expect, it } from 'vitest'
import type { Constraints } from '../types/api'
import { destinations } from './destinations'
import { computeTensions } from './tensions'
import { constraints, members, sampleInterpretation, trip } from './trip-july'

function constraintsFor(memberId: string, change?: (record: Constraints) => Constraints): Constraints {
  const record: Constraints = {
    ...sampleInterpretation(memberId, 'texto de exemplo'),
    id: `cons-${memberId}`,
    member_id: memberId,
    confirmed_at: '2026-10-20T10:00:00Z',
    version: 1,
  }
  return change ? change(record) : record
}

function tensionsWith(extra: Constraints[]) {
  const respondedIds = new Set([...constraints, ...extra].map((item) => item.member_id))
  return computeTensions({
    trip,
    members: members.map((member) => ({
      ...member,
      responded_at: respondedIds.has(member.id) ? '2026-10-20T10:00:00Z' : null,
    })),
    destinations,
    constraints: [...constraints, ...extra],
  })
}

/** Eva com orçamento de R$ 1.000: Paraty não cabe nem no roteiro curto (R$ 1.080). */
const tightEva = constraintsFor('mem-eva', (record) => ({
  ...record,
  hard: record.hard.map((item) => (item.kind === 'budget' ? { ...item, max_per_person: 1000 } : item)),
}))

describe('mapa de tensões', () => {
  it('nunca liga duas pessoas por orçamento', () => {
    for (const tensions of [tensionsWith([constraintsFor('mem-eva')]), tensionsWith([tightEva])]) {
      expect(tensions.pairs.map((pair) => pair.criterion)).not.toContain('budget')
    }
  })

  it('mostra o que um orçamento elimina sem dizer de quem é', () => {
    const { key_constraints: items } = tensionsWith([tightEva])
    const budget = items.filter((item) => item.summary.includes('orçamento'))
    expect(budget).toEqual([{ id: 'budget:dest-paraty', summary: 'O orçamento de um participante elimina Paraty.' }])
    for (const item of items) expect(item.id).not.toContain('eva-h2')
  })

  it('compara o orçamento com o roteiro mais barato, como o motor', () => {
    // R$ 1.100 não cobre Paraty com 6 noites (R$ 1.380), mas cobre o roteiro curto (R$ 1.080).
    const { key_constraints: items, viability } = tensionsWith([constraintsFor('mem-eva')])
    expect(items.some((item) => item.summary.includes('orçamento'))).toBe(false)
    expect(viability.find((item) => item.destination_id === 'dest-paraty')?.accepted_count).toBe(4)
  })

  it('mantém o nome em limites que não são de orçamento', () => {
    const { key_constraints: items, pairs } = tensionsWith([constraintsFor('mem-eva')])
    expect(items.map((item) => item.summary)).toContain(
      'O limite de clima de Eva elimina Chapada Diamantina, que Carla prefere.',
    )
    expect(pairs).toContainEqual({
      member_a_id: 'mem-carla',
      member_b_id: 'mem-eva',
      status: 'conflict',
      criterion: 'climate',
    })
  })

  it('um limite de datas que não comporta nem o roteiro curto elimina todos os destinos', () => {
    const { viability } = tensionsWith([constraintsFor('mem-eva'), constraintsFor('mem-diego')])
    for (const item of viability) expect(item.accepted_count).toBeLessThan(item.responded_count)
  })
})
