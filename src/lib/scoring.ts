import type { MemberScore } from '../types/api'

// Simulação do critério de equilíbrio no navegador. O plano recomendado vem do
// motor (na API); aqui só reordenamos as alternativas para o organizador ver o
// efeito de outro α. A fórmula é a da especificação:
//
//   score(p) = (1 − α) · média(s_i(p)) + α · min(s_i(p))

export interface ScoreSummary {
  mean: number
  worst: number
  /** Quem tem a menor satisfação (o primeiro, em caso de empate). */
  worstMemberId: string | null
  score: number
}

export function balanceScore(memberScores: number[], alpha: number): number {
  if (alpha < 0 || alpha > 1 || Number.isNaN(alpha)) {
    throw new RangeError(`α deve estar entre 0 e 1, recebido ${alpha}`)
  }
  if (memberScores.length === 0) return 0
  const mean = memberScores.reduce((sum, value) => sum + value, 0) / memberScores.length
  return (1 - alpha) * mean + alpha * Math.min(...memberScores)
}

export function summarizeScores(memberScores: MemberScore[], alpha: number): ScoreSummary {
  const values = memberScores.map((item) => item.score)
  if (values.length === 0) return { mean: 0, worst: 0, worstMemberId: null, score: 0 }

  const worst = memberScores.reduce((lowest, item) => (item.score < lowest.score ? item : lowest))
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    worst: worst.score,
    worstMemberId: worst.member_id,
    score: balanceScore(values, alpha),
  }
}

/** Ordena do maior para o menor score com o α dado; empates mantêm a ordem recebida. */
export function rankPlans<T extends { per_member_scores: MemberScore[] }>(
  plans: T[],
  alpha: number,
): (T & { simulated: ScoreSummary })[] {
  return plans
    .map((plan) => ({ ...plan, simulated: summarizeScores(plan.per_member_scores, alpha) }))
    .sort((a, b) => b.simulated.score - a.simulated.score)
}

/** 0 a 1 → 0 a 100, como a interface mostra. */
export function toPercent(value: number): number {
  return Math.round(value * 100)
}
