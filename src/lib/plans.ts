import type { Destination, GroupMember, Plan, Reaction, Verdict } from '../types/api'

/** "Lençóis Maranhenses" ou "Lençóis Maranhenses, roteiro curto". */
export function planTitle(plan: Plan, destinations: Destination[]): string {
  const name = destinations.find((destination) => destination.id === plan.destination_id)?.name ?? 'Destino'
  return plan.variant_label ? `${name}, ${plan.variant_label}` : name
}

/** Status de reação na terceira pessoa, para o organizador. */
export const VERDICT_STATUS: Record<Verdict, string> = {
  accepted: 'aceitou',
  accepted_with_reservation: 'aceitou com ressalva',
  rejected: 'recusou',
}

/** Rótulo dos botões e da confirmação, na primeira pessoa. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  accepted: 'Aceito',
  accepted_with_reservation: 'Aceito com ressalva',
  rejected: 'Recuso',
}

export function reactionOf(reactions: Reaction[], planId: string, memberId: string): Reaction | null {
  return reactions.find((reaction) => reaction.plan_id === planId && reaction.member_id === memberId) ?? null
}

export function memberName(members: GroupMember[], memberId: string): string {
  return members.find((member) => member.id === memberId)?.display_name ?? ''
}
