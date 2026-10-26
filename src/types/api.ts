// Tipos do contrato da API (docs/especificacao.md e planner-api). Campos em
// snake_case, como a API em FastAPI/Pydantic serializa. Datas sem hora em ISO
// (AAAA-MM-DD), instantes em ISO 8601 completo. A ordem das listas de tensões
// (viability, key_constraints) não segue a da viagem: as telas não dependem dela.

export type IsoDate = string
export type IsoDateTime = string

// Catálogo

export type Climate = 'hot' | 'mild' | 'cold'

export type Pace = 'relaxed' | 'balanced' | 'intense'

export interface Destination {
  id: string
  name: string
  state: string
  climate: Climate
  /** Ritmo do destino, comparado com a preferência de ritmo de cada um. */
  pace: Pace
  /** Passagem de ida e volta, por pessoa. */
  fixed_cost: number
  /** Hospedagem e gastos por noite, por pessoa. */
  nightly_cost: number
  /** fixed_cost + noites × nightly_cost, com as noites da viagem (6 no catálogo). */
  est_cost_per_person: number
  cost_source: string
  tags: string[]
}

// Viagem e participantes

/**
 * agreed: todos que responderam aceitaram o plano recomendado da rodada mais
 * recente. Depois disso, respostas, reações e novas rodadas voltam 409.
 */
export type TripStatus = 'collecting' | 'planned' | 'agreed'

export interface Trip {
  id: string
  title: string
  /** Sem conta de organizador no MVP: o id do participante que organiza. */
  organizer_id: string | null
  date_window_start: IsoDate
  date_window_end: IsoDate
  /** Duração do roteiro padrão; o motor também testa um roteiro curto, com 2 noites a menos. */
  nights: number
  alpha: number
  status: TripStatus
  created_at: IsoDateTime
}

export interface Member {
  id: string
  trip_id: string
  display_name: string
  /**
   * Só vem na resposta que cria o convite ou gera um novo (o banco guarda o
   * hash). O front completa com os tokens guardados neste navegador (src/lib/tokens.ts).
   */
  invite_token: string | null
  is_organizer: boolean
  responded_at: IsoDateTime | null
}

/** Participante como os outros convidados o veem: sem o token do convite. */
export type GroupMember = Pick<Member, 'id' | 'display_name' | 'is_organizer' | 'responded_at'>

/** GET /trips/{id} */
export interface TripDetail extends Trip {
  destinations: Destination[]
  members: Member[]
  /** Rodada de planos mais recente; nulo se o motor ainda não rodou. */
  latest_round: number | null
}

/** Resposta de POST /trips. Os tokens só aparecem aqui. */
export interface TripCreated extends TripDetail {
  /** Vai no cabeçalho X-Admin-Token das rotas de quem organiza. */
  admin_token: string
  /** Link de administração: o token vai depois do #admin=, que o navegador não envia a servidores. */
  admin_url: string
}

/** POST /trips */
export interface CreateTripInput {
  title: string
  /** Nome de quem organiza; vira o primeiro participante, com is_organizer. */
  organizer_name: string
  destination_ids: string[]
  date_window_start: IsoDate
  date_window_end: IsoDate
  /** Padrão 6. */
  nights?: number
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
  /** "Não quero praia": elimina todo destino que tenha pelo menos uma das tags. */
  | (ConstraintItemBase & { kind: 'exclude_tags'; tags: string[] })

/** Preferências: entram no cálculo de satisfação com um peso de 0 a 1. */
export type SoftConstraint =
  | (ConstraintItemBase & { kind: 'pace'; pace: Pace; weight: number })
  | (ConstraintItemBase & { kind: 'prefer_climate'; climates: Climate[]; weight: number })
  /** Em ordem de preferência: o primeiro é o escolhido, e o resumo diz "Jericoacoara, depois Paraty". */
  | (ConstraintItemBase & { kind: 'prefer_destination'; destination_ids: string[]; weight: number })
  | (ConstraintItemBase & { kind: 'prefer_tags'; tags: string[]; weight: number })

/** Corpo de PUT /invite/{token}/constraints. A API preenche o summary que vier vazio. */
export interface ConstraintsInput {
  raw_text: string
  hard: HardConstraint[]
  soft: SoftConstraint[]
}

export type LimitKind = HardConstraint['kind']

/**
 * Um limite da própria pessoa e os destinos da viagem que ele elimina sozinho
 * (nenhum roteiro do destino o respeita). Só para a tela dela, nunca para o grupo.
 */
export interface MemberLimit {
  constraint_id: string
  kind: LimitKind
  eliminated_destination_ids: string[]
}

/** Resposta de POST /invite/{token}/constraints/parse. */
export interface ParsedConstraints extends ConstraintsInput {
  member_limits: MemberLimit[]
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
  /** Todos do grupo, para mostrar nomes no plano. Nunca inclui tokens de convite. */
  members: GroupMember[]
  destinations: Destination[]
  constraints: Constraints | null
  /** O que os limites salvos desta pessoa eliminam; vazio sem restrições salvas. */
  member_limits: MemberLimit[]
  /** Rodada de planos mais recente; nulo se o motor ainda não rodou. */
  latest_round: number | null
}

// Tensões

/**
 * Orçamento não é critério de aresta: um conflito de orçamento identificaria
 * quem tem o limite. O que um orçamento elimina aparece em key_constraints, sem nome.
 */
export type TensionCriterion = 'climate' | 'dates' | 'pace'

/** Par de participantes que já responderam. */
export interface MemberPair {
  member_a_id: string
  member_b_id: string
  status: 'compatible' | 'conflict'
  /** Critério principal do conflito (datas, clima, ritmo, nessa ordem); nulo quando o par é compatível. */
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
  /** Quem tem pelo menos 2 limites e estritamente mais que todos os outros; nulo se ninguém. */
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
  /** Falso para quem não declarou nenhuma preferência: fica fora da média e do mínimo. */
  has_preferences: boolean
  /** Maior satisfação que a pessoa teria em qualquer alternativa que respeita os limites do grupo. */
  best_possible: number
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
  /** Score calculado pelo motor com o α abaixo. */
  score: number
  /** α usado pelo motor nesta rodada. */
  alpha: number
  /** Quantas alternativas o motor avaliou na rodada. */
  alternatives_evaluated: number
  /** Limites violados pelo plano. O motor só devolve planos com zero. */
  violated_limits: number
  per_member_scores: MemberScore[]
  explanation: MemberExplanation[]
}

/**
 * Limite como o grupo vê: só o tipo e de quem. O de orçamento não identifica
 * ninguém (member_id nulo) e nunca traz o valor.
 */
export interface LimitRef {
  member_id: string | null
  kind: LimitKind
}

export interface ExcludedDestination {
  destination_id: string
  /** limit: nenhuma alternativa do destino respeita os limites; lower_score: viável, com score menor. */
  reason: 'limit' | 'lower_score'
  /** Limites que eliminam o destino; vazio quando o motivo é score menor. */
  limits: LimitRef[]
  /** Melhor score do destino; nulo quando o motivo é limite. */
  best_score: number | null
}

/** Só em rodada sem plano viável: um limite que elimina alternativas. */
export interface BlockingLimit extends LimitRef {
  /** Quantas alternativas (destino × variante × dia de ida) este limite elimina. */
  eliminated_candidates: number
}

/**
 * Tabela plan_rounds: o que é da rodada e não de um plano. Existe mesmo quando
 * nada é viável e a rodada não tem planos.
 */
export interface PlanRoundRecord {
  trip_id: string
  round: number
  /** α usado pelo motor nesta rodada. */
  alpha: number
  alternatives_evaluated: number
  /** Destinos da viagem que não aparecem em nenhum plano da rodada. */
  excluded_destinations: ExcludedDestination[]
  /** Vazio quando a rodada tem planos. */
  blocking_limits: BlockingLimit[]
  created_at: IsoDateTime
}

/** GET /trips/{id}/plans?round=n e POST /trips/{id}/plans */
export interface PlanRound extends PlanRoundRecord {
  /** Ordenados do maior para o menor score. Vazio quando nada respeita os limites de todos. */
  plans: Plan[]
  /** Nulo quando a rodada não tem planos. */
  recommended_plan_id: string | null
  /** Reações aos planos da rodada. Quem organiza recebe todas; o convidado, só a própria. */
  reactions: Reaction[]
}

// Reações

export type Verdict = 'accepted' | 'accepted_with_reservation' | 'rejected'

export interface Reaction {
  id: string
  plan_id: string
  member_id: string
  verdict: Verdict
  comment: string | null
  reacted_at: IsoDateTime
}

/**
 * POST /plans/{id}/reactions. O convidado se identifica pelo token do convite.
 * Reagir de novo ao mesmo plano substitui a reação anterior. O comentário é
 * obrigatório em "aceito com ressalva" e "recuso". Só vale para a rodada mais
 * recente (409 numa anterior) e com a viagem aberta (409 depois do acordo).
 */
export interface CreateReactionInput {
  invite_token: string
  verdict: Verdict
  comment?: string | null
}

/**
 * O que o motivo da recusa pede, interpretado e ainda não salvo. Só para quem
 * recusou, que confirma (com ou sem itens removidos) em POST /plans/{id}/reactions/constraints.
 */
export interface ConstraintDraft {
  hard: HardConstraint[]
  soft: SoftConstraint[]
  member_limits: MemberLimit[]
}

/** Resposta de POST /plans/{id}/reactions. */
export interface ReactionResult extends Reaction {
  /** Só na recusa. Listas vazias quando o motivo não traz limite nem preferência reconhecível. */
  constraint_draft: ConstraintDraft | null
  /** Status da viagem depois da reação: "agreed" quando esta reação fechou a viagem. */
  trip_status: TripStatus
}

/**
 * POST /plans/{id}/reactions/constraints. Grava uma nova versão das restrições
 * de quem recusou, que entra na próxima rodada: limites novos se somam e uma
 * preferência nova substitui a do mesmo tipo. Cada recusa é confirmada uma vez.
 */
export interface ConfirmRejectionInput {
  invite_token: string
  hard: HardConstraint[]
  soft: SoftConstraint[]
}
