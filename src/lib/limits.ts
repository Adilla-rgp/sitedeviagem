import type { BlockingLimit, ExcludedDestination, GroupMember, LimitKind, LimitRef } from '../types/api'
import { formatList } from './format'
import { memberName } from './plans'

// Textos sobre limites para o grupo. O de orçamento nunca diz de quem é: a API
// já o devolve sem member_id, e aqui ele vira "um participante".

interface LimitSubject {
  text: string
  /** Para concordar o verbo: "As datas de Bruno eliminam". */
  plural: boolean
}

/** "as datas de Bruno", "o orçamento de um participante", "o limite de clima de Eva". */
export function limitSubject(ref: LimitRef, members: GroupMember[]): LimitSubject {
  const name = ref.member_id ? memberName(members, ref.member_id) : ''
  switch (ref.kind) {
    case 'budget':
      return { text: 'o orçamento de um participante', plural: false }
    case 'date_range':
      return { text: `as datas de ${name}`, plural: true }
    case 'exclude_climate':
      return { text: `o limite de clima de ${name}`, plural: false }
    case 'exclude_destination':
      return { text: `o veto de ${name}`, plural: false }
    case 'exclude_tags':
      return { text: `o limite de tipo de destino de ${name}`, plural: false }
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "Fica de fora porque as datas de Diego e o limite de clima de Eva eliminam este destino." */
export function exclusionReason(item: ExcludedDestination, members: GroupMember[], recommendedScore: number | null) {
  if (item.reason === 'lower_score') {
    const score = Math.round((item.best_score ?? 0) * 100)
    return recommendedScore === null
      ? `Respeita os limites de todos, mas equilibra pior o grupo: score ${score}.`
      : `Respeita os limites de todos, mas equilibra pior o grupo: score ${score}, contra ${Math.round(recommendedScore * 100)} do plano recomendado.`
  }
  const subjects = item.limits.map((ref) => limitSubject(ref, members))
  const plural = subjects.length > 1 || subjects.some((subject) => subject.plural)
  return `Fica de fora porque ${formatList(subjects.map((subject) => subject.text))} ${plural ? 'eliminam' : 'elimina'} este destino.`
}

/** "As datas de Diego eliminam 136 de 136 alternativas." */
export function blockingSentence(item: BlockingLimit, members: GroupMember[], total: number): string {
  const subject = limitSubject(item, members)
  const verb = subject.plural ? 'eliminam' : 'elimina'
  const share = item.eliminated_candidates === total ? `todas as ${total}` : `${item.eliminated_candidates} de ${total}`
  return `${capitalize(subject.text)} ${verb} ${share} alternativas.`
}

const SUGGESTION: Record<LimitKind, (nights: number) => string> = {
  date_range: (nights) =>
    `Reduzir as noites da viagem (hoje, ${nights}) ou ampliar a janela de datas, para caber nas datas de quem pode menos.`,
  budget: () => 'Incluir destinos mais baratos ou reduzir as noites da viagem.',
  exclude_climate: () => 'Incluir um destino de outro clima.',
  exclude_destination: () => 'Incluir outro destino candidato.',
  exclude_tags: () => 'Incluir um destino sem os tipos vetados.',
}

/** Sugestões para destravar a rodada, na ordem dos limites que mais bloqueiam. */
export function unblockSuggestions(limits: BlockingLimit[], nights: number): string[] {
  const kinds = [...new Set(limits.map((item) => item.kind))]
  return kinds.map((kind) => SUGGESTION[kind](nights))
}
