import type { TripTensions } from '../types/api'
import tensionsJson from './fixtures/july-tensions.json'

// Mapa de tensões que o motor calcula para cada etapa da demonstração, exportado
// pelo scripts/export_fixture.py da planner-api (veja o README desta pasta). As etapas
// têm os mesmos nomes das rodadas de fixtures/july-trip.json.

interface TensionsFixture {
  generated_by: string
  rounds: Record<string, TripTensions>
}

// O JSON importado tem tipos largos; src/mocks/tensions-fixture.test.ts confere o formato.
export const tensionsFixture = tensionsJson as unknown as TensionsFixture

export function tensionsForRound(name: string): TripTensions | null {
  return tensionsFixture.rounds[name] ?? null
}
