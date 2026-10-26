import { describe, expect, it } from 'vitest'
import { engineFixture } from './engine-fixture'
import { tensionsFixture } from './tensions-fixture'
import { members, TRIP_ID, tripDestinationIds } from './trip-july'

// O mapa de tensões da demonstração vem do motor (scripts/export_fixture.py da planner-api).
// Estes testes conferem que ele usa o mesmo grupo dos mocks e do fixture do motor.

const memberIds = members.map((member) => member.id)

describe('fixture de tensões', () => {
  it('tem uma etapa para cada rodada do motor', () => {
    expect(Object.keys(tensionsFixture.rounds).sort()).toEqual(engineFixture.rounds.map((round) => round.name).sort())
  })

  it.each(engineFixture.rounds.map((round) => [round.name, round] as const))('%s usa o mesmo grupo', (name, round) => {
    const tensions = tensionsFixture.rounds[name]
    expect(tensions.trip_id).toBe(TRIP_ID)
    expect(tensions.responded_count).toBe(round.members.length)
    expect(tensions.member_count).toBe(members.length)
    expect(tensions.viability.map((item) => item.destination_id).sort()).toEqual([...tripDestinationIds].sort())
    const cited = tensions.pairs.flatMap((pair) => [pair.member_a_id, pair.member_b_id])
    expect(cited.every((id) => memberIds.includes(id))).toBe(true)
    if (tensions.most_restrictive_member_id) expect(memberIds).toContain(tensions.most_restrictive_member_id)
  })

  it('nunca mostra o valor do orçamento', () => {
    expect(JSON.stringify(tensionsFixture)).not.toMatch(/1\.?100|R\$/)
  })
})
