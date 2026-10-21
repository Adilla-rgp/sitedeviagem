import { formatDateRange } from '../lib/format'
import { destinations } from './destinations'

// Resumos que a API gera a partir dos valores estruturados das restrições. Aqui
// só os que dependem de regra; os demais estão escritos nos dados de exemplo.

function destinationName(id: string): string {
  return destinations.find((destination) => destination.id === id)?.name ?? id
}

/** "Lençóis Maranhenses como primeira opção" ou "Jericoacoara, depois Paraty". */
export function destinationPreferenceSummary(destinationIds: string[]): string {
  const names = destinationIds.map(destinationName)
  if (names.length === 1) return `${names[0]} como primeira opção`
  return names.join(', depois ')
}

/** "Datas entre 12 e 15 de julho". */
export function dateRangeSummary(start: string, end: string): string {
  return `Datas entre ${formatDateRange(start, end).replace(' a ', ' e ')}`
}
