import { defineConfig, devices } from '@playwright/test'

// Ponta a ponta no modo demonstração: o build de produção sem VITE_API_URL,
// como o site publicado. Roda no CI. Contra a API local, veja playwright.api.config.ts.

const PORT = 4173
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'demo.e2e.ts',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Variável vazia vence o .env.local: o build sai sempre no modo demonstração.
    env: { VITE_API_URL: '' },
  },
})
