import { useParams } from 'react-router-dom'
import { TripHeader } from '../../components/trip-header'
import { useDocumentTitle } from '../../lib/use-document-title'

export function PlansPage() {
  const { id = '' } = useParams()
  useDocumentTitle('Planos e concessões')

  return (
    <>
      <TripHeader tripId={id} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 pb-10 pt-7 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Planos e concessões</h1>
        <p className="text-sm text-ink-muted">Esta tela ainda está em construção.</p>
      </main>
    </>
  )
}
