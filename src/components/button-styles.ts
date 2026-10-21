import { tv } from 'tailwind-variants'

// Separado de button.tsx para que links (<Link>) possam usar o mesmo visual.
export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 rounded font-sans transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  variants: {
    variant: {
      primary: 'bg-accent font-semibold text-bg enabled:hover:bg-accent-soft',
      secondary: 'border border-line-strong font-normal text-ink enabled:hover:bg-surface',
      ghost: 'text-ink-muted enabled:hover:bg-surface-raised enabled:hover:text-ink',
    },
    size: {
      lg: 'h-12 px-5 text-base',
      md: 'h-11 px-4 text-[15px]',
      icon: 'size-11 shrink-0',
    },
    block: {
      true: 'w-full',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})
