import { test as base, expect, type Page } from '@playwright/test'

// Base dos testes de ponta a ponta: cada página aberta registra os erros do
// console e de JavaScript, e o teste falha se houver algum. Respostas de erro da
// API (o 409 de uma rodada antiga, por exemplo) não contam: o navegador as
// registra sozinho, e o que importa é a tela que o teste confere.

const tracked = new WeakSet<Page>()

export function trackErrors(page: Page, errors: string[], label = '') {
  if (tracked.has(page)) return
  tracked.add(page)
  const prefix = label ? `[${label}] ` : ''
  page.on('pageerror', (error) => errors.push(`${prefix}${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(`${prefix}${message.text()}`)
    }
  })
}

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      trackErrors(page, errors)
      await use(errors)
      expect(errors, 'erros no console').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Responde ao convite em texto livre, confere a interpretação e envia. */
export async function respond(page: Page, inviteUrl: string, text: string) {
  await page.goto(inviteUrl)
  await page.getByLabel('Quais são suas condições para esta viagem?').fill(text)
  await page.getByRole('button', { name: 'Interpretar' }).click()
  await expect(page.getByRole('heading', { name: 'Interpretação da sua resposta' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar e enviar' }).click()
  await expect(page.getByRole('heading', { name: 'Resposta enviada' })).toBeVisible()
}

/** Título do plano recomendado ("Paraty, 10 a 16 de julho"). */
export async function planTitle(page: Page): Promise<string> {
  return ((await page.locator('main h1').first().textContent()) ?? '').trim()
}
