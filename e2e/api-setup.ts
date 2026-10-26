import { API_URL } from '../playwright.api.config'

/** Falha cedo, com uma mensagem clara, se a planner-api não estiver no ar. */
export default async function checkApi() {
  try {
    const response = await fetch(`${API_URL}/destinations`)
    if (!response.ok) throw new Error(`GET /destinations respondeu ${response.status}`)
  } catch (error) {
    throw new Error(
      `A planner-api não respondeu em ${API_URL} (${(error as Error).message}). ` +
        'Suba a API com "docker compose up --build" no repositório planner-api, ou defina E2E_API_URL.',
    )
  }
}
