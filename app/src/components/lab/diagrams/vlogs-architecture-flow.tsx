/**
 * VictoriaLogs — Mode 1: Kiến trúc & Luồng.
 * Gộp animated data-flow + clickable explorer trong 1 sơ đồ SVG (DRY).
 * D3-free: toạ độ tính bằng số học (math only); Framer Motion sở hữu mọi animation.
 * Click box → panel chi tiết; toggle single ⟷ cluster.
 */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { VLOGS_COMPONENTS, type VLogsComponent } from './vlogs-mock-data'

const VIEW_W = 760
const VIEW_H = 150
const MARGIN_X = 80
const BOX_W = 116
const BOX_H = 52
const CENTER_Y = 60

// Thứ tự luồng ingest (trái → phải). vmui là điểm đọc cuối.
const SINGLE_ORDER = ['source', 'collector', 'victoria-logs', 'vmui']
const CLUSTER_ORDER = ['source', 'collector', 'vlinsert', 'vlstorage', 'vlselect', 'vmui']

function shortLabel(label: string): string {
  return label.split(' (')[0]
}

function layout(ids: string[]): (VLogsComponent & { x: number; cx: number })[] {
  const step = ids.length > 1 ? (VIEW_W - 2 * MARGIN_X) / (ids.length - 1) : 0
  return ids
    .map((id, i) => {
      const comp = VLOGS_COMPONENTS.find((c) => c.id === id)
      if (!comp) return null
      const cx = MARGIN_X + i * step
      return { ...comp, cx, x: cx - BOX_W / 2 }
    })
    .filter(Boolean) as (VLogsComponent & { x: number; cx: number })[]
}

export function VlogsArchitectureFlow() {
  const reduce = useReducedMotion()
  const [topology, setTopology] = useState<'single' | 'cluster'>('single')
  const [selected, setSelected] = useState<string>('victoria-logs')

  const nodes = useMemo(
    () => layout(topology === 'single' ? SINGLE_ORDER : CLUSTER_ORDER),
    [topology],
  )
  const selectedNode = nodes.find((n) => n.id === selected) ?? nodes[0]
  const dotKeyframes = nodes.map((n) => n.cx)

  return (
    <div className="space-y-4">
      {/* Toggle topology */}
      <div className="flex items-center gap-2">
        {(['single', 'cluster'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTopology(t)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              topology === t
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {t === 'single' ? 'Single-node' : 'Cluster'}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">Chạm vào ô để xem chi tiết</span>
      </div>

      {/* SVG flow */}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full" role="img" aria-label={`Sơ đồ luồng log VictoriaLogs (${topology})`}>
        {/* connectors */}
        {nodes.slice(0, -1).map((n, i) => {
          const next = nodes[i + 1]
          return (
            <line
              key={`c-${n.id}`}
              x1={n.cx + BOX_W / 2 - 4}
              y1={CENTER_Y}
              x2={next.cx - BOX_W / 2 + 4}
              y2={CENTER_Y}
              className="stroke-border"
              strokeWidth={2}
              markerEnd="url(#vl-arrow)"
            />
          )
        })}
        <defs>
          <marker id="vl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
          </marker>
        </defs>

        {/* animated dot (Framer Motion) */}
        {!reduce && dotKeyframes.length > 1 && (
          <motion.circle
            r={5}
            cy={CENTER_Y}
            className="fill-primary"
            animate={{ cx: dotKeyframes }}
            transition={{ duration: dotKeyframes.length * 0.9, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* boxes */}
        {nodes.map((n) => {
          const active = n.id === selected
          return (
            <g key={n.id} onClick={() => setSelected(n.id)} className="cursor-pointer">
              <rect
                x={n.x}
                y={CENTER_Y - BOX_H / 2}
                width={BOX_W}
                height={BOX_H}
                rx={8}
                className={cn(
                  'transition-colors',
                  active ? 'fill-primary/10 stroke-primary' : 'fill-card stroke-border hover:stroke-primary/50',
                )}
                strokeWidth={active ? 2 : 1.5}
              />
              <text x={n.cx} y={CENTER_Y - 3} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                {shortLabel(n.label)}
              </text>
              <text x={n.cx} y={CENTER_Y + 13} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {n.port === '—' ? '' : n.port.replace(/ .*$/, '')}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Detail panel */}
      {selectedNode && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{selectedNode.label}</h4>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {selectedNode.port}
            </span>
          </div>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: selectedNode.role }} />
          {selectedNode.config && (
            <p
              className="text-xs text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:break-all"
              dangerouslySetInnerHTML={{ __html: selectedNode.config }}
            />
          )}
        </div>
      )}
    </div>
  )
}
