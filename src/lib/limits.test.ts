import { describe, expect, it } from 'vitest'
import { engineFixture } from '../mocks/engine-fixture'
import { members } from '../mocks/trip-july'
import { blockingSentence, exclusionReason, limitSubject, unblockSuggestions } from './limits'

const round = (name: string) => engineFixture.rounds.find((item) => item.name === name)!

describe('limitSubject', () => {
  it('nunca diz de quem é o orçamento', () => {
    expect(limitSubject({ member_id: null, kind: 'budget' }, members).text).toBe('o orçamento de um participante')
  })

  it('usa o nome sem artigo nos outros limites', () => {
    expect(limitSubject({ member_id: 'mem-eva', kind: 'exclude_climate' }, members).text).toBe(
      'o limite de clima de Eva',
    )
    expect(limitSubject({ member_id: 'mem-bruno', kind: 'date_range' }, members)).toEqual({
      text: 'as datas de Bruno',
      plural: true,
    })
  })
})

describe('exclusionReason', () => {
  const [chapada, jericoacoara] = round('after_eva_response').excluded_destinations

  it('explica o destino eliminado por limite', () => {
    expect(exclusionReason(chapada, members, 0.574)).toBe(
      'Fica de fora porque o limite de clima de Eva elimina este destino.',
    )
  })

  it('explica o destino viável com score menor', () => {
    expect(exclusionReason(jericoacoara, members, 0.574)).toBe(
      'Respeita os limites de todos, mas equilibra pior o grupo: score 34, contra 57 do plano recomendado.',
    )
  })

  it('concorda o verbo com mais de um limite', () => {
    const [chapadaWithDiego] = round('after_diego_response').excluded_destinations
    expect(exclusionReason(chapadaWithDiego, members, null)).toBe(
      'Fica de fora porque as datas de Diego e o limite de clima de Eva eliminam este destino.',
    )
  })
})

describe('rodada sem plano viável', () => {
  const infeasible = round('after_diego_response')

  it('descreve cada limite que bloqueia, com o orçamento sem nome', () => {
    const sentences = infeasible.blocking_limits.map((item) =>
      blockingSentence(item, members, infeasible.alternatives_evaluated),
    )
    expect(sentences[0]).toBe('As datas de Diego eliminam todas as 136 alternativas.')
    expect(sentences).toContain('O orçamento de um participante elimina 16 de 136 alternativas.')
  })

  it('sugere reduzir as noites quando as datas bloqueiam', () => {
    expect(unblockSuggestions(infeasible.blocking_limits, 6)[0]).toContain('Reduzir as noites da viagem (hoje, 6)')
  })
})
