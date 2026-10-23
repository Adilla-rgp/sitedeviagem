import type { Api } from '../lib/api'
import { ApiError } from '../lib/http'
import type {
  Constraints,
  Destination,
  Member,
  MemberLimit,
  Plan,
  PlanRound,
  PlanRoundRecord,
  Reaction,
  ReactionResult,
  SoftConstraint,
  Trip,
  TripDetail,
  TripTensions,
} from '../types/api'
import { findEngineRound, memberLimitsFor, toEngineInput } from './engine-fixture'
import { db, nextId, persistDb } from './store'
import { tensionsForRound } from './tensions-fixture'
import { sampleInterpretation } from './trip-july'

// API de demonstração: as mesmas funções da API real (src/lib/api.ts), sobre o
// banco em memória de store.ts e as saídas do motor em fixtures/. Responde
// depois de um atraso simulado e com as mesmas mensagens de erro da API.

const MOCK_LATENCY_MS = 700
const MIN_RAW_TEXT_LENGTH = 10
const MIN_REACTION_COMMENT_LENGTH = 3
const MIN_RESPONSES_FOR_PLANS = 2
const MAX_MEMBERS = 8
const DEFAULT_NIGHTS = 6
const ACCEPTING = ['accepted', 'accepted_with_reservation']

export const TRIP_CLOSED = 'A viagem já fechou: todos aceitaram o plano final.'
export const OLD_ROUND = 'Este plano é de uma rodada anterior. Veja a rodada mais recente.'

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

function ensureOpen(trip: Trip) {
  if (trip.status === 'agreed') throw new ApiError(409, TRIP_CLOSED)
}

function findMemberByToken(token: string): Member {
  const member = db.members.find((item) => item.invite_token === token)
  if (!member) throw new ApiError(404, 'Convite não encontrado.')
  return member
}

function tripMembers(tripId: string): Member[] {
  return db.members.filter((member) => member.trip_id === tripId)
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
  const rounds = db.planRounds.filter((record) => record.trip_id === tripId).map((record) => record.round)
  return rounds.length > 0 ? Math.max(...rounds) : null
}

function respondents(tripId: string): Member[] {
  return tripMembers(tripId).filter((member) => member.responded_at && latestConstraints(member.id))
}

/** O que os limites desta pessoa eliminam, para a tela dela. */
function ownLimits(hard: { id: string }[]): MemberLimit[] {
  return memberLimitsFor(hard.map((item) => item.id))
}

function tripDetail(tripId: string): TripDetail {
  return {
    ...findTrip(tripId),
    destinations: tripDestinations(tripId),
    members: tripMembers(tripId),
    latest_round: latestRound(tripId),
  }
}

function buildRound(tripId: string, round: number, viewerId: string | null): PlanRound {
  findTrip(tripId)
  const record = db.planRounds.find((item) => item.trip_id === tripId && item.round === round)
  if (!record) throw new ApiError(404, 'Rodada não encontrada.')
  const plans = db.plans
    .filter((plan) => plan.trip_id === tripId && plan.round === round)
    .sort((a, b) => b.score - a.score)
  const planIds = plans.map((plan) => plan.id)
  return {
    ...record,
    plans,
    recommended_plan_id: plans[0]?.id ?? null,
    // Como na API: quem organiza vê todas as reações; o convidado, só a própria.
    reactions: db.reactions.filter(
      (reaction) => planIds.includes(reaction.plan_id) && (viewerId === null || reaction.member_id === viewerId),
    ),
  }
}

/** Plano da rodada mais recente, da viagem de quem reage e com a viagem aberta. */
function findOpenPlan(planId: string, member: Member): { plan: Plan; trip: Trip } {
  const plan = db.plans.find((item) => item.id === planId)
  if (!plan || plan.trip_id !== member.trip_id) throw new ApiError(404, 'Plano não encontrado.')
  const trip = findTrip(plan.trip_id)
  ensureOpen(trip)
  if (plan.round !== latestRound(trip.id)) throw new ApiError(409, OLD_ROUND)
  return { plan, trip }
}

function addMembers(tripId: string, names: string[], isOrganizer: boolean): Member[] {
  const current = tripMembers(tripId).length
  if (current + names.length > MAX_MEMBERS) throw new ApiError(422, `A viagem aceita no máximo ${MAX_MEMBERS} pessoas.`)
  const created = names.map<Member>((display_name) => ({
    id: nextId('mem'),
    trip_id: tripId,
    display_name,
    invite_token: nextId('inv'),
    is_organizer: isOrganizer,
    responded_at: null,
  }))
  db.members.push(...created)
  return created
}

/** Sem respostas não há o que comparar; o resto vem do motor, em fixtures/july-tensions.json. */
function emptyTensions(tripId: string): TripTensions {
  return {
    trip_id: tripId,
    member_count: tripMembers(tripId).length,
    responded_count: 0,
    most_restrictive_member_id: null,
    pairs: [],
    key_constraints: [],
    viability: tripDestinations(tripId).map((destination) => ({
      destination_id: destination.id,
      accepted_count: 0,
      responded_count: 0,
    })),
  }
}

const NO_SAMPLE =
  'Os dados de exemplo não têm um cálculo para esta combinação de respostas. Reinicie a demonstração ou use as respostas sugeridas.'

export const mockApi: Api = {
  getDestinations: () => respond(() => db.destinations),

  createTrip: (input) =>
    respond(() => {
      if (input.destination_ids.length < 2 || input.destination_ids.length > 4) {
        throw new ApiError(422, 'Escolha de 2 a 4 destinos.')
      }
      const trip: Trip = {
        id: nextId('trip'),
        title: input.title,
        organizer_id: null,
        date_window_start: input.date_window_start,
        date_window_end: input.date_window_end,
        nights: input.nights ?? DEFAULT_NIGHTS,
        alpha: input.alpha ?? 0.5,
        status: 'collecting',
        created_at: now(),
      }
      db.trips.push(trip)
      db.tripDestinations.push(...input.destination_ids.map((destination_id) => ({ trip_id: trip.id, destination_id })))
      const [organizer] = addMembers(trip.id, [input.organizer_name], true)
      trip.organizer_id = organizer.id
      const adminToken = nextId('admin')
      return {
        ...tripDetail(trip.id),
        admin_token: adminToken,
        admin_url: `${window.location.origin}/viagens/${trip.id}/tensoes#admin=${adminToken}`,
      }
    }),

  getTrip: (tripId) => respond(() => tripDetail(tripId)),

  createMembers: (tripId, input) =>
    respond(() => {
      findTrip(tripId)
      return addMembers(tripId, input.display_names, false)
    }),

  // Os convites de exemplo já têm token; gerar um novo não muda a demonstração.
  reissueInvite: (tripId, memberId) =>
    respond(() => {
      const member = tripMembers(tripId).find((item) => item.id === memberId)
      if (!member) throw new ApiError(404, 'Participante não encontrado.')
      return member
    }),

  getInvite: (token) =>
    respond(() => {
      const member = findMemberByToken(token)
      const trip = findTrip(member.trip_id)
      const members = tripMembers(trip.id)
      const organizer = members.find((item) => item.is_organizer)
      const constraints = latestConstraints(member.id)
      return {
        trip,
        member,
        organizer_name: organizer?.display_name ?? '',
        member_count: members.length,
        members: members.map(({ id, display_name, is_organizer, responded_at }) => ({
          id,
          display_name,
          is_organizer,
          responded_at,
        })),
        destinations: tripDestinations(trip.id),
        constraints,
        member_limits: constraints ? ownLimits(constraints.hard) : [],
        latest_round: latestRound(trip.id),
      }
    }),

  parseConstraints: (token, rawText) =>
    respond(() => {
      const member = findMemberByToken(token)
      ensureOpen(findTrip(member.trip_id))
      const text = rawText.trim()
      if (text.length < MIN_RAW_TEXT_LENGTH) {
        throw new ApiError(422, 'Escreva um pouco mais sobre suas condições para que possamos interpretar.')
      }
      const interpretation = sampleInterpretation(member.id, text)
      return { ...interpretation, member_limits: ownLimits(interpretation.hard) }
    }),

  saveConstraints: (token, input) =>
    respond(() => {
      const member = findMemberByToken(token)
      ensureOpen(findTrip(member.trip_id))
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
    }),

  getTripTensions: (tripId) =>
    respond(() => {
      findTrip(tripId)
      const responses = respondents(tripId).flatMap((member) => {
        const record = latestConstraints(member.id)
        return record ? [toEngineInput(record)] : []
      })
      if (responses.length === 0) return emptyTensions(tripId)
      const engine = findEngineRound(responses)
      const tensions = engine && tensionsForRound(engine.name)
      if (!tensions) throw new ApiError(422, NO_SAMPLE)
      return { ...tensions, trip_id: tripId, member_count: tripMembers(tripId).length }
    }),

  /**
   * O front não tem motor: o mock usa a rodada de fixtures/july-trip.json que foi
   * calculada exatamente com as respostas salvas. Se a combinação não foi
   * exportada, avisa em vez de mostrar números que não correspondem às respostas.
   */
  generatePlans: (tripId) =>
    respond(() => {
      const trip = findTrip(tripId)
      ensureOpen(trip)
      const responses = respondents(tripId).flatMap((member) => {
        const record = latestConstraints(member.id)
        return record ? [toEngineInput(record)] : []
      })
      if (responses.length < MIN_RESPONSES_FOR_PLANS) {
        throw new ApiError(422, 'São necessárias pelo menos 2 respostas para gerar planos.')
      }
      const engine = findEngineRound(responses)
      if (!engine) throw new ApiError(422, NO_SAMPLE)

      const round = (latestRound(tripId) ?? 0) + 1
      const record: PlanRoundRecord = {
        trip_id: tripId,
        round,
        alpha: engine.alpha,
        alternatives_evaluated: engine.alternatives_evaluated,
        excluded_destinations: engine.excluded_destinations,
        blocking_limits: engine.blocking_limits,
        created_at: now(),
      }
      const plans = engine.plans.map<Plan>((seed) => ({ ...seed, id: nextId('plan'), trip_id: tripId, round }))
      db.planRounds.push(structuredClone(record))
      db.plans.push(...structuredClone(plans))
      trip.status = plans.length > 0 ? 'planned' : 'collecting'
      return buildRound(tripId, round, null)
    }),

  getPlans: (tripId, round, inviteToken) =>
    respond(() => {
      const viewer = inviteToken ? findMemberByToken(inviteToken) : null
      if (viewer && viewer.trip_id !== tripId) throw new ApiError(403, 'Este convite é de outra viagem.')
      return buildRound(tripId, round, viewer?.id ?? null)
    }),

  createReaction: (planId, input) =>
    respond(() => {
      const member = findMemberByToken(input.invite_token)
      const { plan, trip } = findOpenPlan(planId, member)

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

      // Como na API: fecha quando todos que responderam aceitaram o recomendado e ninguém recusou.
      const recommended = buildRound(trip.id, plan.round, null).recommended_plan_id === plan.id
      const verdicts = db.reactions.filter((item) => item.plan_id === plan.id)
      if (
        recommended &&
        verdicts.every((item) => item.verdict !== 'rejected') &&
        respondents(trip.id).every((item) =>
          verdicts.some((verdict) => verdict.member_id === item.id && ACCEPTING.includes(verdict.verdict)),
        )
      ) {
        trip.status = 'agreed'
      }

      // Sem interpretação de texto na demonstração: o rascunho da recusa vem vazio.
      const result: ReactionResult = {
        ...reaction,
        constraint_draft: input.verdict === 'rejected' ? { hard: [], soft: [], member_limits: [] } : null,
        trip_status: trip.status,
      }
      return result
    }),

  confirmRejection: (planId, input) =>
    respond(() => {
      const member = findMemberByToken(input.invite_token)
      const { plan } = findOpenPlan(planId, member)
      const reaction = db.reactions.find((item) => item.plan_id === plan.id && item.member_id === member.id)
      if (reaction?.verdict !== 'rejected') {
        throw new ApiError(409, 'Só quem recusou este plano confirma uma restrição a partir do motivo.')
      }
      if (input.hard.length + input.soft.length === 0) {
        throw new ApiError(422, 'Confirme pelo menos um limite ou uma preferência.')
      }
      const previous = latestConstraints(member.id)
      const version = (previous?.version ?? 0) + 1
      const renamed = <T extends { id: string }>(item: T): T => ({ ...item, id: `v${version}-${item.id}` })
      const replaced = new Set(input.soft.map((item) => item.kind))
      const soft: SoftConstraint[] = [
        ...(previous?.soft ?? []).filter((item) => !replaced.has(item.kind)),
        ...input.soft.map(renamed),
      ]
      const confirmedAt = now()
      const record: Constraints = {
        id: nextId('cons'),
        member_id: member.id,
        raw_text: [previous?.raw_text, `Ao recusar um plano: ${reaction.comment ?? ''}`].filter(Boolean).join('\n\n'),
        hard: [...(previous?.hard ?? []), ...input.hard.map(renamed)],
        soft,
        confirmed_at: confirmedAt,
        version,
      }
      db.constraints.push(record)
      member.responded_at = confirmedAt
      return record
    }),
}
