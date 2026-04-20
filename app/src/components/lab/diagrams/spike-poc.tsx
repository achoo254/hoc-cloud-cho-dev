/**
 * Phase 00 — D3 × Framer Motion integration spike
 * POC: 3 devices + 1 animated packet dot + Play/Pause
 * Temporary file — delete after phase-01 complete
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { scaleLinear } from 'd3-scale'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw } from 'lucide-react'

const DEVICES = ['Client', 'Router', 'Server'] as const
const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 200
const NODE_RADIUS = 30

type DeviceIdx = 0 | 1 | 2

export function SpikePoc() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentDevice, setCurrentDevice] = useState<DeviceIdx>(0)

  // D3 scale for X positions — pure math, no DOM manipulation
  const xScale = useMemo(
    () => scaleLinear().domain([0, DEVICES.length - 1]).range([80, CANVAS_WIDTH - 80]),
    []
  )

  const devicePositions = useMemo(
    () => DEVICES.map((_, i) => ({ x: xScale(i), y: CANVAS_HEIGHT / 2 })),
    [xScale]
  )

  // Animate packet through devices
  function handlePlay() {
    if (currentDevice >= 2) {
      setCurrentDevice(0)
    }
    setIsPlaying(true)
  }

  function handleReset() {
    setIsPlaying(false)
    setCurrentDevice(0)
  }

  function handleAnimationComplete() {
    if (currentDevice < 2) {
      setCurrentDevice((prev) => (prev + 1) as DeviceIdx)
    } else {
      setIsPlaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        D3 scaleLinear → Framer Motion animate. No DOM conflict test.
      </div>

      {/* SVG Canvas — D3 computes positions, Framer animates */}
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-border rounded-lg bg-muted/30"
      >
        {/* Connection lines */}
        {devicePositions.slice(0, -1).map((pos, i) => (
          <line
            key={`line-${i}`}
            x1={pos.x}
            y1={pos.y}
            x2={devicePositions[i + 1].x}
            y2={devicePositions[i + 1].y}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        ))}

        {/* Device nodes */}
        {devicePositions.map((pos, i) => (
          <g key={DEVICES[i]}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_RADIUS}
              className="fill-primary/10 stroke-primary"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              {DEVICES[i]}
            </text>
          </g>
        ))}

        {/* Animated packet dot — Framer Motion handles animation */}
        <motion.circle
          r={10}
          className="fill-emerald-500"
          animate={{
            cx: devicePositions[currentDevice].x,
            cy: devicePositions[currentDevice].y - NODE_RADIUS - 15,
          }}
          transition={{
            duration: isPlaying ? 0.8 : 0,
            ease: 'easeInOut',
          }}
          onAnimationComplete={isPlaying ? handleAnimationComplete : undefined}
        />
      </svg>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isPlaying ? 'secondary' : 'default'}
          onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
        >
          {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          Current: {DEVICES[currentDevice]}
        </span>
      </div>
    </div>
  )
}
