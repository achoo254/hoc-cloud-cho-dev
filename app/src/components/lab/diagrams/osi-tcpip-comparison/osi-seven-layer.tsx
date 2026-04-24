'use client'

/**
 * OSI 7-Layer Detail + TCP/IP Side-by-Side (Mô hình #4 / Image #4).
 *
 * Layout (trái → phải):
 *   Host/Media bracket | PDU column (Data/Segments/Packets/Frames/Bits)
 *   | OSI 7 rows (name + desc) | TCP/IP 4 blocks | Application/Data Flow bracket
 *
 * Animation: reveal bottom-up (Physical → Application), sau đó fade-in
 *            TCP/IP column + brackets. Loop với Play/Pause/Reset.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import {
  OSI_LAYERS,
  TCPIP_LAYERS,
  OSI_GROUPS,
  TCPIP_GROUPS,
} from './constants'
import { InfoPanel, type Selection } from './info-panel'

const W = 900
const H = 640
const HEADER_Y = 30
const CONTENT_Y = 60
const ROW_H = 76
const ROW_GAP = 6

// Columns
const BRACKET_L_X = 12
const BRACKET_L_W = 23
const PDU_X = 50
const PDU_W = 80
const OSI_X = 140
const OSI_W = 420
const TCPIP_X = 600
const TCPIP_W = 220
const BRACKET_R_X = 830
const BRACKET_R_W = 23

const REVEAL_STEP_MS = 420
const TCPIP_REVEAL_MS = 700
const LOOP_PAUSE_MS = 2500

interface Props {
  className?: string
}

export function OsiSevenLayer({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [selected, setSelected] = useState<Selection | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const pausedRef = useRef(false)
  // Ref để D3 click handlers gọi setter React mà không bị stale closure.
  const selectActionsRef = useRef<{ select: (s: Selection) => void }>({
    select: () => {},
  })

  // TCP/IP block geometries (span multiple OSI rows).
  const tcpipBlocks = useMemo(() => {
    let cursor = 0
    return TCPIP_LAYERS.map((t) => {
      const y = CONTENT_Y + cursor * ROW_H
      const height = t.osiNums.length * ROW_H - ROW_GAP
      cursor += t.osiNums.length
      return { ...t, y, height }
    })
  }, [])

  // OSI row y index — OSI_LAYERS[0]=L7 top, [6]=L1 bottom.
  const osiRowIdx = useCallback((num: number) => OSI_LAYERS.findIndex((o) => o.num === num), [])

  // ── Static render ───────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Headers
    svg
      .append('text')
      .attr('x', (PDU_X + OSI_X + OSI_W) / 2)
      .attr('y', HEADER_Y - 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground font-semibold text-base')
      .text('OSI Model')
    svg
      .append('text')
      .attr('x', TCPIP_X + TCPIP_W / 2)
      .attr('y', HEADER_Y - 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground font-semibold text-base')
      .text('TCP/IP Model')

    // Sub-header for PDU + OSI Layer labels
    svg
      .append('text')
      .attr('x', PDU_X + PDU_W / 2)
      .attr('y', HEADER_Y + 22)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground text-xs uppercase tracking-wide')
      .text('Data Unit')
    svg
      .append('text')
      .attr('x', OSI_X + OSI_W / 2)
      .attr('y', HEADER_Y + 22)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground text-xs uppercase tracking-wide')
      .text('Layer')

    // Left bracket (Host/Media) — hidden initially
    const leftBracketL = svg.append('g').attr('class', 'bracket-left').attr('opacity', 0)
    const drawLeftBracket = (label: string, osiNums: number[]) => {
      const idxs = osiNums.map(osiRowIdx).sort((a, b) => a - b)
      const top = CONTENT_Y + idxs[0] * ROW_H + 4
      const bottom = CONTENT_Y + idxs[idxs.length - 1] * ROW_H + (ROW_H - ROW_GAP) - 4
      const x = BRACKET_L_X + BRACKET_L_W - 4

      leftBracketL
        .append('path')
        .attr(
          'd',
          `M ${x},${top} L ${x - 8},${top} L ${x - 8},${bottom} L ${x},${bottom}`,
        )
        .attr('fill', 'none')
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 1.5)

      // Vertical rotated label
      const cy = (top + bottom) / 2
      const labelX = BRACKET_L_X - 2
      leftBracketL
        .append('text')
        .attr('x', labelX)
        .attr('y', cy)
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90, ${labelX}, ${cy})`)
        .attr('class', 'fill-muted-foreground text-xs font-semibold uppercase tracking-wider')
        .text(label)
    }
    drawLeftBracket(OSI_GROUPS.host.label, [...OSI_GROUPS.host.osiNums])
    drawLeftBracket(OSI_GROUPS.media.label, [...OSI_GROUPS.media.osiNums])

    // PDU column + OSI rows — each row is a `<g class="row-X">` hidden initially
    const rowsL = svg.append('g').attr('class', 'rows-layer')
    OSI_LAYERS.forEach((o, i) => {
      const y = CONTENT_Y + i * ROW_H
      const rowG = rowsL
        .append('g')
        .attr('class', `osi-row osi-row-${o.num}`)
        .attr('opacity', 0)
        .attr('transform', `translate(-40, 0)`) // slide-in from left
        .style('cursor', 'pointer')
        .style('pointer-events', 'none') // disable click khi chưa reveal
        .on('click', () =>
          selectActionsRef.current.select({ kind: 'osi', num: o.num }),
        )

      // PDU badge
      rowG
        .append('rect')
        .attr('x', PDU_X)
        .attr('y', y)
        .attr('width', PDU_W)
        .attr('height', ROW_H - ROW_GAP)
        .attr('rx', 8)
        .attr('fill', o.fill)
        .attr('opacity', 0.85)
      rowG
        .append('text')
        .attr('x', PDU_X + PDU_W / 2)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', o.text)
        .attr('class', 'font-bold text-sm')
        .text(o.pdu)

      // OSI layer box (name + desc)
      rowG
        .append('rect')
        .attr('x', OSI_X)
        .attr('y', y)
        .attr('width', OSI_W)
        .attr('height', ROW_H - ROW_GAP)
        .attr('rx', 8)
        .attr('fill', o.fill)
        .attr('opacity', 0.25)
        .attr('stroke', o.fill)
        .attr('stroke-width', 1.5)
      // Layer num chip
      rowG
        .append('rect')
        .attr('x', OSI_X + 10)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 - 14)
        .attr('width', 34)
        .attr('height', 28)
        .attr('rx', 4)
        .attr('fill', o.fill)
        .attr('opacity', 0.9)
      rowG
        .append('text')
        .attr('x', OSI_X + 10 + 17)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', o.text)
        .attr('class', 'font-bold text-xs')
        .text(`L${o.num}`)
      // Layer name
      rowG
        .append('text')
        .attr('x', OSI_X + 56)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 - 2)
        .attr('class', 'fill-foreground font-semibold text-sm')
        .text(o.name)
      // Description (dùng shortDesc — SVG text không wrap nên phải ngắn)
      rowG
        .append('text')
        .attr('x', OSI_X + 56)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 16)
        .attr('class', 'fill-muted-foreground text-xs')
        .text(o.shortDesc)
    })

    // TCP/IP column — hidden initially
    const tcpipL = svg
      .append('g')
      .attr('class', 'tcpip-layer')
      .attr('opacity', 0)
      .attr('transform', 'translate(40, 0)') // slide-in from right
      .style('pointer-events', 'none') // disable click khi chưa reveal
    tcpipBlocks.forEach((t, i) => {
      const g = tcpipL
        .append('g')
        .attr('class', `tcpip-${i}`)
        .style('cursor', 'pointer')
        .on('click', () =>
          selectActionsRef.current.select({ kind: 'tcpip', idx: i }),
        )
      g.append('rect')
        .attr('x', TCPIP_X)
        .attr('y', t.y)
        .attr('width', TCPIP_W)
        .attr('height', t.height)
        .attr('rx', 10)
        .attr('fill', t.fill)
        .attr('opacity', 0.55)
        .attr('stroke', t.fill)
        .attr('stroke-width', 2)
      g.append('text')
        .attr('x', TCPIP_X + TCPIP_W / 2)
        .attr('y', t.y + t.height / 2 + 6)
        .attr('text-anchor', 'middle')
        .attr('fill', t.text)
        .attr('class', 'font-bold text-base')
        .text(t.name)
    })

    // Right bracket (Application / Data Flow) — hidden initially
    const rightBracketL = svg
      .append('g')
      .attr('class', 'bracket-right')
      .attr('opacity', 0)
    const drawRightBracket = (label: string, tcpipIdx: number[]) => {
      const firstBlock = tcpipBlocks[tcpipIdx[0]]
      const lastBlock = tcpipBlocks[tcpipIdx[tcpipIdx.length - 1]]
      const top = firstBlock.y + 4
      const bottom = lastBlock.y + lastBlock.height - 4
      const x = BRACKET_R_X + 4

      rightBracketL
        .append('path')
        .attr(
          'd',
          `M ${x},${top} L ${x + 8},${top} L ${x + 8},${bottom} L ${x},${bottom}`,
        )
        .attr('fill', 'none')
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 1.5)

      const cy = (top + bottom) / 2
      const labelX = BRACKET_R_X + BRACKET_R_W + 6
      rightBracketL
        .append('text')
        .attr('x', labelX)
        .attr('y', cy)
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(90, ${labelX}, ${cy})`)
        .attr('class', 'fill-muted-foreground text-xs font-semibold uppercase tracking-wider')
        .text(label)
    }
    drawRightBracket(TCPIP_GROUPS.application.label, [...TCPIP_GROUPS.application.tcpipIdx])
    drawRightBracket(TCPIP_GROUPS.dataFlow.label, [...TCPIP_GROUPS.dataFlow.tcpipIdx])

    // Host/Media horizontal divider line (red) — ref Image #4, separates L5/L4 boundary
    svg
      .append('line')
      .attr('class', 'host-media-divider')
      .attr('x1', PDU_X - 5)
      .attr('x2', OSI_X + OSI_W + 5)
      .attr('y1', CONTENT_Y + 3 * ROW_H - ROW_GAP / 2)
      .attr('y2', CONTENT_Y + 3 * ROW_H - ROW_GAP / 2)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,3')
      .attr('opacity', 0)
  }, [tcpipBlocks, osiRowIdx])

  // ── Animation sequence ─────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
  }, [])

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (pausedRef.current) return
      fn()
    }, ms)
    timersRef.current.push(id)
  }, [])

  const runCycle = useCallback(() => {
    if (pausedRef.current) return
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    // Reset: hide everything, move slide-in offsets back
    svg
      .selectAll('.osi-row')
      .interrupt()
      .attr('opacity', 0)
      .attr('transform', 'translate(-40, 0)')
      .style('pointer-events', 'none')
    svg
      .select('.tcpip-layer')
      .interrupt()
      .attr('opacity', 0)
      .attr('transform', 'translate(40, 0)')
      .style('pointer-events', 'none')
    svg.select('.bracket-left').interrupt().attr('opacity', 0)
    svg.select('.bracket-right').interrupt().attr('opacity', 0)
    svg.select('.host-media-divider').interrupt().attr('opacity', 0)

    // Phase 1: reveal L1 → L7 (bottom-up)
    const reverseOrder = [...OSI_LAYERS].reverse() // L1 first
    reverseOrder.forEach((o, i) => {
      schedule(() => {
        svg
          .select(`.osi-row-${o.num}`)
          .style('pointer-events', 'auto')
          .transition()
          .duration(450)
          .ease(d3.easeCubicOut)
          .attr('opacity', 1)
          .attr('transform', 'translate(0, 0)')
      }, i * REVEAL_STEP_MS)
    })

    const afterOsiMs = reverseOrder.length * REVEAL_STEP_MS + 200

    // Phase 2: reveal TCP/IP + brackets + divider
    schedule(() => {
      svg
        .select('.tcpip-layer')
        .style('pointer-events', 'auto')
        .transition()
        .duration(TCPIP_REVEAL_MS)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1)
        .attr('transform', 'translate(0, 0)')
    }, afterOsiMs)

    schedule(() => {
      svg.select('.bracket-left').transition().duration(500).attr('opacity', 1)
      svg.select('.bracket-right').transition().duration(500).attr('opacity', 1)
      svg.select('.host-media-divider').transition().duration(500).attr('opacity', 0.8)
    }, afterOsiMs + 300)

    // Phase 3: pause then loop
    schedule(() => {
      if (!pausedRef.current) runCycle()
    }, afterOsiMs + TCPIP_REVEAL_MS + LOOP_PAUSE_MS)
  }, [schedule])

  const stop = useCallback(() => {
    pausedRef.current = true
    clearTimers()
  }, [clearTimers])

  const start = useCallback(() => {
    pausedRef.current = false
    runCycle()
  }, [runCycle])

  const handleReset = useCallback(() => {
    stop()
    setIsPlaying(true)
    setTimeout(() => start(), 100)
  }, [stop, start])

  // Tua thẳng tới trạng thái cuối: full 7 OSI rows + TCP/IP column + brackets
  // + divider. Pause animation để user có thể đọc + click interact.
  const handleSkipToEnd = useCallback(() => {
    stop()
    setIsPlaying(false)

    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    svg
      .selectAll('.osi-row')
      .interrupt()
      .attr('opacity', 1)
      .attr('transform', 'translate(0, 0)')
      .style('pointer-events', 'auto')
    svg
      .select('.tcpip-layer')
      .interrupt()
      .attr('opacity', 1)
      .attr('transform', 'translate(0, 0)')
      .style('pointer-events', 'auto')
    svg.select('.bracket-left').interrupt().attr('opacity', 1)
    svg.select('.bracket-right').interrupt().attr('opacity', 1)
    svg.select('.host-media-divider').interrupt().attr('opacity', 0.8)
  }, [stop])

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stop()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      start()
    }
  }, [isPlaying, stop, start])

  // Click vào element → auto pause animation + hiện info panel.
  const handleSelect = useCallback(
    (s: Selection) => {
      setSelected(s)
      if (isPlaying) {
        stop()
        setIsPlaying(false)
      }
    },
    [isPlaying, stop],
  )
  selectActionsRef.current.select = handleSelect

  const handleCloseInfo = useCallback(() => setSelected(null), [])

  useEffect(() => {
    const t = setTimeout(() => start(), 300)
    return () => {
      clearTimeout(t)
      stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-lg font-semibold">Mô hình 2: OSI 7 tầng (PDU + Host/Media) ↔ TCP/IP 4 tầng</h3>
        <p className="text-sm text-muted-foreground">
          Chi tiết từng tầng OSI với data unit và mô tả, nhóm Host Layers (L5-L7) vs Media Layers (L1-L4),
          và đối chiếu Application Layer / Data Flow Layer của TCP/IP. Animation reveal từ dưới lên.
        </p>
      </div>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      />
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset} aria-label="Reset animation">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handleToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSkipToEnd}
          aria-label="Tua tới trạng thái cuối"
          title="Hiển thị đầy đủ ngay"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
      <InfoPanel selection={selected} onClose={handleCloseInfo} />
      {!selected && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Click vào 1 tầng OSI hoặc TCP/IP để xem chi tiết.
        </p>
      )}
    </div>
  )
}
