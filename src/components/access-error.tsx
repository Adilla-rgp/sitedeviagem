import { Link } from 'react-router-dom'
import { buttonVariants } from './button-styles'

interface AccessErrorProps {
  message: string
}

/** Quem organiza sem o token de administração neste navegador (ou com um token que não vale). */
export function AccessError({ message }: AccessErrorProps) {
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">Sem acesso a esta viagem</h1>
      <p className="text-sm leading-normal text-ink-soft">{message}</p>
      <p className="text-sm leading-normal text-ink-muted">
        O link de administração é a única forma de voltar à viagem. Se você participa como convidado, use o link de
        convite que recebeu.
      </p>
      <Link to="/" className={buttonVariants({ variant: 'secondary', className: 'self-start hover:bg-surface' })}>
        Ir para o início
      </Link>
    </div>
  )
}
