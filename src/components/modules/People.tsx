import { useMemo } from 'react'
import dagre from 'dagre'
import type { Item, Member } from '../../lib/types'
import { initial } from '../../lib/color'

interface Props {
  items: Item[]
  members: Member[]
}

interface Node {
  id: string
  name: string
  note?: string
  color: string
}

interface Edge {
  from: string
  to: string
  label: string
}

const NODE_W = 120
const NODE_H = 48

export function People({ items, members }: Props) {
  const { nodes, edges, width, height, pos } = useMemo(() => {
    const colorOf = new Map(members.map((m) => [m.id, m.color]))
    const byName = new Map<string, Node>()

    // 先建人物节点，作者色优先；关系里出现但没建过的人再补灰，不然顺序会决定颜色
    for (const item of items) {
      if (item.type !== 'person' || !item.person) continue
      const name = item.person.name
      if (byName.has(name)) continue
      byName.set(name, {
        id: name,
        name,
        note: item.person.note,
        color: colorOf.get(item.authorId) ?? '#5C4033',
      })
    }

    for (const item of items) {
      for (const rel of item.relations ?? []) {
        for (const end of [rel.from, rel.to]) {
          if (!byName.has(end)) {
            byName.set(end, { id: end, name: end, color: '#7A6658' })
          }
        }
      }
    }

    const nodeList = [...byName.values()]
    const edgeList: Edge[] = items.flatMap((item) => item.relations ?? [])

    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 26, ranksep: 54, marginx: 14, marginy: 14 })
    g.setDefaultEdgeLabel(() => ({}))
    for (const n of nodeList) g.setNode(n.id, { width: NODE_W, height: NODE_H })
    edgeList.forEach((e, i) => g.setEdge(e.from, e.to, { id: `e${i}` }))
    dagre.layout(g)

    const w = Math.max(240, g.graph().width ?? 240)
    const h = Math.max(160, g.graph().height ?? 160)
    const positions = new Map<string, { x: number; y: number }>()
    for (const n of nodeList) {
      const p = g.node(n.id)
      if (p) positions.set(n.id, { x: p.x, y: p.y })
    }

    return { nodes: nodeList, edges: edgeList, width: w, height: h, pos: positions }
  }, [items, members])

  if (nodes.length === 0) {
    return (
      <div className="module">
        <p className="feed-empty">加第一个人。</p>
      </div>
    )
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>{nodes.length} 人 · {edges.length} 条关系</span>
      </div>
      <div className="people-canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 360 }}
          role="img"
          aria-label="人物关系图"
        >
          {edges.map((e, i) => {
            const s = pos.get(e.from)
            const t = pos.get(e.to)
            if (!s || !t) return null
            const x1 = s.x + NODE_W / 2
            const y1 = s.y
            const x2 = t.x - NODE_W / 2
            const y2 = t.y
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            return (
              <g key={`${e.from}-${e.to}-${i}`}>
                <path
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#C4B5A5"
                  strokeWidth={1.5}
                />
                <text
                  x={mx}
                  y={my - 5}
                  textAnchor="middle"
                  className="people-edge-label"
                  stroke="#FFFFFF"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {e.label}
                </text>
              </g>
            )
          })}

          {nodes.map((n) => {
            const p = pos.get(n.id)
            if (!p) return null
            const x = p.x - NODE_W / 2
            const y = p.y - NODE_H / 2
            return (
              <g key={n.id}>
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={14}
                  ry={14}
                  fill="#FFFFFF"
                  stroke={n.color}
                  strokeWidth={1.5}
                />
                <circle cx={x + 25} cy={p.y} r={12} fill={n.color} />
                <text x={x + 25} y={p.y + 4} textAnchor="middle" className="people-node-ini">
                  {initial(n.name)}
                </text>
                <text x={x + 44} y={p.y + 4} className="people-node-name">
                  {n.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
