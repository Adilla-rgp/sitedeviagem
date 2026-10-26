import { expect, respond, test } from './fixtures'

// Roteiro da demonstração, sem API: o que o site publicado mostra. Cada teste
// começa com o localStorage vazio, ou seja, com os dados de exemplo do início.

const EVA_INVITE = '/convite/eva-4k9x'
const TENSIONS = '/viagens/trip-julho/tensoes'
const PLANS = '/viagens/trip-julho/planos'
const EVA_TEXT = 'Posso de 10 a 20 de julho. No máximo 1.100 com tudo. Não curto frio.'
const AI_NOTICE = /serviço de IA externo/

test('a página inicial abre a demonstração', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Demonstração com dados de exemplo')).toBeVisible()
  // Sem API não há como criar viagem.
  await expect(page.getByRole('link', { name: 'Criar viagem' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Ver demonstração' }).click()
  await expect(page.getByRole('heading', { name: 'Compatibilidade entre participantes' })).toBeVisible()
  await expect(page.getByText('3 de 5 responderam')).toBeVisible()
})

test.describe('no celular', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('Eva responde em texto livre, sem aviso de IA', async ({ page }) => {
    await page.goto(EVA_INVITE)
    await expect(page.getByLabel('Quais são suas condições para esta viagem?')).toBeVisible()
    await expect(page.getByText(AI_NOTICE)).toHaveCount(0)

    await respond(page, EVA_INVITE, EVA_TEXT)
    await expect(page.getByText(/Seu orçamento é confidencial/)).toBeVisible()
    // A tela cabe em 360 px, sem rolagem horizontal.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('a resposta de Eva cria um conflito, os planos saem do motor e a reação chega a quem organiza', async ({
  page,
}) => {
  await respond(page, EVA_INVITE, EVA_TEXT)

  await page.goto(TENSIONS)
  await expect(page.getByText('O limite de clima de Eva elimina Chapada Diamantina, que Carla prefere.')).toBeVisible()

  await page.getByRole('button', { name: /Gerar planos com 4 respostas/ }).click()
  await page.waitForURL(/\/planos$/)
  await expect(page.getByText('Rodada 1')).toBeVisible()
  await expect(page.locator('main h1').first()).not.toBeEmpty()
  // O valor do orçamento de Eva nunca aparece para o grupo.
  await expect(page.locator('main')).not.toContainText('1.100')

  await page.goto(`${EVA_INVITE}/plano`)
  await page.getByRole('button', { name: 'Recuso' }).click()
  await expect(page.getByLabel('Por que você recusa este plano?')).toBeVisible()
  await expect(page.getByText(AI_NOTICE)).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByRole('button', { name: 'Aceito', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sua reação: Aceito', exact: true })).toBeVisible()

  await page.goto(PLANS)
  await expect(page.getByText('aceitou').first()).toBeVisible()
})

test('a resposta de Diego deixa a rodada sem plano viável', async ({ page }) => {
  await respond(page, EVA_INVITE, EVA_TEXT)
  await respond(page, '/convite/diego-8m2q', 'Só consigo de 12 a 15 de julho, depois tenho prova.')

  await page.goto(TENSIONS)
  await page.getByRole('button', { name: /Gerar planos com 5 respostas/ }).click()
  await page.waitForURL(/\/planos$/)
  await expect(page.getByRole('heading', { name: 'Nenhum plano respeita os limites de todos' })).toBeVisible()
  await expect(page.getByText('As datas de Diego eliminam todas as 136 alternativas.')).toBeVisible()
})
