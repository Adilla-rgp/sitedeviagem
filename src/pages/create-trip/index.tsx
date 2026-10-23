import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertMessage } from '../../components/alert-message'
import { BrandMark } from '../../components/brand-mark'
import { Button } from '../../components/button'
import { demoConfig } from '../../config/demo'
import { createTrip, getDestinations, getErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { useDocumentTitle } from '../../lib/use-document-title'
import type { Climate, Destination } from '../../types/api'

const MIN_DESTINATIONS = 2
const MAX_DESTINATIONS = 4
const DEFAULT_NIGHTS = 6
const MAX_NIGHTS = 30
const DAY_MS = 24 * 60 * 60 * 1000

const CLIMATE_LABEL: Record<Climate, string> = { hot: 'quente', mild: 'ameno', cold: 'frio' }

type Field = 'title' | 'organizer' | 'destinations' | 'start' | 'end' | 'nights'
type Errors = Partial<Record<Field, string>>

interface FormValues {
  title: string
  organizer: string
  destinationIds: string[]
  start: string
  end: string
  nights: string
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS)
}

function validate(values: FormValues): Errors {
  const errors: Errors = {}
  const nights = Number(values.nights)
  if (!values.title.trim()) errors.title = 'Dê um nome à viagem.'
  if (!values.organizer.trim()) errors.organizer = 'Informe o seu nome.'
  if (values.destinationIds.length < MIN_DESTINATIONS || values.destinationIds.length > MAX_DESTINATIONS) {
    errors.destinations = `Escolha de ${MIN_DESTINATIONS} a ${MAX_DESTINATIONS} destinos.`
  }
  if (!values.start) errors.start = 'Informe o primeiro dia possível.'
  if (!values.end) errors.end = 'Informe o último dia possível.'
  if (!Number.isInteger(nights) || nights < 1 || nights > MAX_NIGHTS) {
    errors.nights = `Informe de 1 a ${MAX_NIGHTS} noites.`
  }
  if (values.start && values.end && !errors.nights) {
    if (daysBetween(values.start, values.end) <= 0) errors.end = 'O último dia precisa vir depois do primeiro.'
    else if (daysBetween(values.start, values.end) < nights) {
      errors.end = `A janela tem ${daysBetween(values.start, values.end)} dias, menos que as ${nights} noites da viagem.`
    }
  }
  return errors
}

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; destinations: Destination[] }

export function CreateTripPage() {
  useDocumentTitle('Criar viagem')
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [values, setValues] = useState<FormValues>({
    title: '',
    organizer: '',
    destinationIds: [],
    start: '',
    end: '',
    nights: String(DEFAULT_NIGHTS),
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const ids = {
    title: useId(),
    organizer: useId(),
    destinations: useId(),
    start: useId(),
    end: useId(),
    nights: useId(),
    windowHint: useId(),
  }

  useEffect(() => {
    let active = true
    setCatalog({ status: 'loading' })
    getDestinations().then(
      (destinations) => {
        if (active) setCatalog({ status: 'ready', destinations })
      },
      () => {
        if (active) setCatalog({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [attempt])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function toggleDestination(id: string) {
    update(
      'destinationIds',
      values.destinationIds.includes(id)
        ? values.destinationIds.filter((item) => item !== id)
        : [...values.destinationIds, id],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) {
      summaryRef.current?.focus()
      return
    }

    setIsSaving(true)
    try {
      const created = await createTrip({
        title: values.title.trim(),
        organizer_name: values.organizer.trim(),
        destination_ids: values.destinationIds,
        date_window_start: values.start,
        date_window_end: values.end,
        nights: Number(values.nights),
      })
      navigate(`/viagens/${created.id}/criada`, { state: { adminUrl: created.admin_url } })
    } catch (caught) {
      setSubmitError(getErrorMessage(caught, 'Não foi possível criar a viagem. Tente novamente.'))
      summaryRef.current?.focus()
    } finally {
      setIsSaving(false)
    }
  }

  const errorList = Object.values(errors)
  const nights = Number(values.nights) || DEFAULT_NIGHTS
  const inputClass =
    'h-11 w-full rounded border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted focus-visible:border-accent aria-[invalid=true]:border-ink-soft'

  function fieldError(field: Field) {
    const message = errors[field]
    return message ? (
      <p id={`${ids[field]}-error`} className="text-[13px] text-ink-soft">
        {message}
      </p>
    ) : null
  }

  function describedBy(field: Field, ...extra: string[]) {
    return [...extra, errors[field] ? `${ids[field]}-error` : ''].filter(Boolean).join(' ') || undefined
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-10 pt-5 sm:px-8">
      <header>
        <BrandMark />
      </header>
      <main className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">Criar viagem</h1>
          <p className="text-sm leading-normal text-ink-muted">
            Defina os destinos candidatos e a janela de datas. Depois, cada pessoa do grupo diz os próprios limites e
            preferências pelo link de convite.
          </p>
          {demoConfig.enabled && (
            <p className="text-[13px] leading-normal text-ink-muted">
              No modo demonstração, a viagem fica só neste navegador e o motor só tem cálculos para a viagem de exemplo.
            </p>
          )}
        </div>

        <div ref={summaryRef} tabIndex={-1} className="flex flex-col gap-2 focus-visible:outline-none">
          {errorList.length > 0 && (
            <AlertMessage>{`Confira o formulário: ${errorList.map((item) => item.replace(/\.$/, '')).join('; ')}.`}</AlertMessage>
          )}
          {submitError && <AlertMessage>{submitError}</AlertMessage>}
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.title} className="text-[15px] font-medium">
              Nome da viagem
            </label>
            <input
              id={ids.title}
              value={values.title}
              maxLength={120}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Ex.: Feriado de julho"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy('title')}
              className={inputClass}
            />
            {fieldError('title')}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.organizer} className="text-[15px] font-medium">
              Seu nome
            </label>
            <input
              id={ids.organizer}
              value={values.organizer}
              maxLength={60}
              autoComplete="given-name"
              onChange={(event) => update('organizer', event.target.value)}
              aria-invalid={errors.organizer ? true : undefined}
              aria-describedby={describedBy('organizer')}
              className={inputClass}
            />
            {fieldError('organizer')}
          </div>

          <fieldset
            aria-describedby={describedBy('destinations', `${ids.destinations}-hint`)}
            className="flex flex-col gap-2"
          >
            <legend className="text-[15px] font-medium">Destinos candidatos</legend>
            <p id={`${ids.destinations}-hint`} className="text-[13px] text-ink-muted">
              Escolha de {MIN_DESTINATIONS} a {MAX_DESTINATIONS}. Custo estimado por pessoa com {nights}{' '}
              {nights === 1 ? 'noite' : 'noites'}.
            </p>
            {catalog.status === 'loading' && (
              <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Carregando destinos…
              </p>
            )}
            {catalog.status === 'error' && (
              <div className="flex flex-col gap-2">
                <AlertMessage>Não foi possível carregar os destinos.</AlertMessage>
                <Button variant="secondary" className="self-start" onClick={() => setAttempt((value) => value + 1)}>
                  Tentar novamente
                </Button>
              </div>
            )}
            {catalog.status === 'ready' && (
              <ul className="flex flex-col gap-2">
                {catalog.destinations.map((destination) => {
                  const checked = values.destinationIds.includes(destination.id)
                  const inputId = `${ids.destinations}-${destination.id}`
                  return (
                    <li key={destination.id}>
                      <label
                        htmlFor={inputId}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded border px-3 py-2.5 ${
                          checked ? 'border-accent-line bg-surface-raised' : 'border-line bg-surface'
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDestination(destination.id)}
                          className="size-4 shrink-0 accent-accent"
                        />
                        <span className="flex flex-1 flex-col gap-0.5">
                          <span className="text-sm">
                            {destination.name} <span className="text-ink-muted">· {destination.state}</span>
                          </span>
                          <span className="text-xs text-ink-muted">
                            Clima {CLIMATE_LABEL[destination.climate]} · {destination.tags.join(', ')}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[13px] font-medium">
                          {formatCurrency(destination.fixed_cost + nights * destination.nightly_cost)}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            {fieldError('destinations')}
          </fieldset>

          <fieldset aria-describedby={ids.windowHint} className="flex flex-col gap-2">
            <legend className="text-[15px] font-medium">Janela de datas</legend>
            <p id={ids.windowHint} className="text-[13px] text-ink-muted">
              O período em que a viagem pode acontecer. O motor escolhe o dia de ida dentro dele.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={ids.start} className="text-sm">
                  Primeiro dia possível
                </label>
                <input
                  id={ids.start}
                  type="date"
                  value={values.start}
                  onChange={(event) => update('start', event.target.value)}
                  aria-invalid={errors.start ? true : undefined}
                  aria-describedby={describedBy('start')}
                  className={inputClass}
                />
                {fieldError('start')}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={ids.end} className="text-sm">
                  Último dia possível
                </label>
                <input
                  id={ids.end}
                  type="date"
                  value={values.end}
                  min={values.start || undefined}
                  onChange={(event) => update('end', event.target.value)}
                  aria-invalid={errors.end ? true : undefined}
                  aria-describedby={describedBy('end')}
                  className={inputClass}
                />
                {fieldError('end')}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.nights} className="text-[15px] font-medium">
              Noites
            </label>
            <p id={`${ids.nights}-hint`} className="text-[13px] text-ink-muted">
              Duração do roteiro padrão. O motor também testa um roteiro curto, com 2 noites a menos.
            </p>
            <input
              id={ids.nights}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_NIGHTS}
              value={values.nights}
              onChange={(event) => update('nights', event.target.value)}
              aria-invalid={errors.nights ? true : undefined}
              aria-describedby={describedBy('nights', `${ids.nights}-hint`)}
              className={`${inputClass} max-w-32 font-mono`}
            />
            {fieldError('nights')}
          </div>

          <Button type="submit" size="lg" className="self-start text-[15px]" disabled={isSaving}>
            {isSaving && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {isSaving ? 'Criando…' : 'Criar viagem'}
          </Button>
        </form>
      </main>
    </div>
  )
}
