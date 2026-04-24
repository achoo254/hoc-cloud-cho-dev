'use client'

/**
 * OSI Flow State — Network Topology Redesign (Mô hình 3).
 *
 * Layout 3 zone trong 1 SVG canvas (W=1320, H=900):
 *   Left   — Sender OSI stack (L7 top → L1 bottom). Packet XUỐNG = encap.
 *   Middle — Title + topology row với 5 hop (Router→ISP→Internet→Firewall→LB)
 *            nối bằng dashed arrows, icon lucide-react render qua foreignObject.
 *   Right  — Receiver OSI stack (L7 top → L1 bottom). Packet LÊN = decap.
 *
 * Animation 3 phase (loop):
 *   1. ENCAP   — packet spawn trên L7 sender, đi xuống L7→L1, mỗi layer thêm
 *                header chip (AH/PH/SH/TCP/IP/Eth+FCS). L1 → bits.
 *   2. TRANSIT — packet đi từ sender L1 qua 5 hops tới receiver L1. Mỗi hop
 *                highlight icon + label layer mà device operate.
 *   3. DECAP   — packet vào L1 receiver, đi lên L1→L7, bóc header lần lượt.
 *
 * Packet + highlights dùng Framer Motion (animate x/y). Static elements JSX.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Play, Pause, RotateCcw, SkipForward,
  Monitor, Router as RouterIcon, Cloud, Globe, Shield, Network, Server,
} from 'lucide-react'
import { OSI_LAYERS, TOPOLOGY_NODES, type TopologyIconKey } from './constants'

// ── Layout constants ─────────────────────────────────────────────────────────
const W = 1320
const H = 900

// Stack dimensions (both sender/receiver)
const STACK_CONTENT_Y = 64
const ROW_H = 88
const ROW_GAP = 6
const STACK_W = 300
const S_X = 24              // sender stack x
const R_X = W - 24 - STACK_W // receiver stack x

// Topology band (middle-bottom area)
const TOPO_Y = 800        // y-center of topology nodes
const NODE_W = 108
const NODE_H = 92
// Intermediate nodes: indices 1..5 of TOPOLOGY_NODES (router, isp, internet, firewall, lb).
// Sender (client, idx 0) + Receiver (server, idx 6) là 2 stack, không render node riêng.
const INTERMEDIATE_IDS = ['router', 'isp', 'internet', 'firewall', 'lb'] as const
const TOPO_X_START = S_X + STACK_W + 20    // 344
const TOPO_X_END = R_X - 20                // 976
const TOPO_SPAN = TOPO_X_END - TOPO_X_START // 632
const NODE_GAP = (TOPO_SPAN - INTERMEDIATE_IDS.length * NODE_W) / (INTERMEDIATE_IDS.length - 1)

// Timings (ms)
const ENCAP_MOVE = 520
const ENCAP_HOLD = 780
const ENCAP_STEP_MS = ENCAP_MOVE + ENCAP_HOLD
const TRANSIT_MOVE = 850
const TRANSIT_HOLD = 700
const TRANSIT_STEP_MS = TRANSIT_MOVE + TRANSIT_HOLD
const DECAP_MOVE = 520
const DECAP_HOLD = 780
const DECAP_STEP_MS = DECAP_MOVE + DECAP_HOLD
const INTER_PHASE_MS = 700
const FINAL_HOLD_MS = 2200

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'encap' | 'transit' | 'decap' | 'done'

interface HeaderChip {
  label: string
  fill: string
  textColor: string
}

interface EncapStepDef {
  osi: number      // 1..7
  pdu: string
  header: string | null
  trailer?: boolean
  note: string
}

const ENCAP_STEPS: EncapStepDef[] = [
  { osi: 7, pdu: 'Data',     header: 'AH',  note: 'Application (L7): tạo request, UA gắn header HTTP' },
  { osi: 6, pdu: 'Data',     header: 'PH',  note: 'Presentation (L6): TLS encrypt + encoding UTF-8/gzip' },
  { osi: 5, pdu: 'Data',     header: 'SH',  note: 'Session (L5): quản lý session (cookie/JWT), keep-alive' },
  { osi: 4, pdu: 'Segments', header: 'TCP', note: 'Transport (L4): segment + port + seq/ack, congestion control' },
  { osi: 3, pdu: 'Packets',  header: 'IP',  note: 'Network (L3): thêm IP src/dst, TTL, chọn route' },
  { osi: 2, pdu: 'Frames',   header: 'Eth', trailer: true, note: 'Data Link (L2): MAC next-hop + FCS checksum' },
  { osi: 1, pdu: 'Bits',     header: null,  note: 'Physical (L1): biến frame thành tín hiệu điện/quang/radio' },
]

// DECAP inverse: sau encap fullChips (outermost → innermost) = [Eth, IP, TCP, SH, PH, AH]
const DECAP_STEPS: Array<{ osi: number; pdu: string; stripFromIdx: number; removeTrailer: boolean; note: string }> = [
  { osi: 1, pdu: 'Bits',     stripFromIdx: -1, removeTrailer: false, note: 'L1 Physical: phục hồi bits từ tín hiệu' },
  { osi: 2, pdu: 'Packets',  stripFromIdx: 0,  removeTrailer: true,  note: 'L2 Data Link: bóc Ethernet header + FCS, check CRC' },
  { osi: 3, pdu: 'Segments', stripFromIdx: 1,  removeTrailer: false, note: 'L3 Network: bóc IP header, chọn next-protocol L4' },
  { osi: 4, pdu: 'Data',     stripFromIdx: 2,  removeTrailer: false, note: 'L4 Transport: reassemble segments, bóc TCP header' },
  { osi: 5, pdu: 'Data',     stripFromIdx: 3,  removeTrailer: false, note: 'L5 Session: bóc session header, map tới session active' },
  { osi: 6, pdu: 'Data',     stripFromIdx: 4,  removeTrailer: false, note: 'L6 Presentation: giải mã TLS + decompress' },
  { osi: 7, pdu: 'Data',     stripFromIdx: 5,  removeTrailer: false, note: 'L7 Application: trao payload cho application handler' },
]

const ICON_MAP: Record<TopologyIconKey, typeof Monitor> = {
  monitor: Monitor,
  router: RouterIcon,
  cloud: Cloud,
  globe: Globe,
  shield: Shield,
  loadbalancer: Network,
  server: Server,
}

interface Props {
  className?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Row y-top của stack theo OSI num (7 ở trên, 1 ở dưới).
function stackRowY(osi: number): number {
  const idx = 7 - osi // osi=7→idx=0; osi=1→idx=6
  return STACK_CONTENT_Y + idx * ROW_H
}
// Row center y
function stackRowCy(osi: number): number {
  return stackRowY(osi) + (ROW_H - ROW_GAP) / 2
}

// Intermediate node center x (idx 0..4)
function nodeCx(idx: number): number {
  return TOPO_X_START + idx * (NODE_W + NODE_GAP) + NODE_W / 2
}

// Build chip array tại step i của encap (outermost-first cho render)
function chipsAfterEncapStep(i: number): HeaderChip[] {
  const added = ENCAP_STEPS.slice(0, i + 1).filter((s) => s.header !== null)
  return [...added].reverse().map((s) => {
    const layer = OSI_LAYERS.find((o) => o.num === s.osi)!
    return { label: s.header!, fill: layer.fill, textColor: layer.text }
  })
}

const FULL_CHIPS: HeaderChip[] = (() => {
  const withH = ENCAP_STEPS.filter((s) => s.header !== null)
  return [...withH].reverse().map((s) => {
    const layer = OSI_LAYERS.find((o) => o.num === s.osi)!
    return { label: s.header!, fill: layer.fill, textColor: layer.text }
  })
})()

// ── Packet position computation ──────────────────────────────────────────────
interface PacketPos { x: number; y: number }

function packetPosEncap(step: number): PacketPos {
  const osi = ENCAP_STEPS[step].osi
  return { x: S_X + STACK_W / 2, y: stackRowCy(osi) }
}

function packetPosTransit(step: number): PacketPos {
  // step 0..4: di chuyển tới node i
  // exit sender L1 = (S_X + STACK_W, stackRowCy(1))
  // node i center = (nodeCx(i), TOPO_Y)
  // enter receiver L1 = (R_X, stackRowCy(1))
  return { x: nodeCx(step), y: TOPO_Y }
}

function packetPosDecap(step: number): PacketPos {
  const osi = DECAP_STEPS[step].osi
  return { x: R_X + STACK_W / 2, y: stackRowCy(osi) }
}

// ── Component ────────────────────────────────────────────────────────────────

export function OsiFlowState({ className }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const pausedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dẫn đường animation: phase + step quyết định packet pos + chip visibility.
  // note / activeLayerOsi / activeNodeIdx là derived state.
  const note = useMemo(() => {
    if (phase === 'encap') return ENCAP_STEPS[step].note
    if (phase === 'transit') {
      const node = TOPOLOGY_NODES.find((n) => n.id === INTERMEDIATE_IDS[step])!
      const layerList = node.layers.map((l) => `L${l}`).join('/')
      return `Transit — ${node.label} thao tác ${layerList}. ${node.desc}`
    }
    if (phase === 'decap') return DECAP_STEPS[step].note
    if (phase === 'done') return '✓ Server nhận data — vòng đời packet hoàn tất'
    return 'ĐÓNG GÓI — dữ liệu xuất phát từ ứng dụng Client'
  }, [phase, step])

  const packetPos = useMemo<PacketPos>(() => {
    if (phase === 'idle') return { x: S_X + STACK_W / 2, y: STACK_CONTENT_Y - 20 }
    if (phase === 'encap') return packetPosEncap(step)
    if (phase === 'transit') return packetPosTransit(step)
    if (phase === 'decap') return packetPosDecap(step)
    return { x: R_X + STACK_W / 2, y: stackRowCy(7) }
  }, [phase, step])

  const currentChips = useMemo<HeaderChip[]>(() => {
    if (phase === 'idle') return []
    if (phase === 'encap') return chipsAfterEncapStep(step)
    if (phase === 'transit') return FULL_CHIPS // bits, nhưng visual giữ chips full bên trong
    if (phase === 'decap') {
      if (step === 0) return FULL_CHIPS
      return FULL_CHIPS.slice(step)
    }
    return []
  }, [phase, step])

  const packetKind = useMemo<'data' | 'composed' | 'bits'>(() => {
    if (phase === 'idle') return 'data'
    if (phase === 'encap') {
      if (step === ENCAP_STEPS.length - 1) return 'bits' // L1 = bits
      return 'composed'
    }
    if (phase === 'transit') return 'bits'
    if (phase === 'decap') {
      if (step === 0) return 'bits'
      return 'composed'
    }
    return 'data'
  }, [phase, step])

  const activeSenderOsi = phase === 'encap' ? ENCAP_STEPS[step].osi : null
  const activeReceiverOsi = phase === 'decap' ? DECAP_STEPS[step].osi : null
  const activeNodeIdx = phase === 'transit' ? step : null

  const hasTrailer = useMemo(() => {
    if (phase === 'idle') return false
    if (phase === 'encap') return ENCAP_STEPS.slice(0, step + 1).some((s) => s.trailer)
    if (phase === 'transit') return true
    if (phase === 'decap') return step === 0 // chỉ bits giữ FCS
    return false
  }, [phase, step])

  // ── Animation driver ────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Imperative timeline using setTimeout chain + phase state.
  const runCycle = useCallback(() => {
    clearTimer()
    if (pausedRef.current) return

    // Start with encap step 0
    const runEncap = (i: number) => {
      if (pausedRef.current) return
      setPhase('encap')
      setStep(i)
      if (i < ENCAP_STEPS.length - 1) {
        timerRef.current = setTimeout(() => runEncap(i + 1), ENCAP_STEP_MS)
      } else {
        // Done encap → transit
        timerRef.current = setTimeout(() => runTransit(0), ENCAP_STEP_MS + INTER_PHASE_MS)
      }
    }
    const runTransit = (i: number) => {
      if (pausedRef.current) return
      setPhase('transit')
      setStep(i)
      if (i < INTERMEDIATE_IDS.length - 1) {
        timerRef.current = setTimeout(() => runTransit(i + 1), TRANSIT_STEP_MS)
      } else {
        timerRef.current = setTimeout(() => runDecap(0), TRANSIT_STEP_MS + INTER_PHASE_MS)
      }
    }
    const runDecap = (i: number) => {
      if (pausedRef.current) return
      setPhase('decap')
      setStep(i)
      if (i < DECAP_STEPS.length - 1) {
        timerRef.current = setTimeout(() => runDecap(i + 1), DECAP_STEP_MS)
      } else {
        timerRef.current = setTimeout(() => {
          if (pausedRef.current) return
          setPhase('done')
          timerRef.current = setTimeout(() => {
            if (pausedRef.current) return
            runCycle() // loop
          }, FINAL_HOLD_MS)
        }, DECAP_STEP_MS)
      }
    }

    // Initial delay then start
    timerRef.current = setTimeout(() => runEncap(0), 400)
  }, [clearTimer])

  const pause = useCallback(() => {
    pausedRef.current = true
    clearTimer()
  }, [clearTimer])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    // Resume từ state hiện tại — continue next step theo phase.
    const continueFromCurrent = () => {
      if (pausedRef.current) return
      if (phase === 'encap') {
        if (step < ENCAP_STEPS.length - 1) {
          timerRef.current = setTimeout(() => runCycle_resumeEncap(step + 1), ENCAP_STEP_MS / 2)
        } else {
          timerRef.current = setTimeout(() => runCycle_resumeTransit(0), INTER_PHASE_MS)
        }
      } else if (phase === 'transit') {
        if (step < INTERMEDIATE_IDS.length - 1) {
          timerRef.current = setTimeout(() => runCycle_resumeTransit(step + 1), TRANSIT_STEP_MS / 2)
        } else {
          timerRef.current = setTimeout(() => runCycle_resumeDecap(0), INTER_PHASE_MS)
        }
      } else if (phase === 'decap') {
        if (step < DECAP_STEPS.length - 1) {
          timerRef.current = setTimeout(() => runCycle_resumeDecap(step + 1), DECAP_STEP_MS / 2)
        } else {
          timerRef.current = setTimeout(() => {
            setPhase('done')
            timerRef.current = setTimeout(() => runCycle(), FINAL_HOLD_MS)
          }, DECAP_STEP_MS)
        }
      } else {
        runCycle()
      }
    }

    function runCycle_resumeEncap(i: number) {
      if (pausedRef.current) return
      setPhase('encap'); setStep(i)
      if (i < ENCAP_STEPS.length - 1)
        timerRef.current = setTimeout(() => runCycle_resumeEncap(i + 1), ENCAP_STEP_MS)
      else
        timerRef.current = setTimeout(() => runCycle_resumeTransit(0), ENCAP_STEP_MS + INTER_PHASE_MS)
    }
    function runCycle_resumeTransit(i: number) {
      if (pausedRef.current) return
      setPhase('transit'); setStep(i)
      if (i < INTERMEDIATE_IDS.length - 1)
        timerRef.current = setTimeout(() => runCycle_resumeTransit(i + 1), TRANSIT_STEP_MS)
      else
        timerRef.current = setTimeout(() => runCycle_resumeDecap(0), TRANSIT_STEP_MS + INTER_PHASE_MS)
    }
    function runCycle_resumeDecap(i: number) {
      if (pausedRef.current) return
      setPhase('decap'); setStep(i)
      if (i < DECAP_STEPS.length - 1)
        timerRef.current = setTimeout(() => runCycle_resumeDecap(i + 1), DECAP_STEP_MS)
      else
        timerRef.current = setTimeout(() => {
          setPhase('done')
          timerRef.current = setTimeout(() => runCycle(), FINAL_HOLD_MS)
        }, DECAP_STEP_MS)
    }

    continueFromCurrent()
  }, [phase, step, runCycle])

  const handleReset = useCallback(() => {
    pausedRef.current = false
    clearTimer()
    setPhase('idle')
    setStep(0)
    setIsPlaying(true)
    runCycle()
  }, [clearTimer, runCycle])

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      resume()
    }
  }, [isPlaying, pause, resume])

  const handleSkipToEnd = useCallback(() => {
    pausedRef.current = true
    clearTimer()
    setIsPlaying(false)
    setPhase('done')
    setStep(0)
  }, [clearTimer])

  useEffect(() => {
    pausedRef.current = false
    runCycle()
    return () => {
      pausedRef.current = true
      clearTimer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-lg font-semibold">
          Mô hình 3: Packet Journey — Encap ↓ / Transit → / Decap ↑
        </h3>
        <p className="text-sm text-muted-foreground">
          Bên gửi <span className="font-medium">(Client)</span> đóng gói L7→L1, bits đi qua network topology
          (Router → ISP → Internet → Firewall → LB), bên nhận <span className="font-medium">(Server)</span> bóc tách
          L1→L7. Mỗi hop highlight layer mà device operate.
        </p>
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      >
        {/* Title on top */}
        <text x={S_X + STACK_W / 2} y={40} textAnchor="middle" className="fill-foreground font-bold text-sm">
          CLIENT — Sender
        </text>
        <text x={R_X + STACK_W / 2} y={40} textAnchor="middle" className="fill-foreground font-bold text-sm">
          SERVER — Receiver
        </text>
        <text x={W / 2} y={40} textAnchor="middle" className="fill-foreground font-bold text-sm">
          Network Topology (transit)
        </text>

        {/* Sender stack */}
        <StackColumn side="sender" activeOsi={activeSenderOsi} />

        {/* Receiver stack */}
        <StackColumn side="receiver" activeOsi={activeReceiverOsi} />

        {/* Topology path connectors + nodes */}
        <TopologyLayer activeNodeIdx={activeNodeIdx} phase={phase} />

        {/* Packet group — animated via framer-motion */}
        <motion.g
          animate={{ x: packetPos.x, y: packetPos.y }}
          transition={{
            duration:
              phase === 'transit' ? TRANSIT_MOVE / 1000 :
              phase === 'encap'   ? ENCAP_MOVE / 1000 :
              phase === 'decap'   ? DECAP_MOVE / 1000 : 0.4,
            ease: 'easeInOut',
          }}
        >
          <PacketVisual kind={packetKind} chips={currentChips} hasTrailer={hasTrailer} />
        </motion.g>

        {/* Note bar at bottom */}
        <foreignObject x={24} y={H - 48} width={W - 48} height={36}>
          <div className="px-3 py-1.5 rounded-md bg-muted/60 border border-border text-xs text-foreground">
            <span className="font-semibold uppercase tracking-wide mr-2 text-muted-foreground">
              {phase === 'encap' ? '↓ ENCAP' : phase === 'transit' ? '→ TRANSIT' : phase === 'decap' ? '↑ DECAP' : phase === 'done' ? '✓ DONE' : '·'}
            </span>
            {note}
          </div>
        </foreignObject>
      </svg>

      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset} aria-label="Reset animation">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handleToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={handleSkipToEnd} aria-label="Tua tới cuối" title="Hiển thị end-state">
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Stack column (sender or receiver) ────────────────────────────────────────

function StackColumn({ side, activeOsi }: { side: 'sender' | 'receiver'; activeOsi: number | null }) {
  const baseX = side === 'sender' ? S_X : R_X
  return (
    <g>
      {OSI_LAYERS.map((o) => {
        const y = stackRowY(o.num)
        const isActive = activeOsi === o.num
        return (
          <g key={o.num}>
            {/* Row background */}
            <motion.rect
              x={baseX}
              y={y}
              width={STACK_W}
              height={ROW_H - ROW_GAP}
              rx={10}
              fill={o.fill}
              stroke={o.fill}
              strokeWidth={isActive ? 2.5 : 1.25}
              animate={{ opacity: isActive ? 0.75 : 0.18 }}
              transition={{ duration: 0.25 }}
            />
            {/* Layer badge L{num} */}
            <rect
              x={baseX + 10}
              y={y + (ROW_H - ROW_GAP) / 2 - 16}
              width={36}
              height={32}
              rx={5}
              fill={o.fill}
              opacity={0.95}
            />
            <text
              x={baseX + 10 + 18}
              y={y + (ROW_H - ROW_GAP) / 2 + 5}
              textAnchor="middle"
              fill={o.text}
              className="font-bold text-xs"
            >
              L{o.num}
            </text>
            {/* Layer name + short desc */}
            <text
              x={baseX + 58}
              y={y + (ROW_H - ROW_GAP) / 2 - 4}
              className="fill-foreground font-semibold text-sm"
            >
              {o.name}
            </text>
            <text
              x={baseX + 58}
              y={y + (ROW_H - ROW_GAP) / 2 + 14}
              className="fill-muted-foreground text-[10px]"
            >
              {o.shortDesc}
            </text>
            {/* PDU tag on right */}
            <rect
              x={baseX + STACK_W - 62}
              y={y + (ROW_H - ROW_GAP) / 2 - 11}
              width={54}
              height={22}
              rx={4}
              fill={o.fill}
              opacity={0.7}
            />
            <text
              x={baseX + STACK_W - 62 + 27}
              y={y + (ROW_H - ROW_GAP) / 2 + 4}
              textAnchor="middle"
              fill={o.text}
              className="font-bold text-[10px]"
            >
              {o.pdu}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ── Topology layer (intermediate hops + connectors) ──────────────────────────

function TopologyLayer({
  activeNodeIdx,
  phase,
}: {
  activeNodeIdx: number | null
  phase: Phase
}) {
  // Connector path: sender L1 right → curve → node 0 left → node 1 left → ... → node 4 right → curve → receiver L1 left
  const senderExit = { x: S_X + STACK_W, y: stackRowCy(1) }
  const receiverEntry = { x: R_X, y: stackRowCy(1) }

  // Build segments: sender-to-node0, node-to-node (x4), node4-to-receiver
  const segments: Array<{ d: string; idx: number }> = []
  // sender → node 0
  const n0x = nodeCx(0) - NODE_W / 2
  segments.push({
    idx: 0,
    d: `M ${senderExit.x},${senderExit.y} C ${senderExit.x + 80},${senderExit.y} ${n0x - 60},${TOPO_Y} ${n0x},${TOPO_Y}`,
  })
  for (let i = 0; i < INTERMEDIATE_IDS.length - 1; i++) {
    const xR = nodeCx(i) + NODE_W / 2
    const xL = nodeCx(i + 1) - NODE_W / 2
    segments.push({ idx: i + 1, d: `M ${xR},${TOPO_Y} L ${xL},${TOPO_Y}` })
  }
  // node 4 → receiver
  const n4rx = nodeCx(INTERMEDIATE_IDS.length - 1) + NODE_W / 2
  segments.push({
    idx: INTERMEDIATE_IDS.length,
    d: `M ${n4rx},${TOPO_Y} C ${n4rx + 60},${TOPO_Y} ${receiverEntry.x - 80},${receiverEntry.y} ${receiverEntry.x},${receiverEntry.y}`,
  })

  return (
    <g>
      {/* Connectors */}
      {segments.map((seg) => {
        // Segment idx i connects (i-1)→(i). Active when packet just arrived at node i (transit step i).
        // Hightlight logic: in transit, segment <= step+1 is "done" (strong), rest is "dim".
        const isDone =
          phase === 'transit' && activeNodeIdx !== null && seg.idx <= activeNodeIdx
        const isCurrent =
          phase === 'transit' && activeNodeIdx === seg.idx
        const isAfterTransit = phase === 'decap' || phase === 'done'
        const opacity = isDone || isAfterTransit ? 0.85 : isCurrent ? 1 : 0.35
        return (
          <motion.path
            key={seg.idx}
            d={seg.d}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={2}
            strokeDasharray="6,5"
            animate={{ opacity }}
            transition={{ duration: 0.3 }}
          />
        )
      })}

      {/* Arrowheads at end of each segment (simple triangle) */}
      {/* (optional — skip for KISS) */}

      {/* Nodes */}
      {INTERMEDIATE_IDS.map((id, idx) => {
        const node = TOPOLOGY_NODES.find((n) => n.id === id)!
        const cx = nodeCx(idx)
        const cy = TOPO_Y
        const isActive = activeNodeIdx === idx && phase === 'transit'
        return (
          <TopologyNodeVisual
            key={id}
            node={node}
            cx={cx}
            cy={cy}
            active={isActive}
          />
        )
      })}
    </g>
  )
}

function TopologyNodeVisual({
  node,
  cx,
  cy,
  active,
}: {
  node: (typeof TOPOLOGY_NODES)[number]
  cx: number
  cy: number
  active: boolean
}) {
  const Icon = ICON_MAP[node.icon]
  const x = cx - NODE_W / 2
  const y = cy - NODE_H / 2
  const layersLabel = node.layers.length > 2
    ? `L${node.layers[0]}-L${node.layers[node.layers.length - 1]}`
    : node.layers.map((l) => `L${l}`).join('/')
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        className="fill-card"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.25}
        animate={{
          opacity: active ? 1 : 0.7,
          // Active: glowing ring via filter. Simpler: scale + stroke.
        }}
        style={{
          filter: active ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.6))' : undefined,
        }}
      />
      {/* Icon via foreignObject */}
      <foreignObject x={cx - 18} y={y + 8} width={36} height={36}>
        <div className="flex items-center justify-center w-9 h-9 text-foreground">
          <Icon className="w-7 h-7" strokeWidth={1.75} />
        </div>
      </foreignObject>
      {/* Label */}
      <text x={cx} y={y + 58} textAnchor="middle" className="fill-foreground font-semibold text-xs">
        {node.label}
      </text>
      {node.sub && (
        <text x={cx} y={y + 72} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {node.sub}
        </text>
      )}
      {/* Layer badge - bottom-right of node */}
      <g>
        <rect
          x={cx + NODE_W / 2 - 40}
          y={y + NODE_H - 18}
          width={36}
          height={16}
          rx={3}
          className="fill-primary/20"
          stroke="currentColor"
          strokeWidth={active ? 1 : 0.5}
        />
        <text
          x={cx + NODE_W / 2 - 40 + 18}
          y={y + NODE_H - 6}
          textAnchor="middle"
          className="fill-foreground font-bold text-[9px]"
        >
          {layersLabel}
        </text>
      </g>
    </g>
  )
}

// ── Packet visual (data / composed / bits) ───────────────────────────────────

const CHIP_W = 28
const CHIP_H = 28
const PAYLOAD_W = 92

function PacketVisual({
  kind,
  chips,
  hasTrailer,
}: {
  kind: 'data' | 'composed' | 'bits'
  chips: HeaderChip[]
  hasTrailer: boolean
}) {
  if (kind === 'data') {
    // Simple DATA block
    const w = PAYLOAD_W
    return (
      <g transform={`translate(${-w / 2},${-CHIP_H / 2})`}>
        <rect width={w} height={CHIP_H} rx={4} fill="#e0e7ff" stroke="#6366f1" strokeWidth={1} />
        <text x={w / 2} y={CHIP_H / 2 + 5} textAnchor="middle" className="fill-indigo-900 font-bold text-xs">
          DATA
        </text>
      </g>
    )
  }
  if (kind === 'bits') {
    const w = 260
    return (
      <g transform={`translate(${-w / 2},${-CHIP_H / 2})`}>
        <rect width={w} height={CHIP_H} rx={4} fill="#f87171" opacity={0.35} stroke="#f87171" strokeWidth={1.5} />
        <text x={w / 2} y={CHIP_H / 2 + 5} textAnchor="middle" className="fill-foreground font-mono font-bold text-xs">
          01001010 11100101 01110011 10101100
        </text>
      </g>
    )
  }
  // Composed: chips + payload + optional trailer
  const totalW = chips.length * CHIP_W + PAYLOAD_W + (hasTrailer ? CHIP_W : 0)
  return (
    <g transform={`translate(${-totalW / 2},${-CHIP_H / 2})`}>
      <AnimatePresence initial={false}>
        {chips.map((c, i) => {
          const cx = i * CHIP_W
          return (
            <motion.g
              key={`${c.label}-${i}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.95, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25 }}
            >
              <rect x={cx} y={0} width={CHIP_W - 1} height={CHIP_H} rx={3} fill={c.fill} />
              <text
                x={cx + CHIP_W / 2}
                y={CHIP_H / 2 + 4}
                textAnchor="middle"
                fill={c.textColor}
                className="font-bold"
                fontSize={10}
              >
                {c.label}
              </text>
            </motion.g>
          )
        })}
      </AnimatePresence>
      <rect
        x={chips.length * CHIP_W}
        y={0}
        width={PAYLOAD_W}
        height={CHIP_H}
        rx={3}
        fill="#e0e7ff"
        stroke="#6366f1"
        strokeWidth={1}
      />
      <text
        x={chips.length * CHIP_W + PAYLOAD_W / 2}
        y={CHIP_H / 2 + 4}
        textAnchor="middle"
        className="fill-indigo-900 font-bold text-xs"
      >
        DATA
      </text>
      {hasTrailer && (
        <g>
          <rect
            x={chips.length * CHIP_W + PAYLOAD_W}
            y={0}
            width={CHIP_W - 1}
            height={CHIP_H}
            rx={3}
            fill="#fb923c"
          />
          <text
            x={chips.length * CHIP_W + PAYLOAD_W + CHIP_W / 2}
            y={CHIP_H / 2 + 4}
            textAnchor="middle"
            fill="#7c2d12"
            className="font-bold"
            fontSize={10}
          >
            FCS
          </text>
        </g>
      )}
    </g>
  )
}
