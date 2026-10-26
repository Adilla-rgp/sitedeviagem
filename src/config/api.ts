// Endereço da API (meridiano-api). Com VITE_API_URL definida no build, o front
// usa a API; sem ela, roda no modo demonstração com os dados de src/mocks/.
const apiUrl = import.meta.env.VITE_API_URL?.trim()

export const apiConfig = {
  baseUrl: apiUrl ? apiUrl.replace(/\/+$/, '') : null,
} as const
