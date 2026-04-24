'use client'

/**
 * OSI Flow-State Animation — Encapsulation + Decapsulation.
 *
 * Phase 1 (ĐÓNG GÓI / Encapsulation — bên gửi):
 *   Một gói "Data" xuất phát trên đỉnh, đi xuống L7 → L1. Mỗi tầng thêm
 *   1 header chip (AH, PH, SH, TCP, IP, Eth); L2 thêm trailer FCS; L1
 *   chuyển thành bits truyền trên môi trường vật lý.
 *
 * Phase 2 (BÓC TÁCH / Decapsulation — bên nhận):
 *   Bits được phục hồi thành frame, gói đi ngược lên L2 → L7, mỗi tầng
 *   BÓC header của mình (Eth+FCS → IP → TCP → SH → PH → AH), cuối cùng
 *   L7 trao lại "Data" gốc cho ứng dụng đích.
 *
 * Mục đích: thấy rõ **trình tự hoạt động 2 chiều** của 7 tầng OSI.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { OSI_LAYERS, TCPIP_LAYERS } from './constants'

const W = 900
const H = 700
const HEADER_Y = 30
const CONTENT_Y = 60
const ROW_H = 76
const ROW_GAP = 6
const OSI_X = 120
const OSI_W = 460
const TCPIP_X = 620
const TCPIP_W = 200
const PACKET_CX = OSI_X + OSI_W / 2
const CHIP_W = 28
const CHIP_H = 28
const PAYLOAD_W = 90

// Timings — chậm hơn ~35% so bản đầu để dễ theo dõi từng bước
const MOVE_MS = 700
const HOLD_MS = 1700
const STEP_MS = MOVE_MS + HOLD_MS // 2400ms / step
const INTER_PHASE_MS = 1400
const LOOP_PAUSE_MS = 2400

interface HeaderChip {
  label: string
  fill: string
  textColor: string
}

interface EncapStep {
  osi: number
  pdu: string
  header: string | null
  trailer?: boolean
  tcpipIdx: number
  note: string
}

const ENCAP_STEPS: EncapStep[] = [
  { osi: 7, pdu: 'Data', header: 'AH', tcpipIdx: 0, note: 'App data xuất phát từ ứng dụng' },
  { osi: 6, pdu: 'Data', header: 'PH', tcpipIdx: 0, note: 'Chuẩn hoá format / mã hoá (Presentation)' },
  { osi: 5, pdu: 'Data', header: 'SH', tcpipIdx: 0, note: 'Quản lý phiên giao tiếp (Session)' },
  { osi: 4, pdu: 'Segments', header: 'TCP', tcpipIdx: 1, note: 'Chia segment + port + reliability (Transport)' },
  { osi: 3, pdu: 'Packets', header: 'IP', tcpipIdx: 2, note: 'Thêm IP nguồn/đích, định tuyến (Network)' },
  { osi: 2, pdu: 'Frames', header: 'Eth', trailer: true, tcpipIdx: 3, note: 'Thêm MAC + FCS (Data Link)' },
  { osi: 1, pdu: 'Bits', header: null, tcpipIdx: 3, note: 'Biến thành tín hiệu điện/quang (Physical)' },
]

interface DecapStep {
  osi: number
  pdu: string
  stripFromIdx: number // số chip outermost còn lại = fullChips.length - (this+1)
  removeTrailer: boolean
  tcpipIdx: number
  note: string
}

// Sau encap, fullChips (outermost → innermost) = [Eth, IP, TCP, SH, PH, AH]
// Decap bóc từ outermost (idx 0) lần lượt.
const DECAP_STEPS: DecapStep[] = [
  { osi: 2, pdu: 'Packets', stripFromIdx: 0, removeTrailer: true, tcpipIdx: 3, note: 'Bên nhận — L2 bóc Ethernet header + FCS' },
  { osi: 3, pdu: 'Segments', stripFromIdx: 1, removeTrailer: false, tcpipIdx: 2, note: 'L3 bóc IP header, chọn tiến trình L4' },
  { osi: 4, pdu: 'Data', stripFromIdx: 2, removeTrailer: false, tcpipIdx: 1, note: 'L4 lắp ghép segment, bóc TCP' },
  { osi: 5, pdu: 'Data', stripFromIdx: 3, removeTrailer: false, tcpipIdx: 0, note: 'L5 bóc Session header' },
  { osi: 6, pdu: 'Data', stripFromIdx: 4, removeTrailer: false, tcpipIdx: 0, note: 'L6 giải nén/giải mã, bóc Presentation' },
  { osi: 7, pdu: 'Data', stripFromIdx: 5, removeTrailer: false, tcpipIdx: 0, note: 'L7 trao dữ liệu cho ứng dụng đích' },
]

// Build full chip array sau khi encap xong (outermost → innermost).
const buildFullChips = (): HeaderChip[] => {
  const withHeaders = ENCAP_STEPS.filter((s) => s.header !== null)
  return [...withHeaders].reverse().map((s) => {
    const layer = OSI_LAYERS.find((o) => o.num === s.osi)!
    return { label: s.header!, fill: layer.fill, textColor: layer.text }
  })
}

type PacketState =
  | { kind: 'initial' }
  | { kind: 'composed'; chips: HeaderChip[]; pdu: string; hasTrailer: boolean }
  | { kind: 'bits' }

interface Props {
  className?: string
}

interface TimedEvent {
  offset: number // ms tính từ đầu cycle
  fn: () => void
}

export function OsiFlowState({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const pausedRef = useRef(false)
  // Pause/resume state — cycleStart là mốc thời gian thực (ms từ epoch) khi
  // cycle hiện tại bắt đầu (đã trừ pause offset nếu resume giữa chừng).
  // pausedAt là offset đã chạy được trong cycle tại thời điểm pause.
  const cycleStartRef = useRef(0)
  const pausedAtRef = useRef(0)
  // Self-ref cho runFromOffset để vòng lặp cycle có thể tự gọi lại
  // mà không tạo circular dep trong useCallback.
  const runFromOffsetRef = useRef<(offset: number) => void>(() => {})

  // ── Static render ─────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg
      .append('text')
      .attr('x', OSI_X + OSI_W / 2)
      .attr('y', HEADER_Y - 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground font-semibold text-base')
      .text('OSI — Encapsulation ↓ / Decapsulation ↑')
    svg
      .append('text')
      .attr('x', TCPIP_X + TCPIP_W / 2)
      .attr('y', HEADER_Y - 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground font-semibold text-base')
      .text('TCP/IP')

    // OSI rows
    const rowsG = svg.append('g').attr('class', 'osi-rows')
    OSI_LAYERS.forEach((o, i) => {
      const y = CONTENT_Y + i * ROW_H
      const g = rowsG.append('g').attr('class', `osi-row osi-row-${o.num}`)
      g.append('rect')
        .attr('class', 'osi-row-bg')
        .attr('x', OSI_X)
        .attr('y', y)
        .attr('width', OSI_W)
        .attr('height', ROW_H - ROW_GAP)
        .attr('rx', 8)
        .attr('fill', o.fill)
        .attr('opacity', 0.15)
        .attr('stroke', o.fill)
        .attr('stroke-width', 1.5)
      g.append('rect')
        .attr('x', OSI_X + 10)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 - 14)
        .attr('width', 34)
        .attr('height', 28)
        .attr('rx', 4)
        .attr('fill', o.fill)
        .attr('opacity', 0.9)
      g.append('text')
        .attr('x', OSI_X + 10 + 17)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', o.text)
        .attr('class', 'font-bold text-xs')
        .text(`L${o.num}`)
      g.append('text')
        .attr('x', OSI_X + 56)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 - 2)
        .attr('class', 'fill-foreground font-semibold text-sm')
        .text(o.name)
      g.append('text')
        .attr('x', OSI_X + 56)
        .attr('y', y + (ROW_H - ROW_GAP) / 2 + 16)
        .attr('class', 'fill-muted-foreground text-xs')
        .text(o.shortDesc)
    })

    // TCP/IP blocks
    let cursor = 0
    const tcpipG = svg.append('g').attr('class', 'tcpip-blocks')
    TCPIP_LAYERS.forEach((t, i) => {
      const y = CONTENT_Y + cursor * ROW_H
      const height = t.osiNums.length * ROW_H - ROW_GAP
      cursor += t.osiNums.length
      const g = tcpipG.append('g').attr('class', `tcpip-block tcpip-${i}`)
      g.append('rect')
        .attr('class', 'tcpip-bg')
        .attr('x', TCPIP_X)
        .attr('y', y)
        .attr('width', TCPIP_W)
        .attr('height', height)
        .attr('rx', 10)
        .attr('fill', t.fill)
        .attr('opacity', 0.25)
        .attr('stroke', t.fill)
        .attr('stroke-width', 2)
      g.append('text')
        .attr('x', TCPIP_X + TCPIP_W / 2)
        .attr('y', y + height / 2 + 6)
        .attr('text-anchor', 'middle')
        .attr('fill', t.text)
        .attr('class', 'font-bold text-base')
        .text(t.name)
    })

    // Trail guide line
    svg
      .append('line')
      .attr('x1', PACKET_CX)
      .attr('x2', PACKET_CX)
      .attr('y1', CONTENT_Y - 30)
      .attr('y2', CONTENT_Y + 7 * ROW_H)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-muted-foreground')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,4')
      .attr('opacity', 0.3)

    // Phase indicator (top-right) — shows "ENCAP ↓" / "DECAP ↑"
    svg
      .append('g')
      .attr('class', 'phase-indicator')
      .attr('opacity', 0)
      .append('rect')
      .attr('class', 'phase-bg')
      .attr('x', OSI_X + OSI_W + 8)
      .attr('y', HEADER_Y - 18)
      .attr('width', 30)
      .attr('height', 22)
      .attr('rx', 4)
      .attr('fill', '#6366f1')
      .attr('opacity', 0.85)
    svg
      .select('.phase-indicator')
      .append('text')
      .attr('class', 'phase-text')
      .attr('x', OSI_X + OSI_W + 8 + 15)
      .attr('y', HEADER_Y - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('class', 'phase-text font-bold')
      .attr('font-size', '11')
      .text('↓')

    // Packet group — initial position above L7
    svg
      .append('g')
      .attr('class', 'packet-group')
      .attr('transform', `translate(0, ${CONTENT_Y - 44})`)
      .attr('opacity', 0)

    // Status note
    svg
      .append('text')
      .attr('class', 'flow-note fill-muted-foreground text-xs')
      .attr('x', OSI_X)
      .attr('y', H - 14)
      .text('')
  }, [])

  // ── Packet renderer (state-based) ─────────────────────────────────────────
  const drawPacket = useCallback((state: PacketState) => {
    const svg = d3.select(svgRef.current)
    const pg = svg.select<SVGGElement>('.packet-group')
    pg.selectAll('*').remove()

    if (state.kind === 'initial') {
      const startX = PACKET_CX - PAYLOAD_W / 2
      pg.append('rect')
        .attr('x', startX)
        .attr('y', 0)
        .attr('width', PAYLOAD_W)
        .attr('height', CHIP_H)
        .attr('rx', 4)
        .attr('fill', '#e0e7ff')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 1)
      pg.append('text')
        .attr('x', PACKET_CX)
        .attr('y', CHIP_H / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-indigo-900 font-bold text-xs')
        .text('DATA')
      pg.append('text')
        .attr('x', PACKET_CX)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground font-bold text-sm')
        .text('Data')
      return
    }

    if (state.kind === 'bits') {
      const bitsW = 280
      const bitsX = PACKET_CX - bitsW / 2
      const physLayer = OSI_LAYERS.find((o) => o.num === 1)!
      pg.append('rect')
        .attr('x', bitsX)
        .attr('y', 0)
        .attr('width', bitsW)
        .attr('height', CHIP_H)
        .attr('rx', 4)
        .attr('fill', physLayer.fill)
        .attr('opacity', 0.25)
        .attr('stroke', physLayer.fill)
        .attr('stroke-width', 1.5)
      pg.append('text')
        .attr('x', PACKET_CX)
        .attr('y', CHIP_H / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', physLayer.text)
        .attr('class', 'font-mono font-bold text-sm')
        .text('01001010 11100101 01110011 10101100')
      pg.append('text')
        .attr('x', PACKET_CX)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground font-bold text-sm')
        .text('Bits — truyền trên môi trường vật lý')
      return
    }

    // Composed: chips (outermost → innermost) + payload + optional trailer
    const { chips, pdu, hasTrailer } = state
    const totalW = chips.length * CHIP_W + PAYLOAD_W + (hasTrailer ? CHIP_W : 0)
    const startX = PACKET_CX - totalW / 2

    chips.forEach((c, i) => {
      const cx = startX + i * CHIP_W
      pg.append('rect')
        .attr('x', cx)
        .attr('y', 0)
        .attr('width', CHIP_W - 1)
        .attr('height', CHIP_H)
        .attr('rx', 2)
        .attr('fill', c.fill)
        .attr('opacity', 0.95)
      pg.append('text')
        .attr('x', cx + CHIP_W / 2)
        .attr('y', CHIP_H / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', c.textColor)
        .attr('class', 'font-bold')
        .attr('font-size', '10')
        .text(c.label)
    })

    const payloadX = startX + chips.length * CHIP_W
    pg.append('rect')
      .attr('x', payloadX)
      .attr('y', 0)
      .attr('width', PAYLOAD_W)
      .attr('height', CHIP_H)
      .attr('rx', 2)
      .attr('fill', '#e0e7ff')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1)
    pg.append('text')
      .attr('x', payloadX + PAYLOAD_W / 2)
      .attr('y', CHIP_H / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-indigo-900 font-bold text-xs')
      .text('DATA')

    if (hasTrailer) {
      const tx = payloadX + PAYLOAD_W
      pg.append('rect')
        .attr('x', tx)
        .attr('y', 0)
        .attr('width', CHIP_W - 1)
        .attr('height', CHIP_H)
        .attr('rx', 2)
        .attr('fill', '#fb923c')
        .attr('opacity', 0.95)
      pg.append('text')
        .attr('x', tx + CHIP_W / 2)
        .attr('y', CHIP_H / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#7c2d12')
        .attr('class', 'font-bold')
        .attr('font-size', '10')
        .text('FCS')
    }

    pg.append('text')
      .attr('x', PACKET_CX)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground font-bold text-sm')
      .text(pdu)
  }, [])

  // ── Animation helpers ─────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
  }, [])

  // Y center của 1 row để đặt packet (align top edge)
  const rowTargetY = (osiNum: number) => {
    const rowIdx = OSI_LAYERS.findIndex((o) => o.num === osiNum)
    return CONTENT_Y + rowIdx * ROW_H + (ROW_H - ROW_GAP) / 2 - CHIP_H / 2
  }

  const pulseLayer = useCallback((osiNum: number, tcpipIdx: number) => {
    const svg = d3.select(svgRef.current)
    svg
      .select(`.osi-row-${osiNum} .osi-row-bg`)
      .transition()
      .duration(280)
      .attr('opacity', 0.75)
      .transition()
      .duration(700)
      .attr('opacity', 0.3)
    svg
      .select(`.tcpip-${tcpipIdx} .tcpip-bg`)
      .transition()
      .duration(280)
      .attr('opacity', 0.8)
      .transition()
      .duration(700)
      .attr('opacity', 0.4)
  }, [])

  const setPhase = useCallback((label: string, color: string) => {
    const svg = d3.select(svgRef.current)
    const g = svg.select('.phase-indicator')
    g.select<SVGRectElement>('.phase-bg').attr('fill', color)
    g.select<SVGTextElement>('.phase-text').text(label)
    g.transition().duration(400).attr('opacity', 1)
  }, [])

  // ── Cycle plan ────────────────────────────────────────────────────────────
  // Mỗi cycle được mô tả bởi 1 mảng events có offset tuyệt đối (ms) so với
  // đầu cycle. Lợi thế: pause chỉ cần lưu offset đã chạy, resume thì
  // schedule lại các events có offset > offset pause với delay đã trừ bớt.
  const ENCAP_END_MS = 800 + ENCAP_STEPS.length * STEP_MS
  const DECAP_BASE_MS = ENCAP_END_MS + INTER_PHASE_MS
  const DECAP_END_MS = DECAP_BASE_MS + DECAP_STEPS.length * STEP_MS
  const CYCLE_END_MS = DECAP_END_MS + LOOP_PAUSE_MS

  const buildEvents = useCallback((): TimedEvent[] => {
    const events: TimedEvent[] = []
    const svg = d3.select(svgRef.current)
    const pg = svg.select<SVGGElement>('.packet-group')
    const fullChips = buildFullChips()

    // t=0 — reset visuals + spawn initial packet above L7
    events.push({
      offset: 0,
      fn: () => {
        svg.selectAll<SVGRectElement, unknown>('.osi-row-bg').interrupt().attr('opacity', 0.15)
        svg.selectAll<SVGRectElement, unknown>('.tcpip-bg').interrupt().attr('opacity', 0.25)
        pg.interrupt().attr('opacity', 0).attr('transform', `translate(0, ${CONTENT_Y - 44})`)
        svg.select('.flow-note').text('')
        svg.select('.phase-indicator').interrupt().attr('opacity', 0)
        drawPacket({ kind: 'initial' })
      },
    })

    // t=300 — fade-in packet + phase indicator
    events.push({
      offset: 300,
      fn: () => {
        pg.transition().duration(400).attr('opacity', 1)
        setPhase('↓', '#6366f1')
        svg.select('.flow-note').text('ĐÓNG GÓI — dữ liệu xuất phát từ ứng dụng bên gửi')
      },
    })

    // ── Phase 1: Encapsulation ─────────────────────────────────────────────
    ENCAP_STEPS.forEach((step, i) => {
      const stepStart = 800 + i * STEP_MS
      const targetY = rowTargetY(step.osi)

      events.push({
        offset: stepStart,
        fn: () => {
          pg.transition()
            .duration(MOVE_MS)
            .ease(d3.easeCubicOut)
            .attr('transform', `translate(0, ${targetY})`)
          svg
            .select('.flow-note')
            .text(`↓ Encap L${step.osi} ${OSI_LAYERS.find((o) => o.num === step.osi)!.name}: ${step.note}`)
        },
      })

      events.push({
        offset: stepStart + MOVE_MS + 80,
        fn: () => {
          pulseLayer(step.osi, step.tcpipIdx)
          if (step.osi === 1) {
            drawPacket({ kind: 'bits' })
          } else {
            const addedHeaders = ENCAP_STEPS.slice(0, i + 1).filter((s) => s.header !== null)
            const chips: HeaderChip[] = [...addedHeaders].reverse().map((s) => {
              const layer = OSI_LAYERS.find((o) => o.num === s.osi)!
              return { label: s.header!, fill: layer.fill, textColor: layer.text }
            })
            const hasTrailer = ENCAP_STEPS.slice(0, i + 1).some((s) => s.trailer)
            drawPacket({ kind: 'composed', chips, pdu: step.pdu, hasTrailer })
          }
        },
      })
    })

    // Inter-phase — bits "truyền qua dây", flip phase indicator
    events.push({
      offset: ENCAP_END_MS + INTER_PHASE_MS / 2,
      fn: () => {
        setPhase('↑', '#dc2626')
        svg.select('.flow-note').text('→ Bits truyền qua môi trường. Bên nhận bắt đầu BÓC TÁCH')
      },
    })

    // ── Phase 2: Decapsulation ─────────────────────────────────────────────
    DECAP_STEPS.forEach((step, j) => {
      const stepStart = DECAP_BASE_MS + j * STEP_MS
      const targetY = rowTargetY(step.osi)

      events.push({
        offset: stepStart,
        fn: () => {
          pg.transition()
            .duration(MOVE_MS)
            .ease(d3.easeCubicOut)
            .attr('transform', `translate(0, ${targetY})`)
          svg
            .select('.flow-note')
            .text(`↑ Decap L${step.osi} ${OSI_LAYERS.find((o) => o.num === step.osi)!.name}: ${step.note}`)
        },
      })

      events.push({
        offset: stepStart + MOVE_MS + 80,
        fn: () => {
          pulseLayer(step.osi, step.tcpipIdx)
          const remaining = fullChips.slice(step.stripFromIdx + 1)
          drawPacket({ kind: 'composed', chips: remaining, pdu: step.pdu, hasTrailer: false })
        },
      })
    })

    // Final note — confirm delivery
    events.push({
      offset: DECAP_END_MS + 200,
      fn: () => {
        svg.select('.flow-note').text('✓ Ứng dụng đích nhận lại dữ liệu gốc — vòng đời hoàn tất')
      },
    })

    // Loop — restart cycle khi tới CYCLE_END_MS
    events.push({
      offset: CYCLE_END_MS,
      fn: () => {
        pausedAtRef.current = 0
        runFromOffsetRef.current(0)
      },
    })

    return events
  }, [drawPacket, pulseLayer, setPhase, ENCAP_END_MS, DECAP_BASE_MS, DECAP_END_MS, CYCLE_END_MS])

  // Run cycle từ offset cụ thể. fromOffset=0 = start/reset; fromOffset>0 = resume.
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

  // Giữ ref đồng bộ cho self-reference trong loop event
  runFromOffsetRef.current = runFromOffset

  // ── Controls ──────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    pausedAtRef.current = Math.max(0, Date.now() - cycleStartRef.current)
    clearTimers()
    // KHÔNG interrupt transitions — để chúng chạy nốt tới target; tránh
    // packet đứng giữa chừng giữa 2 layer gây cảm giác lạ khi resume.
  }, [clearTimers])

  const resume = useCallback(() => {
    if (!pausedRef.current && timersRef.current.length > 0) return
    pausedRef.current = false
    runFromOffset(pausedAtRef.current)
  }, [runFromOffset])

  const handleReset = useCallback(() => {
    pausedRef.current = false
    clearTimers()
    pausedAtRef.current = 0
    setIsPlaying(true)
    runFromOffset(0)
  }, [clearTimers, runFromOffset])

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      resume()
    }
  }, [isPlaying, pause, resume])

  // Mount — kick off first cycle
  useEffect(() => {
    const t = setTimeout(() => {
      pausedRef.current = false
      pausedAtRef.current = 0
      runFromOffset(0)
    }, 400)
    return () => {
      clearTimeout(t)
      pausedRef.current = true
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-lg font-semibold">Mô hình 3: Flow State — Encapsulation ↓ / Decapsulation ↑</h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Bên gửi</span> đóng gói L7 → L1 (thêm header mỗi tầng, PDU đổi tên
          <span className="font-medium"> Data → Segments → Packets → Frames → Bits</span>).
          <span className="font-medium"> Bên nhận</span> bóc tách L2 → L7 (gỡ header tương ứng), cuối cùng L7 trao lại Data gốc.
          Khối TCP/IP bên phải sáng lên theo layer đang hoạt động để thấy mapping hai mô hình.
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
      </div>
    </div>
  )
}
