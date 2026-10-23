import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AccessError } from '../../components/access-error'
import { Button } from '../../components/button'
import { TripHeader } from '../../components/trip-header'
import { ApiError, getTrip, getTripTensions, isAccessError } from '../../lib/api'
import { takeAdminTokenFromHash } from '../../lib/tokens'
import { formatCount, formatDateRange } from '../../lib/format'
import { useDocumentTitle } from '../../lib/use-document-title'
import type { TripDetail, TripTensions } from '../../types/api'
import { NextSteps } from './next-steps'
import { ParticipantsPanel } from './participants-panel'
import { KeyConstraintsPanel, ViabilityPanel } from './summary-panels'
import { TensionMap } from './tension-map'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; trip: TripDetail; tensions: TripTensions }

export function TensionsPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useDocumentTitle('Mapa de tensões')

  const fetchData = useCallback(() => {
    takeAdminTokenFromHash(id)
    return Promise.all([getTrip(id), getTripTensions(id)])
  }, [id])

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    fetchData().then(
      ([trip, tensions]) => {
        if (active) setState({ status: 'ready', trip, tensions })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error })
      },
    )

    // Ao voltar para a aba, busca de novo em silêncio: alguém pode ter respondido.
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      fetchData().then(
        ([trip, tensions]) => {
          if (active) setState({ status: 'ready', trip, tensions })
        },
        () => {
          // Mantém os dados atuais; o erro aparece na próxima carga completa.
        },
      )
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData, attempt])

  return (
    <>
      <TripHeader tripId={id} />
      {state.status === 'ready' ? (
        <TensionsContent trip={state.trip} tensions={state.tensions} />
      ) : (
        <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-7 sm:px-8">
          {state.status === 'loading' ? (
            <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Carregando o mapa da viagem…
            </p>
          ) : (
            <TensionsError error={state.error} onRetry={() => setAttempt((value) => value + 1)} />
          )}
        </main>
      )}
    </>
  )
}

interface TensionsContentProps {
  trip: TripDetail
  tensions: TripTensions
}

function TensionsContent({ trip, tensions }: TensionsContentProps) {
  const tripMeta = [
    `Janela de ${formatDateRange(trip.date_window_start, trip.date_window_end)}`,
    formatCount(trip.destinations.length, 'destino candidato', 'destinos candidatos'),
  ].join(' · ')

  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-6 px-4 pb-10 pt-7 sm:px-8">
      <aside className="flex flex-[1_1_240px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-ink-muted">Viagens / {trip.title}</p>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{trip.title}</h1>
          <p className="text-[13px] text-ink-muted">{tripMeta}</p>
        </div>
        <ParticipantsPanel trip={trip} respondedCount={tensions.responded_count} />
      </aside>

      <section
        aria-labelledby="map-heading"
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-3 rounded-panel border border-line bg-surface-sunken p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="map-heading" className="text-base font-semibold">
            Compatibilidade entre participantes
          </h2>
          <span className="text-xs text-ink-muted">Atualizado a cada nova resposta</span>
        </div>
        <TensionMap members={trip.members} tensions={tensions} />
      </section>

      <aside className="flex flex-[1_1_280px] flex-col gap-4">
        <KeyConstraintsPanel tensions={tensions} />
        <ViabilityPanel tensions={tensions} destinations={trip.destinations} />
        <NextSteps trip={trip} respondedCount={tensions.responded_count} />
      </aside>
    </main>
  )
}

interface TensionsErrorProps {
  error: unknown
  onRetry: () => void
}

function TensionsError({ error, onRetry }: TensionsErrorProps) {
  const notFound = error instanceof ApiError && error.status === 404
  if (isAccessError(error)) return <AccessError message={(error as ApiError).message} />

  return (
    <div role="alert" className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">
        {notFound ? 'Viagem não encontrada' : 'Não foi possível carregar o mapa'}
      </h1>
      <p className="text-sm text-ink-muted">
        {notFound ? 'Confira se o endereço está completo.' : 'Verifique sua conexão e tente novamente.'}
      </p>
      {!notFound && (
        <Button variant="secondary" className="self-start" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
