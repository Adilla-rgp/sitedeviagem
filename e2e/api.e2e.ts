import type { Browser, Page } from '@playwright/test'
import { API_URL } from '../playwright.api.config'
import { expect, planTitle, respond, test, trackErrors } from './fixtures'

// Ciclo completo contra a planner-api local: criar a viagem, convidar,
// responder, gerar planos, recusar e confirmar o motivo, nova rodada, reação
// numa rodada antiga e todos aceitando até a viagem fechar. Cada pessoa usa um
// contexto próprio do navegador, como uma janela anônima.

test.describe.configure({ mode: 'serial' })

interface Person {
  name: string
  page: Page
}

async function person(browser: Browser, name: string, errors: string[], width = 1280): Promise<Person> {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  trackErrors(page, errors, name)
  return { name, page }
}

const TEXTS = {
  Ana: 'Topo qualquer data dentro da janela. Queria muito os Lençóis Maranhenses, praia de preferência.',
  Bruno: 'Só consigo de 8 a 18 de julho. Quero praia e agito: Jericoacoara seria perfeito.',
  Carla: 'Prefiro serra, a Chapada Diamantina seria ótima. Ritmo tranquilo, por favor.',
  Eva: 'Só posso de 10 a 20 de julho, no máximo R$ 1.100 tudo incluso. Não curto frio. Ritmo tranquilo.',
} as const

test('ciclo completo até a viagem fechar', async ({ browser, page, consoleErrors }) => {
  const ana: Person = { name: 'Ana', page }
  const links: Record<string, string> = {}
  let adminLink = ''
  let tripId = ''

  await test.step('quem organiza cria a viagem', async () => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Criar viagem' }).first().click()
    await page.getByLabel('Nome da viagem').fill('Feriado de teste')
    await page.getByLabel('Seu nome').fill('Ana')
    for (const name of ['Lençóis Maranhenses', 'Jericoacoara', 'Chapada Diamantina', 'Paraty']) {
      await page.getByRole('checkbox', { name: new RegExp(name) }).check()
    }
    await page.getByLabel('Primeiro dia possível').fill('2027-07-05')
    await page.getByLabel('Último dia possível').fill('2027-07-26')
    await page.getByLabel('Noites').fill('6')
    await page.getByRole('button', { name: 'Criar viagem' }).click()
    await expect(page.getByRole('heading', { name: 'Guarde o link de administração' })).toBeVisible()

    adminLink = await page.getByLabel('Link de administração', { exact: true }).inputValue()
    expect(adminLink).toContain('#admin=')
    tripId = adminLink.match(/viagens\/([^/]+)\//)![1]
  })

  await test.step('convida três pessoas', async () => {
    await page.getByLabel('Convidar pessoas').fill('Bruno\nCarla\nEva')
    await page.getByRole('button', { name: 'Criar convites' }).click()
    await expect(page.getByLabel('Eva', { exact: true })).toBeVisible()
    for (const name of ['Bruno', 'Carla', 'Eva']) {
      links[name] = await page.getByLabel(name, { exact: true }).inputValue()
    }
    links.Ana = await page.getByLabel('Ana (você)').inputValue()
  })

  const guests: Record<string, Person> = {}
  await test.step('todos respondem; convidados no celular', async () => {
    await respond(ana.page, links.Ana, TEXTS.Ana)
    for (const name of ['Bruno', 'Carla', 'Eva'] as const) {
      guests[name] = await person(browser, name, consoleErrors, 390)
      await respond(guests[name].page, links[name], TEXTS[name])
    }
  })

  await test.step('o link de administração abre a viagem em outro navegador e sai da barra de endereço', async () => {
    const fresh = await person(browser, 'Ana (outro navegador)', consoleErrors)
    await fresh.page.goto(adminLink)
    await expect(fresh.page.getByRole('heading', { name: 'Compatibilidade entre participantes' })).toBeVisible()
    expect(fresh.page.url()).not.toContain('#admin=')
  })

  let round1 = ''
  await test.step('rodada 1', async () => {
    await page.goto(`/viagens/${tripId}/tensoes`)
    await page.getByRole('button', { name: /Gerar planos com 4 respostas/ }).click()
    await page.waitForURL(/\/planos$/)
    await expect(page.getByText('Rodada 1')).toBeVisible()
    round1 = await planTitle(page)
    expect(round1).not.toBe('')
    // Bruno abre o plano da rodada 1 e deixa a tela aberta.
    await guests.Bruno.page.goto(`${links.Bruno}/plano`)
    await expect(guests.Bruno.page.getByRole('button', { name: 'Aceito', exact: true })).toBeVisible()
  })

  await test.step('Carla recusa, confere a interpretação do motivo e confirma', async () => {
    const carla = guests.Carla.page
    await carla.goto(`${links.Carla}/plano`)
    await carla.getByRole('button', { name: 'Recuso' }).click()
    const destination = round1.split(',')[0]
    const other = destination === 'Paraty' ? 'Jericoacoara' : 'Paraty'
    await carla.getByLabel('Por que você recusa este plano?').fill(`${destination} não, prefiro ${other}.`)
    await carla.getByRole('button', { name: 'Enviar recusa' }).click()
    await expect(carla.getByRole('heading', { name: 'Interpretação do motivo' })).toBeVisible()
    await carla.getByRole('button', { name: 'Confirmar restrição' }).click()
    await expect(carla.getByRole('heading', { name: 'Restrição confirmada' })).toBeVisible()
  })

  await test.step('rodada 2 muda o plano recomendado', async () => {
    await page.goto(`/viagens/${tripId}/tensoes`)
    await page.getByRole('button', { name: /Gerar nova rodada com 4 respostas/ }).click()
    await expect(page.getByText('Rodada 2')).toBeVisible()
    expect(await planTitle(page)).not.toBe(round1)
  })

  await test.step('Bruno reage na tela antiga e é levado à rodada mais recente', async () => {
    const bruno = guests.Bruno.page
    await bruno.getByRole('button', { name: 'Aceito', exact: true }).click()
    await expect(bruno.getByRole('heading', { name: 'Há uma rodada mais recente' })).toBeVisible()
    await bruno.getByRole('link', { name: 'Ver a rodada mais recente' }).click()
    await expect(bruno.getByText(/rodada 2/)).toBeVisible()
  })

  await test.step('todos aceitam a rodada 2 e a viagem fecha', async () => {
    for (const name of ['Bruno', 'Carla', 'Eva']) {
      const guest = guests[name].page
      if (name !== 'Bruno') await guest.goto(`${links[name]}/plano`)
      await guest.getByRole('button', { name: 'Aceito', exact: true }).click()
      await expect(guest.getByRole('heading', { name: 'Sua reação: Aceito', exact: true })).toBeVisible()
    }
    await page.reload()
    await page.getByRole('button', { name: 'Aceito', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Viagem fechada' })).toBeVisible()
    await expect(page.getByText('Plano final', { exact: true })).toBeVisible()
  })

  await test.step('a viagem fechada aparece para convidados e no mapa', async () => {
    const eva = guests.Eva.page
    await eva.goto(`${links.Eva}/plano`)
    await expect(eva.getByRole('heading', { name: 'Viagem fechada' })).toBeVisible()
    await eva.goto(links.Eva)
    await expect(eva.getByText(/As respostas não podem mais ser alteradas/)).toBeVisible()

    await page.goto(`/viagens/${tripId}/tensoes`)
    await expect(page.getByText(/A viagem fechou/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Gerar nova rodada/ })).toBeDisabled()

    const token = new URL(adminLink).hash.replace('#admin=', '')
    const response = await fetch(`${API_URL}/trips/${tripId}`, { headers: { 'X-Admin-Token': token } })
    expect((await response.json()).status).toBe('agreed')
  })
})
