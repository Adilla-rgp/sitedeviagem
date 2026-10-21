import { useEffect, useId, useRef, useState } from 'react'
import { formatList } from '../../lib/format'
import type { Member, TripTensions } from '../../types/api'
import { conflictPairs, CRITERION_LABEL, nameOf } from './tension-utils'

// Geometria em unidades do viewBox; o SVG escala com a largura disponível.
const VIEW_WIDTH = 400
const VIEW_HEIGHT = 380
const CENTER_X = 200
const CENTER_Y = 192
const RING_RADIUS = 128
const NODE_RADIUS = 26
/** Largura de referência para o primeiro render, antes da medição. */
const DEFAULT_RENDERED_WIDTH = 480

// Textos em pixels reais: convertidos para unidades do viewBox pela escala
// atual, para continuarem legíveis quando o desenho encolhe no celular.
const LABEL_PX = 13
const INITIAL_PX = 20
const PILL_FONT_PX = 12
const PILL_HEIGHT_PX = 22
/** Largura média de um caractere em relação ao tamanho da fonte (estimativa). */
const CHAR_WIDTH_RATIO = 0.56

interface Point {
  x: number
  y: number
}

function nodePosition(index: number, total: number): Point & { isUpper: boolean } {
  if (total === 1) return { x: CENTER_X, y: CENTER_Y, isUpper: false }
  // Primeiro participante no topo, os demais em sentido horário.
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
  return {
    x: CENTER_X + RING_RADIUS * Math.cos(angle),
    y: CENTER_Y + RING_RADIUS * Math.sin(angle),
    isUpper: Math.sin(angle) < -0.1,
  }
}

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

interface TensionMapProps {
  members: Member[]
  tensions: TripTensions
}

/** Unidades do viewBox por pixel renderizado. */
function useViewBoxScale() {
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(DEFAULT_RENDERED_WIDTH)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, scale: VIEW_WIDTH / width }
}

/** Centraliza um texto em x sem deixar que ele saia do viewBox. */
function clampTextX(x: number, text: string, fontSize: number): number {
  const half = (text.length * fontSize * CHAR_WIDTH_RATIO) / 2
  return Math.min(Math.max(x, half), VIEW_WIDTH - half)
}

export function TensionMap({ members, tensions }: TensionMapProps) {
  const titleId = useId()
  const { ref: svgRef, scale } = useViewBoxScale()
  const labelSize = LABEL_PX * scale
  const initialSize = Math.min(INITIAL_PX * scale, NODE_RADIUS * 0.9)
  const pillFontSize = PILL_FONT_PX * scale
  const pillHeight = PILL_HEIGHT_PX * scale
  const positions = new Map(members.map((member, index) => [member.id, nodePosition(index, members.length)]))
  const conflicts = conflictPairs(tensions)

  return (
    <div className="flex flex-col gap-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        className="mx-auto block h-auto w-full max-w-[480px]"
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

        {conflicts.map((pair) => {
          const a = positions.get(pair.member_a_id)
          const b = positions.get(pair.member_b_id)
          if (!a || !b) return null
          const label = CRITERION_LABEL[pair.criterion]
          const width = label.length * pillFontSize * CHAR_WIDTH_RATIO + pillFontSize * 1.4
          const x = (a.x + b.x) / 2
          const y = (a.y + b.y) / 2
          return (
            <g key={`label-${pair.member_a_id}-${pair.member_b_id}`}>
              <rect
                x={x - width / 2}
                y={y - pillHeight / 2}
                width={width}
                height={pillHeight}
                rx={pillHeight / 2}
                className="fill-warn-bg stroke-warn-line"
              />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={pillFontSize} className="fill-warn">
                {label}
              </text>
            </g>
          )
        })}

        {members.map((member) => {
          const position = positions.get(member.id)
          if (!position) return null
          const responded = member.responded_at !== null
          const isMostRestrictive = member.id === tensions.most_restrictive_member_id
          const labelY = position.isUpper
            ? position.y - NODE_RADIUS - labelSize * 0.6
            : position.y + NODE_RADIUS + labelSize * 1.3
          const labelText = [
            member.display_name,
            member.is_organizer && ' · você',
            isMostRestrictive && ' · mais limites',
            !responded && ' · aguardando',
          ]
            .filter(Boolean)
            .join('')

          return (
            <g key={member.id}>
              <circle
                cx={position.x}
                cy={position.y}
                r={NODE_RADIUS}
                strokeWidth={2}
                strokeDasharray={responded ? undefined : '5 4'}
                className={
                  !responded
                    ? 'fill-bg stroke-neutral-link'
                    : isMostRestrictive
                      ? 'fill-warn-bg stroke-warn'
                      : 'fill-surface-raised stroke-neutral-link'
                }
              />
              <text
                x={position.x}
                y={position.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={initialSize}
                fontWeight={600}
                className={responded ? 'fill-ink' : 'fill-ink-muted'}
                aria-hidden="true"
              >
                {member.display_name.charAt(0).toUpperCase()}
              </text>
              <text
                x={clampTextX(position.x, labelText, labelSize)}
                y={labelY}
                textAnchor="middle"
                fontSize={labelSize}
                className={responded ? 'fill-ink' : 'fill-ink-muted'}
              >
                {member.display_name}
                {member.is_organizer && <tspan className="fill-ink-muted"> · você</tspan>}
                {isMostRestrictive && <tspan className="fill-warn"> · mais limites</tspan>}
                {!responded && ' · aguardando'}
              </text>
            </g>
          )
        })}
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
