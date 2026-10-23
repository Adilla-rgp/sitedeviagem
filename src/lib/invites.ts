import type { Member } from '../types/api'
import { reissueInvite } from './api'
import { inviteUrl } from './links'
import { getInviteToken } from './tokens'

// Links de convite de quem organiza. A API só devolve o token ao criar o convite;
// quando ele não está guardado neste navegador, a única forma de ter o link é
// gerar um novo, e o anterior deixa de valer.

function knownToken(tripId: string, member: Member): string | null {
  // O guardado vale mesmo que a tela ainda mostre o participante sem token (gerado há pouco).
  return member.invite_token ?? getInviteToken(tripId, member.id)
}

export function missingLinks(tripId: string, members: Member[]): Member[] {
  return members.filter((member) => !knownToken(tripId, member))
}

/** O link de cada participante, gerando um novo para quem não tem token guardado. */
export async function inviteLinks(tripId: string, members: Member[]): Promise<Map<string, string>> {
  const links = new Map<string, string>()
  for (const member of members) {
    const token = knownToken(tripId, member) ?? (await reissueInvite(tripId, member.id)).invite_token
    if (token) links.set(member.id, inviteUrl(token))
  }
  return links
}
