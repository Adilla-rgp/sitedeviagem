import type {
  Constraints,
  ConstraintsInput,
  CreateMembersInput,
  CreateReactionInput,
  CreateTripInput,
  Destination,
  Invite,
  Member,
  Plan,
  PlanRound,
  Reaction,
  Trip,
  TripDetail,
  TripTensions,
} from '../types/api'
import { db, nextId, persistDb } from '../mocks/store'
import { ENGINE_ALPHA, roundOnePlans } from '../mocks/plans'
import { computeTensions } from '../mocks/tensions'
import { sampleInterpretation } from '../mocks/trip-july'

// Única porta de entrada de dados do front. Cada função espelha uma rota do
// contrato (docs/especificacao.md). Hoje responde com os mocks de src/mocks/
// após um atraso simulado; quando a API existir, só este arquivo muda.

const MOCK_LATENCY_MS = 700
const MIN_RAW_TEXT_LENGTH = 10
const MIN_REACTION_COMMENT_LENGTH = 3

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Mensagem pronta para a interface: a da API quando houver, senão a genérica. */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function respond<T>(handler: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = handler()
        persistDb()
        // Cópia para que a tela nunca altere o banco em memória por referência.
        resolve(structuredClone(result))
      } catch (error) {
        reject(error)
      }
    }, MOCK_LATENCY_MS)
  })
}

function now(): string {
  return new Date().toISOString()
}

function findTrip(tripId: string): Trip {
  const trip = db.trips.find((item) => item.id === tripId)
  if (!trip) throw new ApiError(404, 'Viagem não encontrada.')
  return trip
}

function findMemberByToken(token: string): Member {
  const member = db.members.find((item) => item.invite_token === token)
  if (!member) throw new ApiError(404, 'Convite não encontrado.')
  return member
}

function tripDestinations(tripId: string): Destination[] {
  const ids = db.tripDestinations.filter((item) => item.trip_id === tripId).map((item) => item.destination_id)
  return db.destinations.filter((destination) => ids.includes(destination.id))
}

function latestConstraints(memberId: string): Constraints | null {
  const versions = db.constraints.filter((item) => item.member_id === memberId)
  if (versions.length === 0) return null
  return versions.reduce((latest, item) => (item.version > latest.version ? item : latest))
}

function latestRound(tripId: string): number | null {
  const rounds = db.plans.filter((plan) => plan.trip_id === tripId).map((plan) => plan.round)
  return rounds.length > 0 ? Math.max(...rounds) : null
}

function buildRound(tripId: string, round: number): PlanRound {
  findTrip(tripId)
  const plans = db.plans
    .filter((plan) => plan.trip_id === tripId && plan.round === round)
    .sort((a, b) => b.score - a.score)
  if (plans.length === 0) throw new ApiError(404, 'Rodada não encontrada.')
  const planIds = plans.map((plan) => plan.id)
  return {
    trip_id: tripId,
    round,
    plans,
    recommended_plan_id: plans[0].id,
    reactions: db.reactions.filter((reaction) => planIds.includes(reaction.plan_id)),
  }
}

/** POST /auth/magic-link */
export function requestMagicLink(email: string): Promise<void> {
  return respond(() => {
    if (!email.includes('@')) throw new ApiError(422, 'Informe um e-mail válido.')
  })
}

/** GET /destinations */
export function getDestinations(): Promise<Destination[]> {
  return respond(() => db.destinations)
}

/** POST /trips */
export function createTrip(input: CreateTripInput): Promise<Trip> {
  return respond(() => {
    if (input.destination_ids.length < 2 || input.destination_ids.length > 4) {
      throw new ApiError(422, 'Escolha de 2 a 4 destinos.')
    }
    const trip: Trip = {
      id: nextId('trip'),
      title: input.title,
      organizer_id: 'user-ana',
      date_window_start: input.date_window_start,
      date_window_end: input.date_window_end,
      alpha: input.alpha ?? 0.5,
      status: 'collecting',
      created_at: now(),
    }
    db.trips.push(trip)
    db.tripDestinations.push(...input.destination_ids.map((destination_id) => ({ trip_id: trip.id, destination_id })))
    return trip
  })
}

/** GET /trips/{id} */
export function getTrip(tripId: string): Promise<TripDetail> {
  return respond(() => ({
    ...findTrip(tripId),
    destinations: tripDestinations(tripId),
    members: db.members.filter((member) => member.trip_id === tripId),
    latest_round: latestRound(tripId),
  }))
}

/** POST /trips/{id}/members */
export function createMembers(tripId: string, input: CreateMembersInput): Promise<Member[]> {
  return respond(() => {
    findTrip(tripId)
    const current = db.members.filter((member) => member.trip_id === tripId).length
    if (current + input.display_names.length > 8) throw new ApiError(422, 'A viagem aceita no máximo 8 pessoas.')
    const created = input.display_names.map<Member>((display_name) => ({
      id: nextId('mem'),
      trip_id: tripId,
      display_name,
      invite_token: nextId('inv'),
      is_organizer: false,
      responded_at: null,
    }))
    db.members.push(...created)
    return created
  })
}

/** GET /invite/{token} */
export function getInvite(token: string): Promise<Invite> {
  return respond(() => {
    const member = findMemberByToken(token)
    const trip = findTrip(member.trip_id)
    const tripMembers = db.members.filter((item) => item.trip_id === trip.id)
    const organizer = tripMembers.find((item) => item.is_organizer)
    return {
      trip,
      member,
      organizer_name: organizer?.display_name ?? '',
      member_count: tripMembers.length,
      members: tripMembers.map(({ id, display_name, is_organizer, responded_at }) => ({
        id,
        display_name,
        is_organizer,
        responded_at,
      })),
      destinations: tripDestinations(trip.id),
      constraints: latestConstraints(member.id),
      latest_round: latestRound(trip.id),
    }
  })
}

/** POST /invite/{token}/constraints/parse — interpreta o texto livre, não salva. */
export function parseConstraints(token: string, rawText: string): Promise<ConstraintsInput> {
  return respond(() => {
    findMemberByToken(token)
    const text = rawText.trim()
    if (text.length < MIN_RAW_TEXT_LENGTH) {
      throw new ApiError(422, 'Escreva um pouco mais sobre suas condições para que possamos interpretar.')
    }
    return sampleInterpretation(text)
  })
}

/** PUT /invite/{token}/constraints — salva as restrições confirmadas. */
export function saveConstraints(token: string, input: ConstraintsInput): Promise<Constraints> {
  return respond(() => {
    const member = findMemberByToken(token)
    const previous = latestConstraints(member.id)
    const confirmedAt = now()
    const record: Constraints = {
      ...input,
      id: nextId('cons'),
      member_id: member.id,
      confirmed_at: confirmedAt,
      version: (previous?.version ?? 0) + 1,
    }
    db.constraints.push(record)
    member.responded_at = confirmedAt
    return record
  })
}

/** GET /trips/{id}/tensions — compatibilidade, principais restrições e viabilidade. */
export function getTripTensions(tripId: string): Promise<TripTensions> {
  return respond(() => {
    const trip = findTrip(tripId)
    const members = db.members.filter((member) => member.trip_id === tripId)
    return computeTensions({
      trip,
      members,
      destinations: tripDestinations(tripId),
      constraints: members.flatMap((member) => latestConstraints(member.id) ?? []),
    })
  })
}

/**
 * POST /trips/{id}/plans — roda o motor e gera uma nova rodada.
 * O front não tem motor: o mock devolve sempre as alternativas da rodada 1 da
 * referência visual, com o número da rodada seguinte.
 */
export function generatePlans(tripId: string): Promise<PlanRound> {
  return respond(() => {
    const trip = findTrip(tripId)
    const responded = db.members.filter((member) => member.trip_id === tripId && member.responded_at).length
    if (responded < 2) throw new ApiError(422, 'São necessárias pelo menos 2 respostas para gerar planos.')

    const round = (latestRound(tripId) ?? 0) + 1
    const plans = roundOnePlans.map<Plan>((seed) => ({
      ...seed,
      id: nextId('plan'),
      trip_id: tripId,
      round,
      alpha: ENGINE_ALPHA,
      alternatives_evaluated: roundOnePlans.length,
      violated_limits: 0,
    }))
    db.plans.push(...plans)
    trip.status = 'planned'
    return buildRound(tripId, round)
  })
}

/** GET /trips/{id}/plans?round=n */
export function getPlans(tripId: string, round: number): Promise<PlanRound> {
  return respond(() => buildRound(tripId, round))
}

/** POST /plans/{id}/reactions — cria ou substitui a reação do convidado ao plano. */
export function createReaction(planId: string, input: CreateReactionInput): Promise<Reaction> {
  return respond(() => {
    const member = findMemberByToken(input.invite_token)
    const plan = db.plans.find((item) => item.id === planId)
    if (!plan || plan.trip_id !== member.trip_id) throw new ApiError(404, 'Plano não encontrado.')

    const comment = input.comment?.trim() || null
    if (input.verdict !== 'accepted' && (comment?.length ?? 0) < MIN_REACTION_COMMENT_LENGTH) {
      throw new ApiError(
        422,
        input.verdict === 'rejected' ? 'Conte o motivo da recusa.' : 'Conte qual é a sua ressalva.',
      )
    }

    const reaction: Reaction = {
      id: nextId('react'),
      plan_id: planId,
      member_id: member.id,
      verdict: input.verdict,
      comment: input.verdict === 'accepted' ? null : comment,
      reacted_at: now(),
    }
    db.reactions = db.reactions.filter((item) => !(item.plan_id === planId && item.member_id === member.id))
    db.reactions.push(reaction)
    return reaction
  })
}
