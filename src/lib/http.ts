import { apiConfig } from '../config/api'

// Transporte da API real: fetch para VITE_API_URL, com os erros convertidos
// em mensagens prontas para a interface. Só src/lib/api.ts usa este arquivo.

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

/** Erro de formato do FastAPI (422): um item por campo. */
interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
  type?: string
}

const FIELD_LABEL: Record<string, string> = {
  title: 'título',
  organizer_name: 'nome de quem organiza',
  destination_ids: 'destinos',
  date_window_start: 'início da janela',
  date_window_end: 'fim da janela',
  nights: 'noites',
  display_names: 'nomes',
  raw_text: 'texto',
  comment: 'comentário',
  verdict: 'reação',
  hard: 'limites',
  soft: 'preferências',
}

const NETWORK_MESSAGE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'

function fieldOf(issue: ValidationIssue): string | null {
  const name = [...(issue.loc ?? [])].reverse().find((part): part is string => typeof part === 'string')
  return name && name !== 'body' ? (FIELD_LABEL[name] ?? name) : null
}

function issueMessage(issue: ValidationIssue): string {
  const field = fieldOf(issue)
  // As validações da API já vêm em português, com o prefixo do Pydantic.
  if (issue.msg?.startsWith('Value error, ')) return issue.msg.slice('Value error, '.length)
  if (issue.type === 'missing') return field ? `Preencha o campo ${field}.` : 'Falta um campo obrigatório.'
  return field ? `Confira o campo ${field}.` : 'Confira os dados enviados.'
}

function ensurePeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function retryMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter)
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.'
  const wait = Math.ceil(seconds)
  return `Muitas tentativas em pouco tempo. Aguarde ${wait} ${wait === 1 ? 'segundo' : 'segundos'} e tente de novo.`
}

/** Converte a resposta de erro da API ({detail} em texto ou lista) numa mensagem legível. */
export function errorMessageFrom(status: number, body: unknown, retryAfter: string | null): string {
  if (status === 429) return retryMessage(retryAfter)
  const detail = body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : null
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = [...new Set((detail as ValidationIssue[]).map(issueMessage))]
    return messages.map(ensurePeriod).join(' ')
  }
  if (status === 401 || status === 403) return 'Este link não dá acesso a esta viagem.'
  if (status === 404) return 'Não encontrado.'
  if (status >= 500) return 'O servidor teve um problema. Tente novamente em instantes.'
  return 'Não foi possível concluir. Tente novamente.'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | number>
}

export async function request<T>(path: string, { method = 'GET', body, headers, query }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${apiConfig.baseUrl}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value))

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE)
  }

  const parsed: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, errorMessageFrom(response.status, parsed, response.headers.get('Retry-After')))
  }
  return parsed as T
}
