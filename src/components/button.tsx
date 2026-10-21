import type { ComponentProps } from 'react'
import type { VariantProps } from 'tailwind-variants'
import { buttonVariants } from './button-styles'

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ variant, size, block, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonVariants({ variant, size, block, className })} {...props} />
}
