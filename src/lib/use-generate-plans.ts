import { useState } from 'react'
import type { PlanRound } from '../types/api'
import { generatePlans, getErrorMessage } from './api'

/** Chama o motor (POST /trips/{id}/plans) com estado de carregamento e erro. */
export function useGeneratePlans(tripId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(): Promise<PlanRound | null> {
    setIsGenerating(true)
    setError(null)
    try {
      return await generatePlans(tripId)
    } catch (caught) {
      setError(getErrorMessage(caught, 'Não foi possível gerar os planos. Tente novamente.'))
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  return { generate, isGenerating, error }
}
