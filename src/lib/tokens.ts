// Tokens da API guardados neste navegador, por viagem. Sem login no MVP: quem
// organiza volta à viagem pelo link de administração (#admin=…), e os links de
// convite só vêm da API ao criar o convite ou gerar um novo, porque o banco
// guarda apenas o hash. Tudo fica no localStorage; sem ele, vale até recarregar.

const STORAGE_PREFIX = 'trip-tokens:v1:'
const ADMIN_PARAM = 'admin'

interface TripTokens {
  admin: string | null
  /** Token do convite de cada participante, pelo id. */
  invites: Record<string, string>
}

const memory = new Map<string, TripTokens>()

function read(tripId: string): TripTokens {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + tripId)
    if (stored) return JSON.parse(stored) as TripTokens
  } catch {
    // Armazenamento indisponível ou valor inválido: usa o que está na memória.
  }
  return memory.get(tripId) ?? { admin: null, invites: {} }
}

function write(tripId: string, tokens: TripTokens) {
  memory.set(tripId, tokens)
  try {
    localStorage.setItem(STORAGE_PREFIX + tripId, JSON.stringify(tokens))
  } catch {
    // Idem: segue só na memória desta aba.
  }
}

export function getAdminToken(tripId: string): string | null {
  return read(tripId).admin
}

export function saveAdminToken(tripId: string, token: string) {
  write(tripId, { ...read(tripId), admin: token })
}

export function getInviteToken(tripId: string, memberId: string): string | null {
  return read(tripId).invites[memberId] ?? null
}

/** Guarda os tokens que a API devolveu; quem veio sem token mantém o que já estava guardado. */
export function saveInviteTokens(tripId: string, members: { id: string; invite_token: string | null }[]) {
  const tokens = read(tripId)
  const invites = { ...tokens.invites }
  for (const member of members) {
    if (member.invite_token) invites[member.id] = member.invite_token
  }
  write(tripId, { ...tokens, invites })
}

/**
 * Lê o token de administração do fragmento do endereço (#admin=…), guarda para
 * esta viagem e tira o token da barra de endereço, para ele não ir parar num
 * print ou num link copiado da página.
 */
export function takeAdminTokenFromHash(tripId: string) {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get(ADMIN_PARAM)
  if (!token) return
  saveAdminToken(tripId, token)
  params.delete(ADMIN_PARAM)
  const rest = params.toString()
  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', `${pathname}${search}${rest ? `#${rest}` : ''}`)
}

/** Link de administração da viagem, montado com o token guardado. */
export function adminUrl(tripId: string, token: string): string {
  return `${window.location.origin}/viagens/${tripId}/tensoes#${ADMIN_PARAM}=${token}`
}
