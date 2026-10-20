// Espelho da fórmula de pontuação da especificação, só para os mocks.
// Na versão real o score vem pronto da API.
//
// score(p) = (1 − α) · média(s_i(p)) + α · min(s_i(p))

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function scorePlan(memberScores: number[], alpha: number): number {
  if (memberScores.length === 0) return 0
  return (1 - alpha) * mean(memberScores) + alpha * Math.min(...memberScores)
}
