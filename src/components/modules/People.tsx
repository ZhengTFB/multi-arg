import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Item, Member } from '../../lib/types'
import { initial } from '../../lib/color'
import { t } from '../../lib/copy'

interface Props {
  items: Item[]
  members: Member[]
  onAddRelation: (from: string, to: string, label: string) => void
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
const PAPER_W = 760
const PAPER_H = 760
const CX = PAPER_W / 2
const CY = PAPER_H / 2

/** 按人数绕中心排一圈，谁也不会被挤成一条线；半径跟着可视宽度走 */
function radial(nodes: Node[], viewW: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  const n = nodes.length
  const base = Math.min(240, Math.max(90, (viewW - 150) / 2))
  const radius = Math.min(280, base + Math.max(0, n - 4) * 20)

  nodes.forEach((node, index) => {
    if (n === 1) {
      out.set(node.id, { x: CX, y: CY })
      return
    }
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2
    out.set(node.id, { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius })
  })
  return out
}

export function People({ items, members, onAddRelation }: Props) {
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [picked, setPicked] = useState<string[]>([])
  const [label, setLabel] = useState('')
  const dragRef = useRef<{
    id: string
    x: number
    y: number
    baseX: number
    baseY: number
    moved: boolean
  } | null>(null)
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [viewW, setViewW] = useState(330)

  const { nodes, edges, pos } = useMemo(() => {
    const colorOf = new Map(members.map((m) => [m.id, m.color]))
    const byName = new Map<string, Node>()

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
          if (!byName.has(end)) byName.set(end, { id: end, name: end, color: '#7A6658' })
        }
      }
    }

    const nodeList = [...byName.values()]
    const edgeList: Edge[] = items.flatMap((item) => item.relations ?? [])
    return { nodes: nodeList, edges: edgeList, pos: radial(nodeList, viewW) }
  }, [items, members, viewW])

  // 记一下可视宽度，半径按它算，避免节点跑到画布外面
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewW(el.clientWidth))
    ro.observe(el)
    setViewW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // 画布比可视区大，进来先把视角挪到中心
  useEffect(() => {
    const el = canvasRef.current
    if (!el || nodes.length === 0) return
    el.scrollLeft = CX - el.clientWidth / 2
    el.scrollTop = CY - el.clientHeight / 2
  }, [nodes.length > 0, viewW])

  const at = (id: string) => {
    const base = pos.get(id)
    if (!base) return null
    const off = offsets[id] ?? { x: 0, y: 0 }
    return { x: base.x + off.x, y: base.y + off.y }
  }

  const togglePick = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((n) => n !== id)
      if (prev.length >= 2) return [id]
      return [...prev, id]
    })
    setLabel('')
  }

  const startDrag = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    const off = offsets[id] ?? { x: 0, y: 0 }
    dragRef.current = { id, x: e.clientX, y: e.clientY, baseX: off.x, baseY: off.y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }

  const moveDrag = (e: ReactPointerEvent<SVGGElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
    if (!d.moved) return
    setOffsets((prev) => ({ ...prev, [d.id]: { x: d.baseX + dx, y: d.baseY + dy } }))
  }

  const endDrag = () => {
    const d = dragRef.current
    dragRef.current = null
    if (d && !d.moved) togglePick(d.id)
  }

  // 空白处按住可以拖着画布走
  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = canvasRef.current
    if (!el) return
    panRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const movePan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = panRef.current
    const el = canvasRef.current
    if (!p || !el) return
    el.scrollLeft = p.left - (e.clientX - p.x)
    el.scrollTop = p.top - (e.clientY - p.y)
  }

  const endPan = () => {
    panRef.current = null
  }

  const commitRelation = () => {
    if (picked.length < 2) return
    onAddRelation(picked[0], picked[1], label.trim())
    setPicked([])
    setLabel('')
  }

  return (
    <div className="module">
      <div className="module-head">
        <span>
          {nodes.length} 人 · {edges.length} 条关系
        </span>
        {picked.length === 0 && <span className="people-hint">点两个人连一条线 · 空白处可拖动</span>}
      </div>

      {picked.length > 0 && (
        <div className="rel-card">
          <p className="rel-pair">
            {picked[0]} <span>→</span> {picked[1] ?? '…'}
          </p>
          {picked.length === 2 ? (
            <div className="rel-input">
              <input
                value={label}
                autoFocus
                placeholder="他们的关系，比如 同乡 / 上下级"
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitRelation()
                  if (e.key === 'Escape') setPicked([])
                }}
              />
              <button type="button" className="rel-ok" onClick={commitRelation}>
                添加
              </button>
              <button type="button" className="rel-cancel" onClick={() => setPicked([])}>
                取消
              </button>
            </div>
          ) : (
            <p className="rel-tip">再点一个人</p>
          )}
        </div>
      )}

      {nodes.length === 0 ? (
        <p className="feed-empty">{t('people.empty')}</p>
      ) : (
        <div
          className="people-canvas"
          ref={canvasRef}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <svg
            width={PAPER_W}
            height={PAPER_H}
            viewBox={`0 0 ${PAPER_W} ${PAPER_H}`}
            role="img"
            aria-label="人物关系图"
          >
            {edges.map((e, i) => {
              const s = at(e.from)
              const t2 = at(e.to)
              if (!s || !t2) return null
              const x1 = s.x
              const y1 = s.y
              const x2 = t2.x
              const y2 = t2.y
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
                    stroke="#FFFDF9"
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {e.label}
                  </text>
                </g>
              )
            })}

            {nodes.map((n) => {
              const p = at(n.id)
              if (!p) return null
              const x = p.x - NODE_W / 2
              const y = p.y - NODE_H / 2
              const active = picked.includes(n.id)
              return (
                <g
                  key={n.id}
                  className="people-node"
                  data-active={active}
                  onPointerDown={(e) => startDrag(e, n.id)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <title>{n.note ? `${n.name} · ${n.note}` : n.name}</title>
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={14}
                    ry={14}
                    fill={active ? '#F3ECE2' : '#FFFFFF'}
                    stroke={n.color}
                    strokeWidth={active ? 2.5 : 1.5}
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
      )}
    </div>
  )
}
