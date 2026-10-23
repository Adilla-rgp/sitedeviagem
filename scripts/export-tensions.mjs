// Gera src/mocks/fixtures/july-tensions.json: o mapa de tensões que o motor
// calcula para cada etapa da demonstração, pela API rodando localmente.
//
//   node scripts/export-tensions.mjs [http://localhost:8000]
//
// Para cada rodada de fixtures/july-trip.json, cria uma viagem nova com as
// mesmas respostas e guarda GET /trips/{id}/tensions com os ids da
// demonstração (mem-ana, mem-bruno...). O front não calcula tensões: no modo
// demonstração, src/mocks/api.ts devolve a etapa que corresponde às respostas salvas.

import { readFile, writeFile } from 'node:fs/promises'

const API = (process.argv[2] ?? 'http://localhost:8000').replace(/\/$/, '')
const FIXTURE = new URL('../src/mocks/fixtures/july-trip.json', import.meta.url)
const OUT = new URL('../src/mocks/fixtures/july-tensions.json', import.meta.url)
const NAMES = ['Ana', 'Bruno', 'Carla', 'Eva', 'Diego']

async function call(method, path, body, headers = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

/** Troca, em qualquer nível, os ids da API pelos da demonstração. */
function withDemoIds(value, ids) {
  if (Array.isArray(value)) return value.map((item) => withDemoIds(item, ids))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withDemoIds(item, ids)]))
  }
  if (typeof value !== 'string') return value
  return Object.entries(ids).reduce((text, [apiId, demoId]) => text.replaceAll(apiId, demoId), value)
}

async function tensionsFor(fixture, round) {
  const created = await call('POST', '/trips', {
    title: 'Viagem de julho',
    organizer_name: 'Ana',
    destination_ids: fixture.destinations.map((item) => item.id),
    date_window_start: fixture.trip.window_start,
    date_window_end: fixture.trip.window_end,
    nights: fixture.trip.nights,
    alpha: fixture.trip.alpha,
  })
  const admin = { 'X-Admin-Token': created.admin_token }
  const guests = await call('POST', `/trips/${created.id}/members`, { display_names: NAMES.slice(1) }, admin)
  const members = [...created.members, ...guests]
  const ids = Object.fromEntries(members.map((member) => [member.id, `mem-${member.display_name.toLowerCase()}`]))
  const tokens = Object.fromEntries(members.map((member) => [`mem-${member.display_name.toLowerCase()}`, member.invite_token]))

  for (const response of round.members) {
    await call('PUT', `/invite/${tokens[response.member_id]}/constraints`, {
      raw_text: '',
      hard: response.hard,
      soft: response.soft,
    })
  }
  const tensions = await call('GET', `/trips/${created.id}/tensions`, undefined, admin)
  return withDemoIds({ ...tensions, trip_id: fixture.trip_id }, ids)
}

const fixture = JSON.parse(await readFile(FIXTURE, 'utf8'))
const rounds = {}
for (const round of fixture.rounds) {
  rounds[round.name] = await tensionsFor(fixture, round)
}
const output = { generated_by: `GET /trips/{id}/tensions em ${API}`, rounds }
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Gravado ${OUT.pathname} com ${Object.keys(rounds).length} etapas.`)
