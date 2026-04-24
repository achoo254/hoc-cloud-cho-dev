'use client'

/**
 * Three-Column Mapping Diagram (Mô hình #3 / Image #3).
 *
 * Layout: TCP/IP 4 blocks (left) | Protocols chips (middle) | OSI 7 boxes (right).
 * TCP/IP Application spans OSI L7/L6/L5; Network Interface spans L2/L1.
 *
 * Animation: highlight lần lượt 4 nhóm TCP/IP — mỗi step GIỮ connectors +
 *            protocols của các nhóm trước (tích luỹ), không ẩn đi. Sau step
 *            cuối giữ trạng thái đầy đủ một khoảng rồi loop reset.
 * Pause/resume dùng event-timeline: lưu offset đã chạy, resume tiếp từ đó
 *            thay vì restart cycle.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { OSI_LAYERS, TCPIP_LAYERS, PROTOCOL_GROUPS } from './constants'
import { InfoPanel, type Selection } from './info-panel'

const W = 900
const H = 560
const HEADER_H = 40
const CONTENT_Y = 60
const ROW_H = 65
const ROW_GAP = 6
const COL1_X = 40
const COL1_W = 200
const COL2_X = 270
const COL2_W = 350
const COL3_X = 650
const COL3_W = 220
const STEP_MS = 2200
const INITIAL_DELAY_MS = 400
const FINAL_HOLD_MS = 2800

interface TimedEvent {
  offset: number
  fn: () => void
}

interface Props {
  className?: string
}

export function ThreeColumnMapping({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [selected, setSelected] = useState<Selection | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const pausedRef = useRef(false)
  const cycleStartRef = useRef(0)
  const pausedAtRef = useRef(0)
  const runFromOffsetRef = useRef<(offset: number) => void>(() => {})
  // Ref giữ setter/pauser để D3 click handlers gọi mà không bị stale closure.
  const selectActionsRef = useRef<{
    select: (s: Selection) => void
  }>({ select: () => {} })

  // Pre-compute TCP/IP block geometries (span multiple OSI rows).
  const tcpipBlocks = useMemo(() => {
    let cursor = 0
    return TCPIP_LAYERS.map((t) => {
      const y = CONTENT_Y + cursor * ROW_H
      const height = t.osiNums.length * ROW_H - ROW_GAP
      cursor += t.osiNums.length
      return { ...t, y, height }
    })
  }, [])

  const osiRowY = useCallback((num: number) => {
    const idx = OSI_LAYERS.findIndex((o) => o.num === num)
    return CONTENT_Y + idx * ROW_H
  }, [])

  // Static render (headers, 3 columns, protocol chips in hidden state).
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Column headers
    const headers = [
      { x: COL1_X + COL1_W / 2, label: 'TCP/IP model' },
      { x: COL2_X + COL2_W / 2, label: 'Protocols and Services' },
      { x: COL3_X + COL3_W / 2, label: 'OSI model' },
    ]
    headers.forEach((h) => {
      svg
        .append('text')
        .attr('x', h.x)
        .attr('y', HEADER_H / 2 + 6)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground font-semibold text-base')
        .text(h.label)
    })

    // Column dividers
    ;[COL2_X - 15, COL3_X - 15].forEach((x) => {
      svg
        .append('line')
        .attr('x1', x)
        .attr('y1', CONTENT_Y - 10)
        .attr('x2', x)
        .attr('y2', H - 10)
        .attr('stroke', 'currentColor')
        .attr('class', 'text-border')
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.4)
    })

    // Col 3: OSI 7 boxes
    const osiL = svg.append('g').attr('class', 'osi-layer')
    OSI_LAYERS.forEach((o, i) => {
      const y = CONTENT_Y + i * ROW_H
      const g = osiL
        .append('g')
        .attr('class', `osi-box osi-${o.num}`)
        .style('cursor', 'pointer')
        .on('click', () =>
          selectActionsRef.current.select({ kind: 'osi', num: o.num }),
        )
      g.append('rect')
        .attr('x', COL3_X)
        .attr('y', y)
        .attr('width', COL3_W)
        .attr('height', ROW_H - ROW_GAP)
        .attr('rx', 8)
        .attr('fill', o.fill)
        .attr('opacity', 0.3)
        .attr('stroke', o.fill)
        .attr('stroke-width', 1.5)
      g.append('text')
        .attr('x', COL3_X + COL3_W / 2)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', o.text)
        .attr('class', 'font-semibold text-sm')
        .text(o.name)
    })

    // Col 1: TCP/IP 4 blocks
    const tcpipL = svg.append('g').attr('class', 'tcpip-layer')
    tcpipBlocks.forEach((t, i) => {
      const g = tcpipL
        .append('g')
        .attr('class', `tcpip-box tcpip-${i}`)
        .style('cursor', 'pointer')
        .on('click', () =>
          selectActionsRef.current.select({ kind: 'tcpip', idx: i }),
        )
      g.append('rect')
        .attr('x', COL1_X)
        .attr('y', t.y)
        .attr('width', COL1_W)
        .attr('height', t.height)
        .attr('rx', 10)
        .attr('fill', t.fill)
        .attr('opacity', 0.3)
        .attr('stroke', t.fill)
        .attr('stroke-width', 1.5)
      g.append('text')
        .attr('x', COL1_X + COL1_W / 2)
        .attr('y', t.y + t.height / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', t.text)
        .attr('class', 'font-bold text-base')
        .text(t.name)
    })

    // Connectors layer (dynamic) — append BEFORE proto-layer để chips render
    // trên connectors (tránh dashed line che chip).
    svg.append('g').attr('class', 'connectors-layer')

    // Col 2: protocol chip groups (hidden)
    const protoL = svg.append('g').attr('class', 'proto-layer')
    PROTOCOL_GROUPS.forEach((protos, gIdx) => {
      const t = tcpipBlocks[gIdx]
      const cy = t.y + t.height / 2
      const chipW = 62
      const chipH = 24
      const gap = 6
      const perRow = Math.min(3, protos.length)
      const rows = Math.ceil(protos.length / perRow)
      const totalW = perRow * chipW + (perRow - 1) * gap
      const totalH = rows * chipH + (rows - 1) * gap
      const startX = COL2_X + (COL2_W - totalW) / 2
      const startY = cy - totalH / 2

      const group = protoL
        .append('g')
        .attr('class', `proto-group proto-${gIdx}`)
        .attr('opacity', 0)
        // Disable click khi chip còn ẩn để tránh click trúng vùng trong suốt.
        .style('pointer-events', 'none')

      protos.forEach((p, i) => {
        const r = Math.floor(i / perRow)
        const c = i % perRow
        const x = startX + c * (chipW + gap)
        const y = startY + r * (chipH + gap)
        const chip = group
          .append('g')
          .attr('class', `proto-chip proto-chip-${p}`)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation()
            selectActionsRef.current.select({
              kind: 'proto',
              name: p,
              groupIdx: gIdx,
            })
          })
        chip
          .append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', chipW)
          .attr('height', chipH)
          .attr('rx', 4)
          .attr('fill', t.fill)
          .attr('opacity', 0.9)
        chip
          .append('text')
          .attr('x', x + chipW / 2)
          .attr('y', y + chipH / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', t.text)
          .attr('class', 'text-xs font-bold')
          .text(p)
      })
    })

  }, [tcpipBlocks])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }, [])

  const resetVisuals = useCallback(() => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return
    svg.selectAll('.tcpip-box rect').interrupt().attr('opacity', 0.3)
    svg.selectAll('.osi-box rect').interrupt().attr('opacity', 0.3)
    svg
      .selectAll('.proto-group')
      .interrupt()
      .attr('opacity', 0)
      .style('pointer-events', 'none')
    svg.select('.connectors-layer').selectAll('*').remove()
  }, [])

  const revealStep = useCallback(
    (step: number) => {
      const svg = d3.select(svgRef.current)
      if (!svg.node()) return
      const t = tcpipBlocks[step]

      svg
        .select(`.tcpip-${step} rect`)
        .transition()
        .duration(450)
        .attr('opacity', 0.9)

      t.osiNums.forEach((num) => {
        svg
          .select(`.osi-${num} rect`)
          .transition()
          .delay(150)
          .duration(450)
          .attr('opacity', 0.9)
      })

      const connL = svg.select('.connectors-layer')
      const tcpipRight = COL1_X + COL1_W
      const osiLeft = COL3_X
      const midX = (tcpipRight + osiLeft) / 2
      const tcpipMidY = t.y + t.height / 2

      t.osiNums.forEach((num) => {
        const osiY = osiRowY(num) + (ROW_H - ROW_GAP) / 2
        const path = `M ${tcpipRight},${tcpipMidY} L ${midX - 6},${tcpipMidY} L ${midX - 6},${osiY} L ${osiLeft},${osiY}`
        connL
          .append('path')
          .attr('class', `conn-${step}`)
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', t.fill)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,3')
          .attr('opacity', 0)
          .transition()
          .delay(150)
          .duration(500)
          .attr('opacity', 0.85)
      })

      svg
        .select(`.proto-${step}`)
        .style('pointer-events', 'auto')
        .transition()
        .delay(350)
        .duration(500)
        .attr('opacity', 1)
    },
    [tcpipBlocks, osiRowY],
  )

  const buildEvents = useCallback((): TimedEvent[] => {
    const events: TimedEvent[] = []
    events.push({ offset: 0, fn: () => resetVisuals() })
    TCPIP_LAYERS.forEach((_, i) => {
      const offset = INITIAL_DELAY_MS + i * STEP_MS
      events.push({ offset, fn: () => revealStep(i) })
    })
    const loopAt =
      INITIAL_DELAY_MS + TCPIP_LAYERS.length * STEP_MS + FINAL_HOLD_MS
    events.push({
      offset: loopAt,
      fn: () => runFromOffsetRef.current(0),
    })
    return events
  }, [resetVisuals, revealStep])

  const runFromOffset = useCallback(
    (fromOffset: number) => {
      clearTimers()
      if (pausedRef.current) return
      const events = buildEvents()
      cycleStartRef.current = Date.now() - fromOffset
      for (const ev of events) {
        if (ev.offset < fromOffset) continue
        const delay = Math.max(0, ev.offset - fromOffset)
        const id = setTimeout(() => {
          if (pausedRef.current) return
          ev.fn()
        }, delay)
        timersRef.current.push(id)
      }
    },
    [buildEvents, clearTimers],
  )
  runFromOffsetRef.current = runFromOffset

  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    pausedAtRef.current = Math.max(0, Date.now() - cycleStartRef.current)
    clearTimers()
  }, [clearTimers])

  const resume = useCallback(() => {
    if (!pausedRef.current && timersRef.current.length > 0) return
    pausedRef.current = false
    runFromOffset(pausedAtRef.current)
  }, [runFromOffset])

  const handleReset = useCallback(() => {
    pausedRef.current = false
    pausedAtRef.current = 0
    clearTimers()
    resetVisuals()
    setIsPlaying(true)
    runFromOffset(0)
  }, [clearTimers, resetVisuals, runFromOffset])

  // Tua thẳng tới trạng thái cuối: tất cả 4 nhóm TCP/IP + OSI + chip + connectors
  // hiện full. Pause animation để user có thể quan sát + click interact.
  const handleSkipToEnd = useCallback(() => {
    pausedRef.current = true
    clearTimers()
    setIsPlaying(false)

    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    svg.selectAll('.tcpip-box rect').interrupt().attr('opacity', 0.9)
    svg.selectAll('.osi-box rect').interrupt().attr('opacity', 0.9)
    svg
      .selectAll('.proto-group')
      .interrupt()
      .attr('opacity', 1)
      .style('pointer-events', 'auto')

    // Vẽ lại toàn bộ connectors (clear rồi draw hết 4 group).
    const connL = svg.select('.connectors-layer')
    connL.selectAll('*').remove()
    const tcpipRight = COL1_X + COL1_W
    const osiLeft = COL3_X
    const midX = (tcpipRight + osiLeft) / 2
    tcpipBlocks.forEach((t, i) => {
      const tcpipMidY = t.y + t.height / 2
      t.osiNums.forEach((num) => {
        const osiY = osiRowY(num) + (ROW_H - ROW_GAP) / 2
        const path = `M ${tcpipRight},${tcpipMidY} L ${midX - 6},${tcpipMidY} L ${midX - 6},${osiY} L ${osiLeft},${osiY}`
        connL
          .append('path')
          .attr('class', `conn-${i}`)
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', t.fill)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,3')
          .attr('opacity', 0.85)
      })
    })
  }, [clearTimers, tcpipBlocks, osiRowY])

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      resume()
    }
  }, [isPlaying, pause, resume])

  // Click vào element → auto pause animation + hiện info panel.
  const handleSelect = useCallback(
    (s: Selection) => {
      setSelected(s)
      if (isPlaying) {
        pause()
        setIsPlaying(false)
      }
    },
    [isPlaying, pause],
  )
  selectActionsRef.current.select = handleSelect

  const handleCloseInfo = useCallback(() => setSelected(null), [])

  useEffect(() => {
    pausedRef.current = false
    pausedAtRef.current = 0
    const t = setTimeout(() => runFromOffset(0), 300)
    return () => {
      clearTimeout(t)
      clearTimers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-lg font-semibold">Mô hình 1: Mapping TCP/IP ↔ Protocols ↔ OSI</h3>
        <p className="text-sm text-muted-foreground">
          4 tầng TCP/IP gộp 7 tầng OSI, kèm protocols đại diện. Animation highlight lần lượt 4 nhóm.
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
          💡 Click vào 1 tầng TCP/IP, OSI, hoặc protocol chip để xem chi tiết.
        </p>
      )}
    </div>
  )
}
