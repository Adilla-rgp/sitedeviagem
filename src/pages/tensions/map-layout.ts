import type { Member, TripTensions } from '../../types/api'
import { conflictPairs, CRITERION_LABEL } from './tension-utils'

// Layout do mapa de tensões em pixels reais: o viewBox tem a largura medida do
// SVG, então os textos ficam sempre do mesmo tamanho e o círculo se ajusta ao
// espaço que sobra depois dos rótulos.

const NAME_PX = 13
const STATUS_PX = 12
const NAME_LINE_HEIGHT = 16
const STATUS_LINE_HEIGHT = 15
const PILL_FONT_PX = 12
const PILL_HEIGHT = 22
/** Largura média de um caractere em relação ao tamanho da fonte (estimativa). */
const CHAR_WIDTH_RATIO = 0.56
const LABEL_GAP = 8
const EDGE_MARGIN = 4
const MAX_RING_RADIUS = 170
/** Em telas estreitas o círculo vira elipse: o raio vertical pode chegar a esta fração da largura. */
const VERTICAL_RADIUS_RATIO = 0.42
const MAX_NODE_RADIUS = 28
const MIN_NODE_RADIUS = 18
/** A partir disso (em |sen|) o rótulo fica acima ou abaixo do nó, centralizado; abaixo, ao lado. */
const VERTICAL_LABEL_THRESHOLD = 0.5
/** Círculo menor que esta fração da largura: usa rótulos compactos, sem "aguardando". */
const COMPACT_BELOW_RATIO = 0.26
/** Posições candidatas da etiqueta ao longo da linha (0 = um nó, 1 = o outro). */
const PILL_POSITIONS = [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75]

export interface NodeLayout {
  member: Member
  x: number
  y: number
  responded: boolean
  isMostRestrictive: boolean
  label: {
    x: number
    anchor: 'start' | 'middle' | 'end'
    nameY: number
    statusY: number | null
    status: 'mais limites' | 'aguardando' | null
  }
}

export interface PillLayout {
  key: string
  x: number
  y: number
  width: number
  text: string
}

export interface MapLayout {
  viewBox: string
  nodeRadius: number
  pillHeight: number
  pillFontSize: number
  nameFontSize: number
  statusFontSize: number
  nodes: NodeLayout[]
  pills: PillLayout[]
}

function textWidth(text: string, fontSize: number) {
  return text.length * fontSize * CHAR_WIDTH_RATIO
}

interface LabelText {
  name: string
  status: NodeLayout['label']['status']
}

function labelWidth({ name, status }: LabelText) {
  return Math.max(textWidth(name, NAME_PX), status ? textWidth(status, STATUS_PX) : 0)
}

function isSideLabel(sin: number) {
  return Math.abs(sin) < VERTICAL_LABEL_THRESHOLD
}

function directions(total: number) {
  return Array.from({ length: total }, (_, index) => {
    if (total === 1) return { cos: 0, sin: 1 }
    // Primeiro participante no topo, os demais em sentido horário.
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
    return { cos: Math.cos(angle), sin: Math.sin(angle) }
  })
}

/** Maior raio do círculo em que todos os rótulos cabem na largura. */
function ringRadiusThatFits(width: number, labels: LabelText[], nodeRadius: number) {
  const half = width / 2 - EDGE_MARGIN
  const bounds = directions(labels.length).map(({ cos, sin }, index) => {
    const absCos = Math.abs(cos)
    if (absCos < 1e-6) return Infinity
    const needed = isSideLabel(sin) ? labelWidth(labels[index]) : labelWidth(labels[index]) / 2
    return (half - needed) / absCos - nodeRadius - LABEL_GAP
  })
  return Math.min(MAX_RING_RADIUS, ...bounds)
}

/** Menor distância entre nós vizinhos na elipse. */
function minNeighborDistance(radiusX: number, radiusY: number, total: number) {
  if (total < 2) return Infinity
  const points = directions(total).map(({ cos, sin }) => ({ x: radiusX * cos, y: radiusY * sin }))
  return Math.min(
    ...points.map((point, index) => {
      const next = points[(index + 1) % total]
      return Math.hypot(point.x - next.x, point.y - next.y)
    }),
  )
}

function verticalRadiusFor(width: number, radiusX: number) {
  return Math.max(radiusX, Math.min(MAX_RING_RADIUS, width * VERTICAL_RADIUS_RATIO))
}

function nodeRadiusFor(width: number, radiusX: number, total: number) {
  const distance = minNeighborDistance(radiusX, verticalRadiusFor(width, radiusX), total)
  return Math.max(MIN_NODE_RADIUS, Math.min(MAX_NODE_RADIUS, distance / 2 - 8))
}

/** Menor raio horizontal em que os nós não se encostam. */
function minRingRadius(width: number, nodeRadius: number, total: number) {
  if (total < 2) return 0
  let radius = nodeRadius
  while (radius < MAX_RING_RADIUS && minNeighborDistance(radius, verticalRadiusFor(width, radius), total) < 2 * nodeRadius + 12) {
    radius += 2
  }
  return radius
}

function labelsFor(members: Member[], tensions: TripTensions, compact: boolean): LabelText[] {
  return members.map((member) => ({
    name: member.is_organizer ? `${member.display_name} · você` : member.display_name,
    status:
      member.id === tensions.most_restrictive_member_id
        ? 'mais limites'
        : !member.responded_at && !compact
          ? 'aguardando'
          : null,
  }))
}

function distanceToSegment(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared))
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy))
}

export function computeMapLayout(members: Member[], tensions: TripTensions, width: number): MapLayout {
  const total = members.length

  // Tenta com rótulos completos; se o círculo ficar pequeno demais, tira o
  // "aguardando" (o nó tracejado e a legenda já dizem isso).
  let labels = labelsFor(members, tensions, false)
  let nodeRadius = MAX_NODE_RADIUS
  let ringRadius = ringRadiusThatFits(width, labels, nodeRadius)
  nodeRadius = nodeRadiusFor(width, ringRadius, total)
  ringRadius = ringRadiusThatFits(width, labels, nodeRadius)
  if (ringRadius < Math.max(minRingRadius(width, nodeRadius, total), width * COMPACT_BELOW_RATIO)) {
    labels = labelsFor(members, tensions, true)
    ringRadius = ringRadiusThatFits(width, labels, nodeRadius)
  }
  ringRadius = Math.max(ringRadius, minRingRadius(width, nodeRadius, total))
  const verticalRadius = verticalRadiusFor(width, ringRadius)

  const centerX = width / 2
  let minY = Infinity
  let maxY = -Infinity

  const nodes = directions(total).map<NodeLayout>(({ cos, sin }, index) => {
    const member = members[index]
    const text = labels[index]
    const x = centerX + ringRadius * cos
    const y = verticalRadius * sin
    const anchorX = centerX + (ringRadius + nodeRadius + LABEL_GAP) * cos
    const anchorY = (verticalRadius + nodeRadius + LABEL_GAP) * sin
    const isSide = isSideLabel(sin)
    const blockHeight = NAME_LINE_HEIGHT + (text.status ? STATUS_LINE_HEIGHT : 0)
    const blockWidth = labelWidth(text)

    const anchor = isSide ? (cos > 0 ? 'start' : 'end') : 'middle'
    const top = isSide ? anchorY - blockHeight / 2 : sin < 0 ? anchorY - blockHeight : anchorY
    const left = anchor === 'start' ? anchorX : anchor === 'end' ? anchorX - blockWidth : anchorX - blockWidth / 2
    // Se ainda assim não couber (muitos participantes num espaço estreito), desliza para dentro.
    const shift = Math.max(0, EDGE_MARGIN - left) - Math.max(0, left + blockWidth - (width - EDGE_MARGIN))

    minY = Math.min(minY, top, y - nodeRadius)
    maxY = Math.max(maxY, top + blockHeight, y + nodeRadius)

    return {
      member,
      x,
      y,
      responded: member.responded_at !== null,
      isMostRestrictive: member.id === tensions.most_restrictive_member_id,
      label: {
        x: anchorX + shift,
        anchor,
        nameY: top + NAME_PX,
        statusY: text.status ? top + NAME_LINE_HEIGHT + STATUS_PX : null,
        status: text.status,
      },
    }
  })

  const positions = new Map(nodes.map((node) => [node.member.id, node]))
  const placed: { x: number; y: number; width: number }[] = []
  const overlapsPill = (x: number, y: number, pillWidth: number) =>
    placed.some(
      (other) => Math.abs(other.x - x) < (other.width + pillWidth) / 2 + 4 && Math.abs(other.y - y) < PILL_HEIGHT + 2,
    )
  const overlapsNode = (x: number, y: number, pillWidth: number) =>
    nodes.some((node) => {
      // Distância do centro do nó ao retângulo da etiqueta.
      const dx = Math.max(Math.abs(node.x - x) - pillWidth / 2, 0)
      const dy = Math.max(Math.abs(node.y - y) - PILL_HEIGHT / 2, 0)
      return Math.hypot(dx, dy) < nodeRadius + 3
    })

  const conflictSegments = conflictPairs(tensions).flatMap((pair) => {
    const a = positions.get(pair.member_a_id)
    const b = positions.get(pair.member_b_id)
    return a && b ? [{ pair, a, b }] : []
  })
  // Etiqueta em cima de outra linha de conflito fica ambígua.
  const crossesOtherConflict = (x: number, y: number, pillWidth: number, own: (typeof conflictSegments)[number]) =>
    conflictSegments.some(
      (segment) => segment !== own && distanceToSegment(x, y, segment.a, segment.b) < Math.max(pillWidth / 2, PILL_HEIGHT) * 0.7,
    )

  const pills = conflictSegments.map<PillLayout>((segment) => {
    const { pair, a, b } = segment
    const text = CRITERION_LABEL[pair.criterion]
    const pillWidth = textWidth(text, PILL_FONT_PX) + 16
    const candidates = PILL_POSITIONS.map((t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
    const free = (point: { x: number; y: number }) =>
      !overlapsNode(point.x, point.y, pillWidth) && !overlapsPill(point.x, point.y, pillWidth)
    const spot =
      candidates.find((point) => free(point) && !crossesOtherConflict(point.x, point.y, pillWidth, segment)) ??
      candidates.find(free) ??
      candidates.find((point) => !overlapsNode(point.x, point.y, pillWidth)) ??
      candidates[0]
    placed.push({ ...spot, width: pillWidth })
    return { key: `${pair.member_a_id}-${pair.member_b_id}`, x: spot.x, y: spot.y, width: pillWidth, text }
  })

  const padding = 4
  return {
    viewBox: `0 ${minY - padding} ${width} ${maxY - minY + 2 * padding}`,
    nodeRadius,
    pillHeight: PILL_HEIGHT,
    pillFontSize: PILL_FONT_PX,
    nameFontSize: NAME_PX,
    statusFontSize: STATUS_PX,
    nodes,
    pills,
  }
}
