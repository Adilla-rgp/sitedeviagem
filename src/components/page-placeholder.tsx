import { useDocumentTitle } from '../lib/use-document-title'
import { BrandMark } from './brand-mark'

interface PagePlaceholderProps {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  useDocumentTitle(title)

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-5 py-6">
      <header>
        <BrandMark />
      </header>
      <main className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="text-sm text-ink-muted">{description}</p>
      </main>
    </div>
  )
}
