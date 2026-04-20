/**
 * Subnetting Walkthrough (SEE section for IPv4 lab)
 * Step-by-step visualization of dividing a /24 network into 4 /26 subnets.
 * Uses shared walkthrough components for consistency.
 */

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { useWalkthroughState, WalkthroughControls, NarrationPanel } from './shared'

interface SubnetBlock {
  id: number
  label: string
  network: string
  range: string
  gateway: string
  startAddr: number
}

interface WalkthroughFrame {
  title: string
  description: string
  highlightSubnets: number[]
  showBinary: boolean
  cidr?: number // CIDR prefix length (e.g., 24, 26, 28)
  binaryHighlight?: { octet: number; bits: [number, number] }
}

const BASE_CIDR = 24

function generateSubnetBlocks(baseCidr: number, targetCidr: number): SubnetBlock[] {
  if (targetCidr <= baseCidr) return []

  const subnetCount = Math.pow(2, targetCidr - baseCidr)
  const blockSize = Math.pow(2, 32 - targetCidr)
  const subnets: SubnetBlock[] = []

  // Limit display to max 8 subnets for UI clarity
  const displayCount = Math.min(subnetCount, 8)

  for (let i = 0; i < displayCount; i++) {
    const startAddr = i * blockSize
    const endAddr = startAddr + blockSize - 1
    const usableStart = startAddr + 1
    const usableEnd = endAddr - 1

    subnets.push({
      id: i,
      label: `Subnet ${i + 1}`,
      network: `192.168.10.${startAddr}/${targetCidr}`,
      range: `.${usableStart} — .${usableEnd}`,
      gateway: `.${usableStart}`,
      startAddr,
    })
  }

  return subnets
}

const WALKTHROUGH_FRAMES: WalkthroughFrame[] = [
  {
    title: 'Bắt đầu: /24 network',
    description: '192.168.10.0/24 có 256 địa chỉ (254 usable). Mục tiêu: chia thành 4 subnet.',
    highlightSubnets: [],
    showBinary: true,
    cidr: 24,
  },
  {
    title: 'Bước 1: Tính số bit cần mượn',
    description: 'Cần 4 subnet → mượn 2 bit từ host (2² = 4). /24 + 2 = /26.',
    highlightSubnets: [],
    showBinary: true,
    cidr: 26,
    binaryHighlight: { octet: 3, bits: [0, 2] },
  },
  {
    title: 'Bước 2: Tính block size',
    description: '/26 có 6 host bits → 2⁶ = 64 địa chỉ/subnet. Block size = 64.',
    highlightSubnets: [0],
    showBinary: true,
    cidr: 26,
  },
  {
    title: 'Bước 3: Subnet 1 (0-63)',
    description: 'Network: .0, Broadcast: .63, Usable: .1 — .62 (62 hosts)',
    highlightSubnets: [0],
    showBinary: true,
    cidr: 26,
  },
  {
    title: 'Bước 4: Subnet 2 (64-127)',
    description: 'Network: .64, Broadcast: .127, Usable: .65 — .126 (62 hosts)',
    highlightSubnets: [0, 1],
    showBinary: true,
    cidr: 26,
  },
  {
    title: 'Bước 5: Subnet 3 (128-191)',
    description: 'Network: .128, Broadcast: .191, Usable: .129 — .190 (62 hosts)',
    highlightSubnets: [0, 1, 2],
    showBinary: true,
    cidr: 26,
  },
  {
    title: 'Bước 6: Subnet 4 (192-255)',
    description: 'Network: .192, Broadcast: .255, Usable: .193 — .254 (62 hosts)',
    highlightSubnets: [0, 1, 2, 3],
    showBinary: true,
    cidr: 26,
  },
  {
    title: 'Hoàn tất: 4 subnet /26',
    description: 'Từ 1 × /24 (254 hosts) → 4 × /26 (62 hosts mỗi subnet). Subnet mask: 255.255.255.192',
    highlightSubnets: [0, 1, 2, 3],
    showBinary: true,
    cidr: 26,
    binaryHighlight: { octet: 3, bits: [0, 2] },
  },
]

function generateBinaryMask(cidr: number): string {
  const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr)
  return [bits.slice(0, 8), bits.slice(8, 16), bits.slice(16, 24), bits.slice(24, 32)].join('.')
}

function cidrToDecimalMask(cidr: number): string {
  const mask = (0xffffffff << (32 - cidr)) >>> 0
  return [
    (mask >>> 24) & 0xff,
    (mask >>> 16) & 0xff,
    (mask >>> 8) & 0xff,
    mask & 0xff,
  ].join('.')
}

interface BinaryMaskDisplayProps {
  cidr: number
  editable?: boolean
  onCidrChange?: (cidr: number) => void
  highlight?: { octet: number; bits: [number, number] }
}

function BinaryMaskDisplay({ cidr, editable = false, onCidrChange, highlight }: BinaryMaskDisplayProps) {
  const maskBits = generateBinaryMask(cidr)
  const octets = maskBits.split('.')
  const hostBits = 32 - cidr
  const decimalMask = cidrToDecimalMask(cidr)
  const totalHosts = Math.pow(2, hostBits)
  const usableHosts = Math.max(0, totalHosts - 2)

  return (
    <div className="font-mono text-xs bg-muted/50 p-3 rounded-lg space-y-3">
      {editable && (
        <div className="flex items-center justify-center gap-3">
          <label className="text-muted-foreground">CIDR:</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">/{cidr}</span>
            <input
              type="range"
              min={8}
              max={30}
              value={cidr}
              onChange={(e) => onCidrChange?.(Number(e.target.value))}
              className="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      )}

      <div className="flex justify-center gap-1">
        {octets.map((octet, octetIdx) => (
          <div key={octetIdx} className="flex">
            {octet.split('').map((bit, bitIdx) => {
              const isHighlighted =
                highlight &&
                octetIdx === highlight.octet &&
                bitIdx >= highlight.bits[0] &&
                bitIdx < highlight.bits[1]
              return (
                <span
                  key={bitIdx}
                  className={cn(
                    'w-3 h-5 flex items-center justify-center rounded-sm',
                    bit === '1' ? 'bg-emerald-500/30 text-emerald-600' : 'bg-amber-500/30 text-amber-600',
                    isHighlighted && 'ring-2 ring-primary'
                  )}
                >
                  {bit}
                </span>
              )
            })}
            {octetIdx < 3 && <span className="mx-0.5 text-muted-foreground">.</span>}
          </div>
        ))}
      </div>

      <div className="text-center space-y-1">
        <p className="text-muted-foreground">
          /{cidr} = {cidr} bits network (green) + {hostBits} bits host (orange)
        </p>
        {editable && (
          <p className="text-muted-foreground">
            Subnet mask: <span className="text-foreground font-medium">{decimalMask}</span>
            {' · '}
            Hosts: <span className="text-foreground font-medium">{usableHosts.toLocaleString()}</span> usable
          </p>
        )}
      </div>
    </div>
  )
}

const SUBNET_FILL_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 120

interface SubnetVisualizationProps {
  subnets: SubnetBlock[]
  highlightSubnets: number[]
  prefersReducedMotion: boolean
  svgRef: React.RefObject<SVGSVGElement>
}

function SubnetVisualization({ subnets, highlightSubnets, prefersReducedMotion, svgRef }: SubnetVisualizationProps) {
  const subnetCount = subnets.length
  const barWidth = subnetCount > 0 ? CANVAS_WIDTH / subnetCount : CANVAS_WIDTH
  const barHeight = 48

  // Generate address markers based on subnets
  const markers = subnets.length > 0
    ? [...subnets.map(s => `.${s.startAddr}`), '.255']
    : ['.0', '.255']

  return (
    <div className="space-y-2">
      <svg
        ref={svgRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="w-full max-w-[600px] mx-auto border border-border rounded-lg bg-background"
      >
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="fill-muted/30" />

        {subnets.map((subnet, idx) => {
          const isHighlighted = highlightSubnets.includes(subnet.id)
          const x = idx * barWidth
          return (
            <g key={subnet.id}>
              <motion.rect
                x={x}
                y={10}
                width={barWidth - 2}
                height={barHeight}
                fill={SUBNET_FILL_COLORS[idx % SUBNET_FILL_COLORS.length]}
                initial={prefersReducedMotion ? false : { opacity: 0.3, scaleY: 0.5 }}
                animate={{
                  opacity: isHighlighted ? 1 : 0.3,
                  scaleY: isHighlighted ? 1 : 0.5,
                }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                style={{ originY: 1, transformOrigin: `${x + barWidth / 2}px ${10 + barHeight}px` }}
                rx={4}
              />
              {isHighlighted && barWidth > 40 && (
                <text
                  x={x + barWidth / 2}
                  y={38}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium"
                  style={{ fontSize: barWidth > 80 ? '12px' : '10px' }}
                >
                  {subnet.label}
                </text>
              )}
            </g>
          )
        })}

        {markers.map((label, idx) => (
          <text
            key={`${label}-${idx}`}
            x={idx === markers.length - 1 ? CANVAS_WIDTH - 10 : idx * barWidth + 5}
            y={CANVAS_HEIGHT - 8}
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {label}
          </text>
        ))}

        {subnets.slice(1).map((_, idx) => (
          <line
            key={idx}
            x1={(idx + 1) * barWidth}
            y1={10}
            x2={(idx + 1) * barWidth}
            y2={10 + barHeight}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeDasharray="2 2"
          />
        ))}
      </svg>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <AnimatePresence>
          {subnets.map((subnet, idx) => {
            const isHighlighted = highlightSubnets.includes(subnet.id)
            if (!isHighlighted) return null

            return (
              <motion.div
                key={subnet.id}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
                className="rounded-lg border-2 p-2 text-xs"
                style={{ borderColor: `${SUBNET_FILL_COLORS[idx % SUBNET_FILL_COLORS.length]}50` }}
              >
                <div className="font-medium" style={{ color: SUBNET_FILL_COLORS[idx % SUBNET_FILL_COLORS.length] }}>
                  {subnet.label}
                </div>
                <div className="font-mono text-muted-foreground">{subnet.network}</div>
                <div className="text-muted-foreground">Usable: {subnet.range}</div>
                <div className="text-muted-foreground">GW: {subnet.gateway}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface SubnettingWalkthroughProps {
  labSlug?: string
}

export function SubnettingWalkthrough({ labSlug = 'subnet-cidr' }: SubnettingWalkthroughProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [userCidr, setUserCidr] = useState<number | null>(null)

  const { state, dispatch, totalFrames } = useWalkthroughState({
    totalFrames: WALKTHROUGH_FRAMES.length,
    baseDuration: 3000,
    initialSpeed: 1,
  })

  const currentFrame = WALKTHROUGH_FRAMES[state.frameIdx]
  const displayCidr = userCidr ?? currentFrame.cidr ?? 26

  // Generate subnets dynamically based on current CIDR
  const dynamicSubnets = generateSubnetBlocks(BASE_CIDR, displayCidr)

  // Scale highlightSubnets to match dynamic subnet count
  const maxHighlight = Math.min(
    currentFrame.highlightSubnets.length > 0 ? Math.max(...currentFrame.highlightSubnets) + 1 : 0,
    dynamicSubnets.length
  )
  const dynamicHighlights = dynamicSubnets.slice(0, maxHighlight).map(s => s.id)

  return (
    <div className="space-y-4">
      <NarrationPanel
        content={{
          what: currentFrame.title,
          why: currentFrame.description,
        }}
      />

      {currentFrame.showBinary && (
        <BinaryMaskDisplay
          cidr={displayCidr}
          editable={true}
          onCidrChange={setUserCidr}
          highlight={currentFrame.binaryHighlight}
        />
      )}

      <SubnetVisualization
        subnets={dynamicSubnets}
        highlightSubnets={dynamicHighlights}
        prefersReducedMotion={prefersReducedMotion}
        svgRef={svgRef}
      />

      <WalkthroughControls
        state={state}
        dispatch={dispatch}
        totalFrames={totalFrames}
        svgRef={svgRef}
        labSlug={labSlug}
        showExport={true}
        speedOptions={[0.5, 1, 2]}
      />
    </div>
  )
}
