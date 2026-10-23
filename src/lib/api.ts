import { apiConfig } from '../config/api'
import { mockApi } from '../mocks/api'
import type {
  ConfirmRejectionInput,
  Constraints,
  ConstraintsInput,
  CreateMembersInput,
  CreateReactionInput,
  CreateTripInput,
  Destination,
  Invite,
  Member,
  ParsedConstraints,
  PlanRound,
  ReactionResult,
  TripCreated,
  TripDetail,
  TripTensions,
} from '../types/api'
import { ApiError, request } from './http'
import { getAdminToken, getInviteToken, saveAdminToken, saveInviteTokens } from './tokens'

export { ApiError, getErrorMessage } from './http'

// Única porta de entrada de dados do front. Cada função espelha uma rota da
// planner-api. Com VITE_API_URL definida, chama a API; sem ela, responde com a
// API de demonstração (src/mocks/api.ts), no mesmo formato e com os mesmos erros.

export interface Api {
  /** GET /destinations */
  getDestinations(): Promise<Destination[]>
  /** POST /trips. Guarda neste navegador o token de administração e o convite de quem organiza. */
  createTrip(input: CreateTripInput): Promise<TripCreated>
  /** GET /trips/{id} */
  getTrip(tripId: string): Promise<TripDetail>
  /** POST /trips/{id}/members */
  createMembers(tripId: string, input: CreateMembersInput): Promise<Member[]>
  /** POST /trips/{id}/members/{member_id}/invite: novo link de convite; o anterior deixa de valer. */
  reissueInvite(tripId: string, memberId: string): Promise<Member>
  /** GET /invite/{token} */
  getInvite(token: string): Promise<Invite>
  /** POST /invite/{token}/constraints/parse: interpreta o texto livre, não salva. */
  parseConstraints(token: string, rawText: string): Promise<ParsedConstraints>
  /** PUT /invite/{token}/constraints: salva as restrições confirmadas. */
  saveConstraints(token: string, input: ConstraintsInput): Promise<Constraints>
  /** GET /trips/{id}/tensions: compatibilidade, principais restrições e viabilidade. */
  getTripTensions(tripId: string): Promise<TripTensions>
  /** POST /trips/{id}/plans: roda o motor e gera uma nova rodada. */
  generatePlans(tripId: string): Promise<PlanRound>
  /** GET /trips/{id}/plans?round=n. Com o token do convite, como convidado; sem ele, como quem organiza. */
  getPlans(tripId: string, round: number, inviteToken?: string): Promise<PlanRound>
  /** POST /plans/{id}/reactions: cria ou substitui a reação ao plano. */
  createReaction(planId: string, input: CreateReactionInput): Promise<ReactionResult>
  /** POST /plans/{id}/reactions/constraints: confirma o que o motivo da recusa pede. */
  confirmRejection(planId: string, input: ConfirmRejectionInput): Promise<Constraints>
}

const ADMIN_HEADER = 'X-Admin-Token'
const INVITE_HEADER = 'X-Invite-Token'

/** Sem o token de administração guardado, a API recusaria: avisa antes, com o caminho de volta. */
function adminHeaders(tripId: string): Record<string, string> {
  const token = getAdminToken(tripId)
  if (!token) {
    throw new ApiError(
      401,
      'Este navegador não tem o acesso de quem organiza esta viagem. Abra o link de administração recebido ao criar a viagem.',
    )
  }
  return { [ADMIN_HEADER]: token }
}

/** A API só devolve o token do convite uma vez; completa com os que estão guardados aqui. */
function withStoredTokens<T extends { members: Member[] }>(tripId: string, detail: T): T {
  saveInviteTokens(tripId, detail.members)
  return {
    ...detail,
    members: detail.members.map((member) => ({
      ...member,
      invite_token: member.invite_token ?? getInviteToken(tripId, member.id),
    })),
  }
}

const remoteApi: Api = {
  getDestinations: () => request('/destinations'),

  createTrip: (input) => request<TripCreated>('/trips', { method: 'POST', body: input }),

  async getTrip(tripId) {
    const detail = await request<TripDetail>(`/trips/${tripId}`, { headers: adminHeaders(tripId) })
    return withStoredTokens(tripId, detail)
  },

  async createMembers(tripId, input) {
    const created = await request<Member[]>(`/trips/${tripId}/members`, {
      method: 'POST',
      body: input,
      headers: adminHeaders(tripId),
    })
    saveInviteTokens(tripId, created)
    return created
  },

  async reissueInvite(tripId, memberId) {
    const member = await request<Member>(`/trips/${tripId}/members/${memberId}/invite`, {
      method: 'POST',
      headers: adminHeaders(tripId),
    })
    saveInviteTokens(tripId, [member])
    return member
  },

  getInvite: (token) => request(`/invite/${token}`),

  parseConstraints: (token, rawText) =>
    request(`/invite/${token}/constraints/parse`, { method: 'POST', body: { raw_text: rawText } }),

  saveConstraints: (token, input) => request(`/invite/${token}/constraints`, { method: 'PUT', body: input }),

  getTripTensions: (tripId) => request(`/trips/${tripId}/tensions`, { headers: adminHeaders(tripId) }),

  generatePlans: (tripId) => request(`/trips/${tripId}/plans`, { method: 'POST', headers: adminHeaders(tripId) }),

  getPlans: (tripId, round, inviteToken) =>
    request(`/trips/${tripId}/plans`, {
      query: { round },
      headers: inviteToken ? { [INVITE_HEADER]: inviteToken } : adminHeaders(tripId),
    }),

  createReaction: (planId, input) => request(`/plans/${planId}/reactions`, { method: 'POST', body: input }),

  confirmRejection: (planId, input) =>
    request(`/plans/${planId}/reactions/constraints`, { method: 'POST', body: input }),
}

const api: Api = apiConfig.baseUrl === null ? mockApi : remoteApi

export const {
  getDestinations,
  getTrip,
  createMembers,
  reissueInvite,
  getInvite,
  parseConstraints,
  saveConstraints,
  getTripTensions,
  generatePlans,
  getPlans,
  createReaction,
  confirmRejection,
} = api

/** Nos dois modos, o token de administração e o convite de quem organiza ficam guardados neste navegador. */
export async function createTrip(input: CreateTripInput): Promise<TripCreated> {
  const created = await api.createTrip(input)
  saveAdminToken(created.id, created.admin_token)
  return withStoredTokens(created.id, created)
}

/**
 * Por que a API recusou com 409: plano de rodada anterior ou viagem já fechada.
 * A API distingue os dois só pela mensagem; a regra fica neste lugar.
 */
export function conflictKind(error: unknown): 'old_round' | 'trip_closed' | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  if (/rodada/i.test(error.message)) return 'old_round'
  if (/fechou|fechada/i.test(error.message)) return 'trip_closed'
  return null
}

/** Erro de acesso de quem organiza: falta o link de administração ou ele não vale para a viagem. */
export function isAccessError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}
