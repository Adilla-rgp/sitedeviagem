import { apiConfig } from './api'

// Sem API configurada (VITE_API_URL), o site roda em modo demonstração: dados
// de exemplo (src/mocks/), faixa no topo de todas as telas e roteiro na página inicial.
export const demoConfig = {
  enabled: apiConfig.baseUrl === null,
} as const
