import type {
  BlockingLimit,
  Climate,
  Constraints,
  ExcludedDestination,
  HardConstraint,
  MemberLimit,
  Pace,
  Plan,
  SoftConstraint,
} from '../types/api'
import fixtureJson from './fixtures/july-trip.json'

// Saída do motor (planner-api) para a Viagem de julho, gerada por
// scripts/export_fixture.py e copiada para fixtures/. O front não calcula o
// motor: os planos, scores e destinos excluídos vêm daqui. Para gerar de novo,
// veja o README desta pasta.

/** Restrição como o motor recebe: sem o resumo, que é texto da API. */
type EngineItem<T> = T extends unknown ? Omit<T, 'summary'> : never

export interface EngineMemberInput {
  member_id: string
  hard: EngineItem<HardConstraint>[]
  soft: EngineItem<SoftConstraint>[]
}

/** Plano sem id, trip_id e round, que a API atribui ao criar a rodada. */
export type PlanSeed = Omit<Plan, 'id' | 'trip_id' | 'round'>

export interface EngineRound {
  name: string
  members: EngineMemberInput[]
  alpha: number
  alternatives_evaluated: number
  plans: PlanSeed[]
  excluded_destinations: ExcludedDestination[]
  blocking_limits: BlockingLimit[]
}

export interface EngineFixture {
  generated_by: string
  trip_id: string
  trip: { window_start: string; window_end: string; nights: number; alpha: number }
  destinations: {
    id: string
    climate: Climate
    pace: Pace
    tags: string[]
    fixed_cost: number
    nightly_cost: number
  }[]
  rounds: EngineRound[]
  member_limits: Record<string, MemberLimit[]>
}

// O JSON importado tem tipos largos (string em vez das uniões do contrato);
// src/mocks/engine-fixture.test.ts confere que ele bate com os mocks.
export const engineFixture = fixtureJson as unknown as EngineFixture

/** Forma comparável de uma restrição: só os valores que o motor usa, em ordem estável. */
function canonical(item: EngineItem<HardConstraint> | EngineItem<SoftConstraint>): string {
  const sorted = (values: string[]) => [...values].sort()
  switch (item.kind) {
    case 'exclude_climate':
    case 'prefer_climate':
      return JSON.stringify({ ...item, climates: sorted(item.climates) })
    case 'exclude_destination':
      return JSON.stringify({ ...item, destination_ids: sorted(item.destination_ids) })
    case 'exclude_tags':
      return JSON.stringify({ ...item, tags: sorted(item.tags) })
    default:
      return JSON.stringify(item, Object.keys(item).sort())
  }
}

function memberKey(member: EngineMemberInput): string {
  const items = [...member.hard, ...member.soft].sort((a, b) => a.id.localeCompare(b.id))
  return `${member.member_id}:${items.map(canonical).join('|')}`
}

function withoutSummary<T extends { summary: string }>(item: T): Omit<T, 'summary'> {
  const rest: Partial<T> = { ...item }
  delete rest.summary
  return rest as Omit<T, 'summary'>
}

export function toEngineInput(record: Pick<Constraints, 'member_id' | 'hard' | 'soft'>): EngineMemberInput {
  return {
    member_id: record.member_id,
    hard: record.hard.map(withoutSummary) as EngineItem<HardConstraint>[],
    soft: record.soft.map(withoutSummary) as EngineItem<SoftConstraint>[],
  }
}

/**
 * A rodada do fixture calculada exatamente com estas respostas, ou nulo se a
 * combinação não foi exportada (por exemplo, uma resposta editada à mão).
 */
export function findEngineRound(responses: EngineMemberInput[]): EngineRound | null {
  const key = responses.map(memberKey).sort().join('\n')
  return engineFixture.rounds.find((round) => round.members.map(memberKey).sort().join('\n') === key) ?? null
}

/** O que cada um destes limites elimina, pelos ids das restrições. */
export function memberLimitsFor(constraintIds: string[]): MemberLimit[] {
  const all = Object.values(engineFixture.member_limits).flat()
  return constraintIds.flatMap((id) => all.filter((item) => item.constraint_id === id))
}
