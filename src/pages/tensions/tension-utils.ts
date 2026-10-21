import type { Member, MemberPair, TensionCriterion, TripTensions } from '../../types/api'

export const CRITERION_LABEL: Record<TensionCriterion, string> = {
  budget: 'orçamento',
  climate: 'clima',
  dates: 'datas',
  pace: 'ritmo',
}

export type ConflictPair = MemberPair & { criterion: TensionCriterion }

export function conflictPairs(tensions: TripTensions): ConflictPair[] {
  return tensions.pairs.flatMap((pair) =>
    pair.status === 'conflict' && pair.criterion ? [{ ...pair, criterion: pair.criterion }] : [],
  )
}

export function nameOf(members: Member[], id: string): string {
  return members.find((member) => member.id === id)?.display_name ?? ''
}
