import { describe, expect, it } from 'vitest'
import { dateRangeSummary, destinationPreferenceSummary } from './summaries'

describe('destinationPreferenceSummary', () => {
  it('diz a ordem dos destinos preferidos', () => {
    expect(destinationPreferenceSummary(['dest-jericoacoara', 'dest-paraty'])).toBe('Jericoacoara, depois Paraty')
    expect(destinationPreferenceSummary(['dest-paraty', 'dest-lencois', 'dest-jericoacoara'])).toBe(
      'Paraty, depois Lençóis Maranhenses, depois Jericoacoara',
    )
  })

  it('com um destino, diz que é a primeira opção', () => {
    expect(destinationPreferenceSummary(['dest-chapada'])).toBe('Chapada Diamantina como primeira opção')
  })
})

describe('dateRangeSummary', () => {
  it('usa o intervalo por extenso', () => {
    expect(dateRangeSummary('2027-07-12', '2027-07-15')).toBe('Datas entre 12 e 15 de julho')
  })
})
