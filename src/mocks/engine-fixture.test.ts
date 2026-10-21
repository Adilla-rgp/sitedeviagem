import { describe, expect, it } from 'vitest'
import { destinations } from './destinations'
import { engineFixture, findEngineRound, toEngineInput } from './engine-fixture'
import { constraints, members, sampleInterpretation, trip } from './trip-july'

// Os números do fixture só valem para os dados de entrada com que o motor rodou.
// Se algum destes testes falhar, os mocks e o motor divergiram: ajuste os mocks
// ou gere o fixture de novo (README desta pasta).

function interpretationOf(memberId: string) {
  return toEngineInput({ member_id: memberId, ...sampleInterpretation(memberId, 'texto de exemplo') })
}

describe('fixture do motor', () => {
  it('foi calculado com a mesma viagem', () => {
    expect(engineFixture.trip_id).toBe(trip.id)
    expect(engineFixture.trip).toEqual({
      window_start: trip.date_window_start,
      window_end: trip.date_window_end,
      nights: trip.nights,
      alpha: trip.alpha,
    })
  })

  it('foi calculado com o mesmo catálogo', () => {
    const catalog = destinations.map(({ id, climate, pace, tags, fixed_cost, nightly_cost }) => ({
      id,
      climate,
      pace,
      tags,
      fixed_cost,
      nightly_cost,
    }))
    expect([...catalog].sort((a, b) => a.id.localeCompare(b.id))).toEqual(engineFixture.destinations)
  })

  it('usa o custo de 6 noites como custo estimado do catálogo', () => {
    for (const destination of destinations) {
      expect(destination.est_cost_per_person).toBe(destination.fixed_cost + trip.nights * destination.nightly_cost)
    }
  })

  it('tem uma rodada para cada etapa da demonstração', () => {
    const saved = constraints.map(toEngineInput)
    const eva = interpretationOf('mem-eva')
    const evaLimitsOnly = { ...eva, soft: [] }
    const diego = interpretationOf('mem-diego')

    expect(findEngineRound(saved)?.name).toBe('before_eva_response')
    expect(findEngineRound([...saved, eva])?.name).toBe('after_eva_response')
    expect(findEngineRound([...saved, evaLimitsOnly])?.name).toBe('eva_limits_only')
    expect(findEngineRound([...saved, eva, diego])?.name).toBe('after_diego_response')
  })

  it('não tem cálculo para uma combinação que não foi exportada', () => {
    const eva = interpretationOf('mem-eva')
    expect(findEngineRound([...constraints.map(toEngineInput), { ...eva, hard: [] }])).toBeNull()
  })

  it('só usa participantes da viagem', () => {
    const ids = new Set(members.map((member) => member.id))
    for (const round of engineFixture.rounds) {
      for (const member of round.members) expect(ids.has(member.member_id)).toBe(true)
    }
  })

  it('nunca liga um limite de orçamento a quem o declarou', () => {
    for (const round of engineFixture.rounds) {
      const refs = [...round.excluded_destinations.flatMap((item) => item.limits), ...round.blocking_limits]
      for (const ref of refs) if (ref.kind === 'budget') expect(ref.member_id).toBeNull()
    }
  })
})
