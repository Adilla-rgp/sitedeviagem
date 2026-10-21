import type { ComponentProps } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'

const buttonVariants = tv({
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

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ variant, size, block, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonVariants({ variant, size, block, className })} {...props} />
}
