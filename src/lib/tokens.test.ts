import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAdminToken, getInviteToken, saveInviteTokens, takeAdminTokenFromHash } from './tokens'

// Sem localStorage nos testes, os tokens ficam na memória: o mesmo caminho de
// uma aba privada com armazenamento bloqueado.

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tokens', () => {
  it('guarda os convites e mantém os já guardados quando a API não manda o token', () => {
    saveInviteTokens('trip-a', [
      { id: 'm1', invite_token: 'tok-1' },
      { id: 'm2', invite_token: 'tok-2' },
    ])
    saveInviteTokens('trip-a', [
      { id: 'm1', invite_token: null },
      { id: 'm2', invite_token: 'tok-2-novo' },
    ])
    expect(getInviteToken('trip-a', 'm1')).toBe('tok-1')
    expect(getInviteToken('trip-a', 'm2')).toBe('tok-2-novo')
    expect(getInviteToken('trip-b', 'm1')).toBeNull()
  })

  it('lê o token do #admin=, guarda por viagem e tira do endereço', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: { hash: '#admin=segredo', pathname: '/viagens/trip-c/tensoes', search: '?x=1' },
      history: { state: { idx: 0 }, replaceState },
    })
    takeAdminTokenFromHash('trip-c')
    expect(getAdminToken('trip-c')).toBe('segredo')
    expect(getAdminToken('trip-d')).toBeNull()
    expect(replaceState).toHaveBeenCalledWith({ idx: 0 }, '', '/viagens/trip-c/tensoes?x=1')
  })

  it('não faz nada sem #admin=', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: { hash: '', pathname: '/viagens/trip-e/tensoes', search: '' },
      history: { state: null, replaceState },
    })
    takeAdminTokenFromHash('trip-e')
    expect(getAdminToken('trip-e')).toBeNull()
    expect(replaceState).not.toHaveBeenCalled()
  })
})
