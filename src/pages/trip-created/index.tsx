import { KeyRound, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AccessError } from '../../components/access-error'
import { AlertMessage } from '../../components/alert-message'
import { BrandMark } from '../../components/brand-mark'
import { Button } from '../../components/button'
import { buttonVariants } from '../../components/button-styles'
import { CopyButton } from '../../components/copy-button'
import { createMembers, getErrorMessage, getTrip, isAccessError, reissueInvite } from '../../lib/api'
import { inviteUrl } from '../../lib/links'
import { adminUrl, getAdminToken } from '../../lib/tokens'
import { useDocumentTitle } from '../../lib/use-document-title'
import type { Member, TripDetail } from '../../types/api'

const MAX_MEMBERS = 8

type PageState = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; trip: TripDetail }

export function TripCreatedPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useDocumentTitle('Viagem criada')

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    getTrip(id).then(
      (trip) => {
        if (active) setState({ status: 'ready', trip })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error })
      },
    )
    return () => {
      active = false
    }
  }, [id, attempt])

  // O link vem da criação; depois de recarregar, é montado com o token guardado.
  const token = getAdminToken(id)
  const fromCreation = (location.state as { adminUrl?: string } | null)?.adminUrl
  const link = fromCreation ?? (token ? adminUrl(id, token) : null)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-10 pt-5 sm:px-8">
      <header>
        <BrandMark />
      </header>
      <main className="flex flex-col gap-6">
        {state.status === 'loading' && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Carregando a viagem…
          </p>
        )}
        {state.status === 'error' &&
          (isAccessError(state.error) ? (
            <AccessError message={getErrorMessage(state.error, '')} />
          ) : (
            <div role="alert" className="flex flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-[-0.01em]">Não foi possível carregar a viagem</h1>
              <p className="text-sm text-ink-muted">{getErrorMessage(state.error, 'Verifique sua conexão e tente novamente.')}</p>
              <Button variant="secondary" className="self-start" onClick={() => setAttempt((value) => value + 1)}>
                Tentar novamente
              </Button>
            </div>
          ))}
        {state.status === 'ready' &&
          (link ? (
            <CreatedContent
              trip={state.trip}
              adminLink={link}
              onMembersChanged={(trip) => setState({ status: 'ready', trip })}
            />
          ) : (
            <AccessError message="O link de administração desta viagem não está guardado neste navegador." />
          ))}
      </main>
    </div>
  )
}

interface CreatedContentProps {
  trip: TripDetail
  adminLink: string
  onMembersChanged: (trip: TripDetail) => void
}

function CreatedContent({ trip, adminLink, onMembersChanged }: CreatedContentProps) {
  const adminFieldId = useId()
  const warningId = useId()

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] text-ink-muted">Viagem criada</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">{trip.title}</h1>
      </div>

      <section
        aria-labelledby="admin-heading"
        className="flex flex-col gap-3 rounded-panel border border-accent-line bg-surface-raised p-4 sm:p-5"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <h2 id="admin-heading" className="text-base font-semibold">
            Guarde o link de administração
          </h2>
        </div>
        <p id={warningId} className="text-sm leading-normal text-ink-soft">
          Este link é a única forma de voltar a esta viagem como quem organiza: não há login nem recuperação. Salve num
          lugar seguro, como suas notas ou seus favoritos, e não compartilhe: quem tiver o link administra a viagem.
        </p>
        <label htmlFor={adminFieldId} className="text-[13px] font-medium text-ink-muted">
          Link de administração
        </label>
        <input
          id={adminFieldId}
          readOnly
          value={adminLink}
          aria-describedby={warningId}
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 w-full rounded border border-line-strong bg-surface px-3 font-mono text-[13px] text-ink"
        />
        <CopyButton
          label="Copiar link de administração"
          getText={() => adminLink}
          successMessage="Link copiado. Guarde num lugar seguro antes de sair desta página."
        />
      </section>

      <InvitesSection trip={trip} onMembersChanged={onMembersChanged} />

      <Link
        to={`/viagens/${trip.id}/tensoes`}
        className={buttonVariants({ size: 'lg', className: 'self-start text-[15px] hover:bg-accent-soft' })}
      >
        Ir para o mapa da viagem
      </Link>
    </>
  )
}

interface InvitesSectionProps {
  trip: TripDetail
  onMembersChanged: (trip: TripDetail) => void
}

function InvitesSection({ trip, onMembersChanged }: InvitesSectionProps) {
  const [names, setNames] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const namesId = useId()
  const hintId = useId()
  const errorId = useId()
  const remaining = MAX_MEMBERS - trip.members.length

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const list = names
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean)
    if (list.length === 0) {
      setError('Escreva pelo menos um nome.')
      return
    }
    setIsAdding(true)
    setError(null)
    try {
      const created = await createMembers(trip.id, { display_names: list })
      onMembersChanged({ ...trip, members: [...trip.members, ...created] })
      setNames('')
    } catch (caught) {
      setError(getErrorMessage(caught, 'Não foi possível criar os convites. Tente novamente.'))
    } finally {
      setIsAdding(false)
    }
  }

  function replaceMember(member: Member) {
    onMembersChanged({ ...trip, members: trip.members.map((item) => (item.id === member.id ? member : item)) })
  }

  return (
    <section aria-labelledby="invites-heading" className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="invites-heading" className="text-base font-semibold">
          Links de convite
        </h2>
        <p className="text-sm leading-normal text-ink-soft">
          Cada pessoa responde pelo próprio link, sem cadastro. Envie a cada uma o link com o nome dela.
        </p>
      </div>

      <ul className="flex flex-col">
        {trip.members.map((member) => (
          <InviteRow key={member.id} tripId={trip.id} member={member} onReissued={replaceMember} />
        ))}
      </ul>

      {remaining > 0 ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-line-subtle pt-4">
          <label htmlFor={namesId} className="text-[15px] font-medium">
            Convidar pessoas
          </label>
          <p id={hintId} className="text-[13px] text-ink-muted">
            Um nome por linha. Cabem mais {remaining} {remaining === 1 ? 'pessoa' : 'pessoas'} na viagem.
          </p>
          <textarea
            id={namesId}
            rows={3}
            value={names}
            onChange={(event) => {
              setNames(event.target.value)
              if (error) setError(null)
            }}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
            className="w-full resize-none rounded border border-line-strong bg-surface-sunken p-3 text-[15px] leading-[1.45] text-ink focus-visible:border-accent"
          />
          {error && <AlertMessage id={errorId}>{error}</AlertMessage>}
          <Button type="submit" variant="secondary" className="self-start" disabled={isAdding}>
            {isAdding && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {isAdding ? 'Criando convites…' : 'Criar convites'}
          </Button>
        </form>
      ) : (
        <p className="text-[13px] text-ink-muted">A viagem já tem o máximo de {MAX_MEMBERS} pessoas.</p>
      )}
    </section>
  )
}

interface InviteRowProps {
  tripId: string
  member: Member
  onReissued: (member: Member) => void
}

function InviteRow({ tripId, member, onReissued }: InviteRowProps) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fieldId = useId()
  const name = member.is_organizer ? `${member.display_name} (você)` : member.display_name

  async function handleReissue() {
    setIsWorking(true)
    setError(null)
    try {
      onReissued(await reissueInvite(tripId, member.id))
    } catch (caught) {
      setError(getErrorMessage(caught, 'Não foi possível gerar o link. Tente novamente.'))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b border-line-subtle py-3 first:pt-0 last:border-b-0 last:pb-0">
      {member.invite_token ? (
        <>
          <label htmlFor={fieldId} className="text-sm font-medium">
            {name}
          </label>
          <input
            id={fieldId}
            readOnly
            value={inviteUrl(member.invite_token)}
            onFocus={(event) => event.currentTarget.select()}
            className="h-11 w-full rounded border border-line-strong bg-surface-sunken px-3 font-mono text-[13px] text-ink"
          />
          <CopyButton
            label={`Copiar link de ${member.display_name}`}
            getText={() => inviteUrl(member.invite_token ?? '')}
            successMessage={`Link de ${member.display_name} copiado.`}
          />
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{name}</span>
          <p className="text-[13px] leading-normal text-ink-muted">
            O link não está guardado neste navegador. Gere um novo; o anterior deixa de valer.
          </p>
          {error && <AlertMessage>{error}</AlertMessage>}
          <Button variant="secondary" className="self-start" disabled={isWorking} onClick={handleReissue}>
            {isWorking ? 'Gerando…' : 'Gerar novo link'}
          </Button>
        </>
      )}
    </li>
  )
}
