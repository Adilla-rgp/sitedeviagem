import { BrandMark } from '../../components/brand-mark'

export type RespondStep = 1 | 2 | 3

const TOTAL_STEPS = 3

const progressWidth: Record<RespondStep, string> = {
  1: 'w-1/3',
  2: 'w-2/3',
  3: 'w-full',
}

interface InviteHeaderProps {
  step?: RespondStep
}

export function InviteHeader({ step }: InviteHeaderProps) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex min-h-5 items-center justify-between">
        <BrandMark />
        {step && (
          <span className="text-[13px] text-ink-muted">
            Etapa {step} de {TOTAL_STEPS}
          </span>
        )}
      </div>
      {step && (
        <div className="flex h-1 rounded-full bg-line" aria-hidden="true">
          <div className={`rounded-full bg-accent transition-[width] motion-reduce:transition-none ${progressWidth[step]}`} />
        </div>
      )}
    </header>
  )
}
