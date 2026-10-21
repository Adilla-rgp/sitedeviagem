import { Link } from 'react-router-dom'
import { BrandMark } from '../../components/brand-mark'
import { buttonVariants } from '../../components/button-styles'
import { brand } from '../../config/brand'
import { demoConfig } from '../../config/demo'
import { demoGuestName, demoPaths, demoSummary, resetDemo } from '../../lib/demo'
import { formatCount } from '../../lib/format'
import { useDocumentTitle } from '../../lib/use-document-title'

const steps = [
  {
    title: 'Cada um responde',
    text: 'Pelo celular, sem cadastro, em texto livre. A resposta vira limites e preferências que a pessoa confirma antes de enviar.',
  },
  {
    title: 'O motor calcula',
    text: 'Combina destinos e datas, descarta o que viola qualquer limite e recomenda o plano que equilibra a média do grupo com quem sairia pior.',
  },
  {
    title: 'Todos veem quem cedeu o quê',
    text: 'Satisfação de cada pessoa, a justificativa de cada concessão e a reação de cada um: aceito, aceito com ressalva ou recuso.',
  },
]

const linkClass = 'inline-flex min-h-11 items-center text-accent-soft underline underline-offset-2 hover:text-ink'

export function HomePage() {
  useDocumentTitle('Planejador de viagens em grupo')

  const tour = [
    {
      // Link comum (não do Router): recarrega a página já com os dados reiniciados.
      link: (
        <a href={demoPaths.tensions} onClick={resetDemo} className={linkClass}>
          Ver o mapa com {demoSummary.respondedCount} respostas
        </a>
      ),
      text: 'Ainda sem conflitos: as primeiras respostas são compatíveis entre si.',
    },
    {
      link: (
        <Link to={demoPaths.guestResponse} className={linkClass}>
          Responder como {demoGuestName}
        </Link>
      ),
      text: 'Escreva as condições em texto livre, revise a interpretação e confirme.',
    },
    {
      link: (
        <Link to={demoPaths.tensions} className={linkClass}>
          Voltar ao mapa e ver o conflito aparecer
        </Link>
      ),
      text: `Os limites de ${demoGuestName} entram em conflito com as preferências de outras pessoas.`,
    },
    {
      link: (
        <Link to={demoPaths.plans} className={linkClass}>
          Gerar os planos e mexer no α
        </Link>
      ),
      text: 'Veja o plano recomendado e como o critério de equilíbrio reordena as alternativas.',
    },
    {
      link: (
        <Link to={demoPaths.guestPlan} className={linkClass}>
          Reagir como {demoGuestName}
        </Link>
      ),
      text: 'Aceite, aceite com ressalva ou recuse. A organizadora vê a reação na tela de planos.',
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-5 pb-14 pt-6 sm:px-8">
      <header>
        <BrandMark />
      </header>

      <main className="flex flex-col gap-14">
        <section aria-labelledby="hero-heading" className="flex flex-col gap-5">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-accent-soft">
            Planejador de viagens em grupo
          </span>
          <h1 id="hero-heading" className="text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-4xl">
            Cada pessoa do grupo diz seus limites; o {brand.name} calcula o plano mais justo e mostra quem cedeu o quê.
          </h1>
          {demoConfig.enabled && (
            <div className="flex flex-col gap-2">
              <a
                href={demoPaths.tensions}
                onClick={resetDemo}
                className={buttonVariants({ size: 'lg', className: 'self-start text-[15px] hover:bg-accent-soft' })}
              >
                Ver demonstração
              </a>
              <p className="text-[13px] text-ink-muted">
                Começa do zero com a viagem de exemplo “{demoSummary.tripTitle}”:{' '}
                {formatCount(demoSummary.memberCount, 'pessoa', 'pessoas')},{' '}
                {formatCount(demoSummary.destinationCount, 'destino', 'destinos')} e{' '}
                {formatCount(demoSummary.respondedCount, 'resposta', 'respostas')}.
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby="how-heading" className="flex flex-col gap-5">
          <h2 id="how-heading" className="text-xl font-semibold">
            Como funciona
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-[18px]">
                <span className="font-mono text-[13px] font-medium text-accent-soft">{index + 1}</span>
                <h3 className="text-[15px] font-semibold">{step.title}</h3>
                <p className="text-sm leading-[1.45] text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="difference-heading" className="flex flex-col gap-3">
          <h2 id="difference-heading" className="text-xl font-semibold">
            Decisão justa e explicada, não votação
          </h2>
          <p className="text-[15px] leading-normal text-ink-soft">
            Enquetes escolhem o que a maioria quer e deixam alguém para trás sem explicação. Aqui, nenhum limite é
            violado, o critério de equilíbrio protege quem sairia pior e cada concessão vem com o motivo. A IA só
            interpreta o texto livre; a decisão é determinística: as mesmas respostas geram sempre o mesmo plano.
          </p>
          <p className="font-mono text-xs font-medium text-ink-muted">score = (1 − α) · média + α · pior</p>
        </section>

        {demoConfig.enabled && (
          <section
            aria-labelledby="tour-heading"
            className="flex flex-col gap-4 rounded-panel border border-line bg-surface-sunken p-5"
          >
            <h2 id="tour-heading" className="text-xl font-semibold">
              Roteiro da demonstração
            </h2>
            <ol className="flex flex-col gap-4">
              {tour.map((step, index) => (
                <li key={index} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 text-sm leading-[1.45]">
                  <span className="pt-3 font-mono text-[13px] font-medium text-ink-muted">{index + 1}.</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{step.link}</span>
                    <span className="text-ink-muted">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs leading-normal text-ink-muted">
              Os dados ficam só neste navegador. Use “Reiniciar demonstração”, no topo, para começar de novo.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
