/**
 * Packet Journey story mode (SEE section)
 * Phase 03: Timeline-based animation with 4 devices and narration panel.
 *
 * State: { frameIdx, isPlaying, speed }
 * Controls: Play/Pause, Prev/Next, Speed selector, Timeline scrubber
 * Keyboard: ← Prev, → Next, Space toggle play (RED TEAM #5)
 */

import { useReducer, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TCP_IP_FRAMES, type DeviceId } from './frame-mapper'
import { ExportButton } from './export-button'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

// Device layout
const DEVICES: { id: DeviceId; label: string; x: number }[] = [
  { id: 'client', label: 'Client', x: 60 },
  { id: 'dnsServer', label: 'DNS', x: 220 },
  { id: 'router', label: 'Router', x: 380 },
  { id: 'server', label: 'Server', x: 540 },
]

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 200
const DEVICE_Y = 100

// Reducer state machine
interface State {
  frameIdx: number
  isPlaying: boolean
  speed: number
  animationId: number // monotonic ID for animation token (RED TEAM #3)
}

type Action =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SEEK'; idx: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TICK' }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false, animationId: state.animationId + 1 }
    case 'NEXT':
      return {
        ...state,
        frameIdx: Math.min(state.frameIdx + 1, TCP_IP_FRAMES.length - 1),
        animationId: state.animationId + 1,
      }
    case 'PREV':
      return {
        ...state,
        frameIdx: Math.max(state.frameIdx - 1, 0),
        animationId: state.animationId + 1,
      }
    case 'SEEK':
      return {
        ...state,
        frameIdx: action.idx,
        animationId: state.animationId + 1,
      }
    case 'SET_SPEED':
      return { ...state, speed: action.speed }
    case 'TICK':
      if (state.frameIdx >= TCP_IP_FRAMES.length - 1) {
        return { ...state, isPlaying: false }
      }
      return { ...state, frameIdx: state.frameIdx + 1 }
    case 'RESET':
      return { ...state, frameIdx: 0, isPlaying: false, animationId: state.animationId + 1 }
    default:
      return state
  }
}

interface PacketJourneyProps {
  labSlug?: string
}

export function PacketJourney({ labSlug = 'tcp-ip-packet-journey' }: PacketJourneyProps) {
  const [state, dispatch] = useReducer(reducer, {
    frameIdx: 0,
    isPlaying: false,
    speed: 1,
    animationId: 0,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const currentFrame = TCP_IP_FRAMES[state.frameIdx]

  // Auto-advance timer (RED TEAM #3 — cleanup on unmount)
  useEffect(() => {
    if (!state.isPlaying) return
    const baseDuration = 2000
    const id = setTimeout(() => {
      dispatch({ type: 'TICK' })
    }, baseDuration / state.speed)
    return () => clearTimeout(id)
  }, [state.isPlaying, state.frameIdx, state.speed])

  // Keyboard handlers (RED TEAM #5)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const skipTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']
    if (skipTags.includes(target.tagName) || target.isContentEditable) return

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        dispatch({ type: 'PREV' })
        break
      case 'ArrowRight':
        e.preventDefault()
        dispatch({ type: 'NEXT' })
        break
      case ' ':
        e.preventDefault()
        dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })
        break
    }
  }, [state.isPlaying])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Get packet position for current frame
  const packetPos = currentFrame?.packetPath?.[0]
  const packetDevice = packetPos ? DEVICES.find((d) => d.id === packetPos.device) : null

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Narration panel */}
      <div
        className="p-4 rounded-lg bg-muted/50 border border-border"
        aria-live="polite"
      >
        <p className="font-medium">{currentFrame?.narration.what}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {currentFrame?.narration.why}
        </p>
      </div>

      {/* Canvas with devices */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-[600px] mx-auto border border-border rounded-lg bg-background"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        >
          {/* Connection lines */}
          {DEVICES.slice(0, -1).map((device, i) => (
            <line
              key={`line-${device.id}`}
              x1={device.x}
              y1={DEVICE_Y}
              x2={DEVICES[i + 1].x}
              y2={DEVICE_Y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          ))}

          {/* Devices */}
          {DEVICES.map((device) => (
            <g key={device.id}>
              <circle
                cx={device.x}
                cy={DEVICE_Y}
                r={28}
                className={cn(
                  'fill-primary/10 stroke-primary transition-colors',
                  currentFrame?.highlight?.device === device.id && 'fill-primary/30 stroke-2'
                )}
                strokeWidth={currentFrame?.highlight?.device === device.id ? 3 : 2}
              />
              <text
                x={device.x}
                y={DEVICE_Y + 4}
                textAnchor="middle"
                className="fill-foreground text-xs font-medium"
              >
                {device.label}
              </text>
              {/* Layer indicators */}
              <text
                x={device.x}
                y={DEVICE_Y + 50}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                L1-L4
              </text>
            </g>
          ))}

          {/* Animated packet */}
          {packetDevice && !currentFrame?.isNarrationOnly && (
            <motion.g
              animate={{
                x: packetDevice.x,
                y: DEVICE_Y - 45,
              }}
              transition={{
                duration: prefersReducedMotion ? 0 : (state.isPlaying ? 0.5 : 0),
                ease: 'easeInOut',
              }}
            >
              <circle r={12} className="fill-emerald-500" />
              <text
                y={4}
                textAnchor="middle"
                className="fill-white text-[8px] font-bold"
              >
                PKT
              </text>
            </motion.g>
          )}
        </svg>
      </div>

      {/* Timeline scrubber */}
      <div className="space-y-2">
        <input
          type="range"
          value={state.frameIdx}
          min={0}
          max={TCP_IP_FRAMES.length - 1}
          step={1}
          onChange={(e) => dispatch({ type: 'SEEK', idx: Number(e.target.value) })}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          aria-label="Timeline"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {state.frameIdx + 1}</span>
          <span>{TCP_IP_FRAMES.length} steps</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'RESET' })}
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'PREV' })}
          disabled={state.frameIdx === 0}
          aria-label="Previous step"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'NEXT' })}
          disabled={state.frameIdx === TCP_IP_FRAMES.length - 1}
          aria-label="Next step"
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-4">
          {[0.5, 1, 2].map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={state.speed === speed ? 'default' : 'ghost'}
              onClick={() => dispatch({ type: 'SET_SPEED', speed })}
              className="text-xs px-2"
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Export button (Phase 06) */}
        <ExportButton
          svgRef={svgRef}
          labSlug={labSlug}
          frameIdx={state.frameIdx}
        />
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-center text-muted-foreground">
        ← → to navigate, Space to play/pause
      </p>
    </div>
  )
}
