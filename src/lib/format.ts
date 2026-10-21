import type { IsoDate } from '../types/api'

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

// Lê AAAA-MM-DD como data local, sem o deslocamento de fuso de new Date(iso).
function parseIsoDate(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDay(date: Date): string {
  return date.getDate() === 1 ? '1º' : String(date.getDate())
}

/** "5 a 26 de julho" ou "28 de junho a 3 de julho". */
export function formatDateRange(start: IsoDate, end: IsoDate): string {
  const startDate = parseIsoDate(start)
  const endDate = parseIsoDate(end)
  const endMonth = monthFormatter.format(endDate)

  if (startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()) {
    return `${formatDay(startDate)} a ${formatDay(endDate)} de ${endMonth}`
  }
  return `${formatDay(startDate)} de ${monthFormatter.format(startDate)} a ${formatDay(endDate)} de ${endMonth}`
}

/** "1 pessoa", "5 pessoas". */
export function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
