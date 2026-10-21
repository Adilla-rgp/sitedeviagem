import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/button'
import { ApiError, getInvite } from '../../lib/api'
import { useDocumentTitle } from '../../lib/use-document-title'
import type { Invite } from '../../types/api'
import { InviteHeader } from './invite-header'
import { RespondFlow } from './respond-flow'

type InviteState = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; invite: Invite }

export function RespondPage() {
  const { token = '' } = useParams()
  const [state, setState] = useState<InviteState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useDocumentTitle('Responder ao convite')

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    getInvite(token).then(
      (invite) => {
        if (active) setState({ status: 'ready', invite })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error })
      },
    )
    return () => {
      active = false
    }
  }, [token, attempt])

  if (state.status === 'ready') {
    return <RespondFlow key={token} token={token} invite={state.invite} />
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-6 pt-5">
      <InviteHeader />
      <main className="flex flex-col gap-5">
        {state.status === 'loading' ? (
          <InviteLoading />
        ) : (
          <InviteError error={state.error} onRetry={() => setAttempt((value) => value + 1)} />
        )}
      </main>
    </div>
  )
}

function InviteLoading() {
  return (
    <>
      <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Carregando convite…
      </p>
      <div className="flex flex-col gap-3 motion-safe:animate-pulse" aria-hidden="true">
        <div className="h-8 w-3/4 rounded bg-surface" />
        <div className="h-4 w-full rounded bg-surface" />
        <div className="mt-4 h-28 w-full rounded bg-surface" />
      </div>
    </>
  )
}

interface InviteErrorProps {
  error: unknown
  onRetry: () => void
}

function InviteError({ error, onRetry }: InviteErrorProps) {
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div role="alert" className="flex flex-col gap-3">
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">
        {notFound ? 'Convite não encontrado' : 'Não foi possível carregar o convite'}
      </h1>
      <p className="text-sm leading-normal text-ink-muted">
        {notFound
          ? 'Confira se o link está completo ou peça um novo convite a quem organizou a viagem.'
          : 'Verifique sua conexão e tente novamente.'}
      </p>
      {!notFound && (
        <Button variant="secondary" className="self-start" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
