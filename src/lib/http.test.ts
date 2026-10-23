import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, errorMessageFrom, request } from './http'

vi.mock('../config/api', () => ({ apiConfig: { baseUrl: 'http://api.test' } }))

describe('errorMessageFrom', () => {
  it('usa o detail em texto da API', () => {
    expect(errorMessageFrom(422, { detail: 'Conte o motivo da recusa.' }, null)).toBe('Conte o motivo da recusa.')
  })

  it('junta os erros de formato do FastAPI em frases legíveis', () => {
    const detail = [
      { loc: ['body'], msg: 'Value error, A janela de datas é menor que a duração da viagem.', type: 'value_error' },
      { loc: ['body', 'title'], msg: 'Field required', type: 'missing' },
      { loc: ['body', 'destination_ids'], msg: 'List should have at least 2 items', type: 'too_short' },
      { loc: ['body', 'nights'], msg: 'Input should be less than or equal to 30', type: 'less_than_equal' },
    ]
    expect(errorMessageFrom(422, { detail }, null)).toBe(
      'A janela de datas é menor que a duração da viagem. Preencha o campo título. Confira o campo destinos. Confira o campo noites.',
    )
  })

  it('diz quantos segundos esperar no 429', () => {
    const detail = { detail: 'Muitas tentativas em pouco tempo. Tente de novo em 12 segundos.' }
    expect(errorMessageFrom(429, detail, '12')).toBe('Muitas tentativas em pouco tempo. Aguarde 12 segundos e tente de novo.')
    expect(errorMessageFrom(429, detail, '1')).toBe('Muitas tentativas em pouco tempo. Aguarde 1 segundo e tente de novo.')
    expect(errorMessageFrom(429, null, null)).toBe('Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.')
  })

  it('tem mensagem própria quando a API não manda detail', () => {
    expect(errorMessageFrom(403, null, null)).toBe('Este link não dá acesso a esta viagem.')
    expect(errorMessageFrom(502, '<html>', null)).toBe('O servidor teve um problema. Tente novamente em instantes.')
  })
})

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda JSON, cabeçalhos e query para a API', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      request('/trips/t1/plans', { query: { round: 2 }, headers: { 'X-Admin-Token': 'adm' } }),
    ).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toBe('http://api.test/trips/t1/plans?round=2')
    expect(init.headers).toEqual({ 'X-Admin-Token': 'adm' })

    await request('/plans/p1/reactions', { method: 'POST', body: { verdict: 'accepted' } })
    const [, post] = fetchMock.mock.calls[1] as unknown as [URL, RequestInit]
    expect(post).toMatchObject({
      method: 'POST',
      body: '{"verdict":"accepted"}',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('converte a resposta de erro em ApiError com a mensagem legível', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ detail: 'x' }), { status: 429, headers: { 'Retry-After': '30' } })),
    )
    const error = await request('/invite/t/constraints/parse').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      message: 'Muitas tentativas em pouco tempo. Aguarde 30 segundos e tente de novo.',
    })
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(request('/destinations')).rejects.toMatchObject({ status: 0 })
  })
})
