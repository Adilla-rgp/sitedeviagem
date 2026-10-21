import { useEffect, useId, useRef, useState } from 'react'
import { formatList } from '../../lib/format'
import type { Member, TripTensions } from '../../types/api'
import { computeMapLayout } from './map-layout'
import { conflictPairs, CRITERION_LABEL, nameOf } from './tension-utils'

/** Largura usada no primeiro render, antes da medição. */
const DEFAULT_WIDTH = 480

function describeMap(members: Member[], tensions: TripTensions): string {
  const conflicts = conflictPairs(tensions)
  const pending = members.filter((member) => !member.responded_at).map((member) => member.display_name)
  const parts = [`Mapa de compatibilidade entre ${members.length} participantes.`]

  if (tensions.pairs.length === 0) {
    parts.push('Ainda não há pares para comparar.')
  } else if (conflicts.length === 0) {
    parts.push('Todos os pares que já responderam são compatíveis.')
  } else {
    const list = conflicts
      .map((pair) => `${nameOf(members, pair.member_a_id)} e ${nameOf(members, pair.member_b_id)} por ${CRITERION_LABEL[pair.criterion]}`)
      .join('; ')
    parts.push(`${conflicts.length === 1 ? 'Um conflito' : `${conflicts.length} conflitos`}: ${list}.`)
    if (conflicts.length < tensions.pairs.length) parts.push('Os demais pares são compatíveis.')
  }
  if (pending.length > 0) {
    parts.push(`${formatList(pending)} ${pending.length === 1 ? 'ainda não respondeu' : 'ainda não responderam'}.`)
  }
  return parts.join(' ')
}

function useRenderedWidth() {
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

interface TensionMapProps {
  members: Member[]
  tensions: TripTensions
}

export function TensionMap({ members, tensions }: TensionMapProps) {
  const titleId = useId()
  const { ref: svgRef, width } = useRenderedWidth()
  const layout = computeMapLayout(members, tensions, width)
  const positions = new Map(layout.nodes.map((node) => [node.member.id, node]))
  const conflicts = conflictPairs(tensions)

  return (
    <div className="flex flex-col gap-4">
      <svg
        ref={svgRef}
        viewBox={layout.viewBox}
        role="img"
        aria-labelledby={titleId}
        className="mx-auto block h-auto w-full max-w-[560px]"
      >
        <title id={titleId}>{describeMap(members, tensions)}</title>

        {tensions.pairs.map((pair) => {
          const a = positions.get(pair.member_a_id)
          const b = positions.get(pair.member_b_id)
          if (!a || !b) return null
          const isConflict = pair.status === 'conflict'
          return (
            <line
              key={`${pair.member_a_id}-${pair.member_b_id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={2}
              strokeDasharray={isConflict ? '6 5' : undefined}
              className={isConflict ? 'stroke-warn' : 'stroke-neutral-link'}
            />
          )
        })}

        {layout.nodes.map((node) => (
          <g key={node.member.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={layout.nodeRadius}
              strokeWidth={2}
              strokeDasharray={node.responded ? undefined : '5 4'}
              className={
                !node.responded
                  ? 'fill-bg stroke-neutral-link'
                  : node.isMostRestrictive
                    ? 'fill-warn-bg stroke-warn'
                    : 'fill-surface-raised stroke-neutral-link'
              }
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.round(layout.nodeRadius * 0.72)}
              fontWeight={600}
              className={node.responded ? 'fill-ink' : 'fill-ink-muted'}
              aria-hidden="true"
            >
              {node.member.display_name.charAt(0).toUpperCase()}
            </text>
            <text
              x={node.label.x}
              textAnchor={node.label.anchor}
              className={node.responded ? 'fill-ink' : 'fill-ink-muted'}
            >
              <tspan x={node.label.x} y={node.label.nameY} fontSize={layout.nameFontSize}>
                {node.member.display_name}
                {node.member.is_organizer && <tspan className="fill-ink-muted"> · você</tspan>}
              </tspan>
              {node.label.status && node.label.statusY !== null && (
                <tspan
                  x={node.label.x}
                  y={node.label.statusY}
                  fontSize={layout.statusFontSize}
                  className={node.label.status === 'mais limites' ? 'fill-warn' : 'fill-ink-muted'}
                >
                  {node.label.status}
                </tspan>
              )}
            </text>
          </g>
        ))}

        {layout.pills.map((pill) => (
          <g key={pill.key}>
            <rect
              x={pill.x - pill.width / 2}
              y={pill.y - layout.pillHeight / 2}
              width={pill.width}
              height={layout.pillHeight}
              rx={layout.pillHeight / 2}
              className="fill-warn-bg stroke-warn-line"
            />
            <text
              x={pill.x}
              y={pill.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={layout.pillFontSize}
              className="fill-warn"
            >
              {pill.text}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-neutral-link" />
          compatíveis
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-dashed border-warn" />
          conflito, com o critério
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full border-2 border-dashed border-neutral-link" />
          ainda não respondeu
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 className="text-[13px] font-medium text-ink-muted">Conflitos</h3>
        {conflicts.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {conflicts.map((pair) => (
              <li key={`${pair.member_a_id}-${pair.member_b_id}`}>
                {nameOf(members, pair.member_a_id)} e {nameOf(members, pair.member_b_id)}:{' '}
                <span className="text-warn">{CRITERION_LABEL[pair.criterion]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            {tensions.pairs.length === 0
              ? 'O mapa compara as respostas assim que pelo menos 2 pessoas responderem.'
              : 'Nenhum conflito entre quem já respondeu.'}
          </p>
        )}
      </div>
    </div>
  )
}
