import { formatDateRange } from '../lib/format'
import type {
  Constraints,
  Destination,
  DestinationViability,
  HardConstraint,
  KeyConstraint,
  Member,
  MemberPair,
  SoftConstraint,
  TensionCriterion,
  Trip,
  TripTensions,
} from '../types/api'

// Cálculo do mapa de tensões a partir das restrições salvas. Funções puras,
// sem acesso ao banco: vão para o back junto com o motor.
//
// Orçamento é confidencial: ele nunca vira aresta entre duas pessoas, porque a
// aresta identificaria quem tem o limite. O que um orçamento elimina aparece em
// key_constraints, sem nome ("O orçamento de um participante elimina Paraty.").

/** Menos dias em comum que isso entre dois limites de data é conflito. */
const MIN_COMMON_DAYS = 4
/** Só preferências de ritmo fortes (peso a partir disso) geram conflito. */
const STRONG_PREFERENCE_WEIGHT = 0.8
/** Mínimo de limites para alguém ser destacado como quem tem "mais limites". */
const MIN_LIMITS_FOR_MOST_RESTRICTIVE = 2
/** Ordem de prioridade quando um par conflita em mais de um critério. */
const CRITERION_PRIORITY: TensionCriterion[] = ['dates', 'climate', 'pace']
/** Noites a menos do roteiro curto, que o motor também testa (planner-api/docs/motor.md). */
const SHORT_VARIANT_NIGHTS_LESS = 2
const MIN_NIGHTS = 2
const DAY_MS = 24 * 60 * 60 * 1000

interface TensionsInput {
  trip: Trip
  members: Member[]
  destinations: Destination[]
  /** Versão mais recente das restrições de cada participante que respondeu. */
  constraints: Constraints[]
}

interface Respondent {
  member: Member
  hard: HardConstraint[]
  soft: SoftConstraint[]
}

export function computeTensions({ trip, members, destinations, constraints }: TensionsInput): TripTensions {
  const respondents = members.flatMap<Respondent>((member) => {
    const record = constraints.find((item) => item.member_id === member.id)
    return member.responded_at && record ? [{ member, hard: record.hard, soft: record.soft }] : []
  })

  return {
    trip_id: trip.id,
    member_count: members.length,
    responded_count: respondents.length,
    most_restrictive_member_id: findMostRestrictive(respondents),
    pairs: buildPairs(trip, respondents, destinations),
    key_constraints: buildKeyConstraints(trip, respondents, destinations),
    viability: destinations.map<DestinationViability>((destination) => ({
      destination_id: destination.id,
      accepted_count: respondents.filter((person) => !eliminatesDestination(trip, person.hard, destination)).length,
      responded_count: respondents.length,
    })),
  }
}

/** Noites do roteiro mais curto que o motor testa. */
function shortestNights(trip: Trip): number {
  const short = trip.nights - SHORT_VARIANT_NIGHTS_LESS
  return short >= MIN_NIGHTS ? short : trip.nights
}

/**
 * O limite elimina o destino quando nenhum roteiro dele o respeita, como no
 * motor: o orçamento é comparado com o roteiro mais barato (o curto), e um
 * limite de datas que não comporta nem o roteiro curto elimina todos.
 */
function eliminates(trip: Trip, constraint: HardConstraint, destination: Destination): boolean {
  switch (constraint.kind) {
    case 'budget':
      return destination.fixed_cost + shortestNights(trip) * destination.nightly_cost > constraint.max_per_person
    case 'exclude_climate':
      return constraint.climates.includes(destination.climate)
    case 'exclude_destination':
      return constraint.destination_ids.includes(destination.id)
    case 'date_range': {
      const start = Math.max(toTime(constraint.start), toTime(trip.date_window_start))
      const end = Math.min(toTime(constraint.end), toTime(trip.date_window_end))
      return (end - start) / DAY_MS < shortestNights(trip)
    }
  }
}

function eliminatesDestination(trip: Trip, hard: HardConstraint[], destination: Destination): boolean {
  return hard.some((constraint) => eliminates(trip, constraint, destination))
}

function preferredDestinationIds(soft: SoftConstraint[]): string[] {
  return soft.flatMap((item) => (item.kind === 'prefer_destination' ? item.destination_ids : []))
}

function toTime(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function toIsoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

function dateRanges(hard: HardConstraint[]) {
  return hard.flatMap((item) => (item.kind === 'date_range' ? [{ start: toTime(item.start), end: toTime(item.end) }] : []))
}

function conflictCriteria(trip: Trip, a: Respondent, b: Respondent, destinations: Destination[]): TensionCriterion[] {
  const criteria = new Set<TensionCriterion>()

  for (const rangeA of dateRanges(a.hard)) {
    for (const rangeB of dateRanges(b.hard)) {
      const commonDays = (Math.min(rangeA.end, rangeB.end) - Math.max(rangeA.start, rangeB.start)) / DAY_MS + 1
      if (commonDays < MIN_COMMON_DAYS) criteria.add('dates')
    }
  }

  // O limite de clima de um elimina um destino que o outro prefere. Orçamento
  // não entra: a aresta diria de quem é o limite.
  for (const [limited, other] of [
    [a, b],
    [b, a],
  ]) {
    const preferred = destinations.filter((destination) => preferredDestinationIds(other.soft).includes(destination.id))
    for (const constraint of limited.hard) {
      if (constraint.kind !== 'exclude_climate') continue
      if (preferred.some((destination) => eliminates(trip, constraint, destination))) criteria.add('climate')
    }
  }

  const strongPaces = (person: Respondent) =>
    person.soft.flatMap((item) => (item.kind === 'pace' && item.weight >= STRONG_PREFERENCE_WEIGHT ? [item.pace] : []))
  const pacesA = strongPaces(a)
  const pacesB = strongPaces(b)
  if (
    (pacesA.includes('relaxed') && pacesB.includes('intense')) ||
    (pacesA.includes('intense') && pacesB.includes('relaxed'))
  ) {
    criteria.add('pace')
  }

  return CRITERION_PRIORITY.filter((criterion) => criteria.has(criterion))
}

function buildPairs(trip: Trip, respondents: Respondent[], destinations: Destination[]): MemberPair[] {
  const pairs: MemberPair[] = []
  respondents.forEach((a, index) => {
    for (const b of respondents.slice(index + 1)) {
      const [criterion] = conflictCriteria(trip, a, b, destinations)
      pairs.push({
        member_a_id: a.member.id,
        member_b_id: b.member.id,
        status: criterion ? 'conflict' : 'compatible',
        criterion: criterion ?? null,
      })
    }
  })
  return pairs
}

/** Quem tem pelo menos 2 limites e estritamente mais que todos os outros. */
function findMostRestrictive(respondents: Respondent[]): string | null {
  const counts = respondents.map((person) => person.hard.length)
  const max = Math.max(0, ...counts)
  if (max < MIN_LIMITS_FOR_MOST_RESTRICTIVE || counts.filter((count) => count === max).length > 1) return null
  return respondents[counts.indexOf(max)].member.id
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

const LIMIT_LABEL: Partial<Record<HardConstraint['kind'], string>> = {
  exclude_climate: 'O limite de clima',
  exclude_destination: 'O veto',
}

function buildKeyConstraints(trip: Trip, respondents: Respondent[], destinations: Destination[]): KeyConstraint[] {
  const items: KeyConstraint[] = []

  // Orçamento sem nome e sem dizer quem prefere o destino eliminado. Orçamentos
  // que eliminam os mesmos destinos viram um item só.
  for (const person of respondents) {
    for (const constraint of person.hard) {
      if (constraint.kind !== 'budget') continue
      const eliminated = destinations.filter((destination) => eliminates(trip, constraint, destination))
      if (eliminated.length === 0) continue
      const id = `budget:${eliminated.map((item) => item.id).join(',')}`
      if (items.some((item) => item.id === id)) continue
      items.push({ id, summary: `O orçamento de um participante elimina ${joinNames(eliminated.map((item) => item.name))}.` })
    }
  }

  for (const person of respondents) {
    for (const constraint of person.hard) {
      const label = LIMIT_LABEL[constraint.kind]
      const eliminated = destinations.filter((destination) => eliminates(trip, constraint, destination))
      if (!label || eliminated.length === 0) continue

      let summary = `${label} de ${person.member.display_name} elimina ${joinNames(eliminated.map((item) => item.name))}`
      if (eliminated.length === 1) {
        const fans = respondents.filter(
          (other) => other !== person && preferredDestinationIds(other.soft).includes(eliminated[0].id),
        )
        if (fans.length > 0) {
          summary += `, que ${joinNames(fans.map((fan) => fan.member.display_name))} ${fans.length === 1 ? 'prefere' : 'preferem'}`
        }
      }
      items.push({ id: `${person.member.id}:${constraint.id}`, summary: `${summary}.` })
    }
  }

  // Janela comum: interseção da janela da viagem com todos os limites de data.
  const ranges = respondents.flatMap((person) => dateRanges(person.hard))
  if (ranges.length > 0) {
    const start = Math.max(toTime(trip.date_window_start), ...ranges.map((range) => range.start))
    const end = Math.min(toTime(trip.date_window_end), ...ranges.map((range) => range.end))
    items.push({
      id: 'common-dates',
      summary:
        start > end
          ? 'Não há datas em comum entre todas as respostas.'
          : `A janela comum de datas é de ${formatDateRange(toIsoDate(start), toIsoDate(end))}.`,
    })
  }

  return items
}
