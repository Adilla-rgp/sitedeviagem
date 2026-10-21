// Tipos do contrato da API (docs/especificacao.md). Campos em snake_case, como
// a API em FastAPI/Pydantic vai serializar. Datas sem hora em ISO (AAAA-MM-DD),
// instantes em ISO 8601 completo.

export type IsoDate = string
export type IsoDateTime = string

// Catálogo

export type Climate = 'hot' | 'mild' | 'cold'

export interface Destination {
  id: string
  name: string
  state: string
  climate: Climate
  est_cost_per_person: number
  cost_source: string
  tags: string[]
}

// Viagem e participantes

export type TripStatus = 'collecting' | 'planned' | 'agreed'

export interface Trip {
  id: string
  title: string
  organizer_id: string
  date_window_start: IsoDate
  date_window_end: IsoDate
  alpha: number
  status: TripStatus
  created_at: IsoDateTime
}

export interface Member {
  id: string
  trip_id: string
  display_name: string
  invite_token: string
  is_organizer: boolean
  responded_at: IsoDateTime | null
}

/** GET /trips/{id} */
export interface TripDetail extends Trip {
  destinations: Destination[]
  members: Member[]
}

/** POST /trips */
export interface CreateTripInput {
  title: string
  destination_ids: string[]
  date_window_start: IsoDate
  date_window_end: IsoDate
  alpha?: number
}

/** POST /trips/{id}/members */
export interface CreateMembersInput {
  display_names: string[]
}

// Restrições

interface ConstraintItemBase {
  id: string
  /** Frase pronta para exibição, gerada pela API a partir dos valores estruturados. */
  summary: string
}

/** Limites: nunca são violados pelo motor. */
export type HardConstraint =
  | (ConstraintItemBase & { kind: 'date_range'; start: IsoDate; end: IsoDate })
  | (ConstraintItemBase & { kind: 'budget'; max_per_person: number; all_inclusive: boolean })
  | (ConstraintItemBase & { kind: 'exclude_climate'; climates: Climate[] })
  | (ConstraintItemBase & { kind: 'exclude_destination'; destination_ids: string[] })

export type Pace = 'relaxed' | 'balanced' | 'intense'

/** Preferências: entram no cálculo de satisfação com um peso de 0 a 1. */
export type SoftConstraint =
  | (ConstraintItemBase & { kind: 'pace'; pace: Pace; weight: number })
  | (ConstraintItemBase & { kind: 'prefer_climate'; climates: Climate[]; weight: number })
  | (ConstraintItemBase & { kind: 'prefer_destination'; destination_ids: string[]; weight: number })
  | (ConstraintItemBase & { kind: 'prefer_tags'; tags: string[]; weight: number })

/**
 * Corpo de PUT /invite/{token}/constraints e resposta de
 * POST /invite/{token}/constraints/parse (que não salva nada).
 */
export interface ConstraintsInput {
  raw_text: string
  hard: HardConstraint[]
  soft: SoftConstraint[]
}

export interface Constraints extends ConstraintsInput {
  id: string
  member_id: string
  confirmed_at: IsoDateTime
  version: number
}

/** GET /invite/{token} */
export interface Invite {
  trip: Trip
  member: Member
  organizer_name: string
  member_count: number
  destinations: Destination[]
  constraints: Constraints | null
}

// Tensões

export type TensionCriterion = 'budget' | 'climate' | 'dates' | 'pace'

/** Par de participantes que já responderam. */
export interface MemberPair {
  member_a_id: string
  member_b_id: string
  status: 'compatible' | 'conflict'
  /** Critério principal do conflito; nulo quando o par é compatível. */
  criterion: TensionCriterion | null
}

export interface KeyConstraint {
  id: string
  summary: string
}

export interface DestinationViability {
  destination_id: string
  /** Quantos dos que responderam aceitam o destino (nenhum limite o elimina). */
  accepted_count: number
  responded_count: number
}

/** GET /trips/{id}/tensions */
export interface TripTensions {
  trip_id: string
  member_count: number
  responded_count: number
  /** Quem tem mais limites, quando há um único com mais que os demais. */
  most_restrictive_member_id: string | null
  pairs: MemberPair[]
  key_constraints: KeyConstraint[]
  viability: DestinationViability[]
}

// Planos

export interface MemberScore {
  member_id: string
  /** Satisfação de 0 a 1. */
  score: number
}

export interface MemberExplanation {
  member_id: string
  text: string
}

export interface Plan {
  id: string
  trip_id: string
  round: number
  destination_id: string
  /** Nome de variante, por exemplo "roteiro curto". Nulo no roteiro padrão. */
  variant_label: string | null
  start_date: IsoDate
  end_date: IsoDate
  est_cost_per_person: number
  score: number
  per_member_scores: MemberScore[]
  explanation: MemberExplanation[]
}

/** GET /trips/{id}/plans?round=n e POST /trips/{id}/plans */
export interface PlanRound {
  trip_id: string
  round: number
  alpha: number
  /** Ordenados do maior para o menor score. */
  plans: Plan[]
  recommended_plan_id: string | null
}

// Reações

export type Verdict = 'accepted' | 'accepted_with_reservation' | 'rejected'

export interface Reaction {
  id: string
  plan_id: string
  member_id: string
  verdict: Verdict
  comment: string | null
}

/** POST /plans/{id}/reactions. O convidado se identifica pelo token do convite. */
export interface CreateReactionInput {
  invite_token: string
  verdict: Verdict
  comment?: string | null
}
