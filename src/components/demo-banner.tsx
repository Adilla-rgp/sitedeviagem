import { demoPaths, resetDemo } from '../lib/demo'

export function DemoBanner() {
  return (
    <aside aria-label="Modo demonstração" className="border-b border-line bg-surface-sunken">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 px-4 text-xs text-ink-muted sm:px-8">
        <p className="py-1">Demonstração com dados de exemplo</p>
        {/* Link comum (não do Router): o navegador recarrega a página já com os dados reiniciados. */}
        <a
          href={demoPaths.tensions}
          onClick={resetDemo}
          className="flex min-h-11 items-center text-accent-soft underline underline-offset-2 hover:text-ink"
        >
          Reiniciar demonstração
        </a>
      </div>
    </aside>
  )
}
