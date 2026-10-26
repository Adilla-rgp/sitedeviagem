import { defineConfig, devices } from '@playwright/test'

// Ponta a ponta contra a meridiano-api rodando localmente (docker compose up
// naquele repositório). Roda à mão: npm run test:e2e:api. O front sobe na porta
// 5173, a origem que a API aceita por padrão em CORS_ORIGINS.

export const API_URL = (process.env.E2E_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')
const PORT = 5173

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'api.e2e.ts',
  globalSetup: './e2e/api-setup.ts',
  timeout: 120_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Um servidor já aberto na 5173 pode estar no modo demonstração.
    reuseExistingServer: false,
    env: { VITE_API_URL: API_URL },
  },
})
