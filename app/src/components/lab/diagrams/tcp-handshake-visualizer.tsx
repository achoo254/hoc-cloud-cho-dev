'use client'

/**
 * TCP Handshake Visualizer - D3.js animated comparison of TCP vs UDP
 * Shows 3-way handshake for TCP, fire-and-forget for UDP
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface TcpHandshakeVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 400
const CLIENT_X = 120
const SERVER_X = 580
const TIMELINE_Y_START = 100
const TIMELINE_Y_END = 350
const PACKET_RADIUS = 8

interface Scene {
  id: string
  title: string
  description: string
  protocol: 'tcp' | 'udp'
  steps: PacketStep[]
}

interface PacketStep {
  from: 'client' | 'server'
  label: string
  flag?: string
  color: string
  delay: number
  duration: number
}

const SCENES: Scene[] = [
  {
    id: 'tcp-handshake',
    title: 'TCP 3-Way Handshake',
    description: 'TCP thiết lập kết nối qua 3 bước: SYN → SYN-ACK → ACK. Chỉ sau khi cả 2 bên xác nhận, data mới được gửi.',
    protocol: 'tcp',
    steps: [
      { from: 'client', label: 'SYN', flag: '[S]', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', label: 'SYN-ACK', flag: '[S.]', color: '#22c55e', delay: 900, duration: 800 },
      { from: 'client', label: 'ACK', flag: '[.]', color: '#3b82f6', delay: 1800, duration: 800 },
      { from: 'client', label: 'DATA', flag: '[P.]', color: '#8b5cf6', delay: 2800, duration: 600 },
    ],
  },
  {
    id: 'udp-fire-forget',
    title: 'UDP Fire-and-Forget',
    description: 'UDP gửi data thẳng không cần handshake. Nhanh hơn nhưng không đảm bảo delivery.',
    protocol: 'udp',
    steps: [
      { from: 'client', label: 'DATA', color: '#f59e0b', delay: 0, duration: 600 },
      { from: 'client', label: 'DATA', color: '#f59e0b', delay: 700, duration: 600 },
      { from: 'client', label: 'DATA', color: '#f59e0b', delay: 1400, duration: 600 },
    ],
  },
  {
    id: 'tcp-close',
    title: 'TCP Connection Close (FIN)',
    description: 'TCP đóng kết nối có trật tự: FIN → FIN-ACK → ACK. Socket vào TIME_WAIT ~60s sau khi đóng.',
    protocol: 'tcp',
    steps: [
      { from: 'client', label: 'FIN', flag: '[F.]', color: '#ef4444', delay: 0, duration: 800 },
      { from: 'server', label: 'FIN-ACK', flag: '[F.]', color: '#22c55e', delay: 900, duration: 800 },
      { from: 'client', label: 'ACK', flag: '[.]', color: '#3b82f6', delay: 1800, duration: 800 },
    ],
  },
  {
    id: 'tcp-refused',
    title: 'TCP Connection Refused',
    description: 'Khi không có process listen port, server kernel gửi RST ngay → "Connection refused".',
    protocol: 'tcp',
    steps: [
      { from: 'client', label: 'SYN', flag: '[S]', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', label: 'RST', flag: '[R]', color: '#ef4444', delay: 900, duration: 600 },
    ],
  },
  {
    id: 'tcp-timeout',
    title: 'TCP Connection Timeout',
    description: 'Khi firewall DROP packet, SYN không bao giờ nhận được response → "Connection timeout".',
    protocol: 'tcp',
    steps: [
      { from: 'client', label: 'SYN', flag: '[S]', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'client', label: 'SYN (retry)', flag: '[S]', color: '#3b82f6', delay: 1500, duration: 800 },
      { from: 'client', label: 'SYN (retry)', flag: '[S]', color: '#3b82f6', delay: 3000, duration: 800 },
    ],
  },
  {
    id: 'udp-no-listener',
    title: 'UDP Port Unreachable',
    description: 'UDP gửi đến port không listen → kernel gửi ICMP Port Unreachable (nếu không bị firewall block).',
    protocol: 'udp',
    steps: [
      { from: 'client', label: 'DATA', color: '#f59e0b', delay: 0, duration: 600 },
      { from: 'server', label: 'ICMP', flag: 'Port Unreachable', color: '#ef4444', delay: 700, duration: 600 },
    ],
  },
]

export function TcpHandshakeVisualizer({ className }: TcpHandshakeVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const currentScene = useMemo(() => SCENES[sceneIdx], [sceneIdx])

  const stopAnimation = useCallback(() => {
    animationRef.current.forEach(clearTimeout)
    animationRef.current = []
    const svg = d3.select(svgRef.current)
    svg.selectAll('.packet').interrupt().remove()
    svg.selectAll('.packet-label').interrupt().remove()
    svg.selectAll('.timeline-marker').interrupt().remove()
  }, [])

  const animateScene = useCallback((scene: Scene) => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    // Clear previous
    svg.selectAll('.packet').remove()
    svg.selectAll('.packet-label').remove()
    svg.selectAll('.timeline-marker').remove()

    const packetsLayer = svg.select('.packets-layer')
    const stepHeight = (TIMELINE_Y_END - TIMELINE_Y_START) / (scene.steps.length + 1)

    scene.steps.forEach((step, idx) => {
      const timeout = setTimeout(() => {
        const startX = step.from === 'client' ? CLIENT_X : SERVER_X
        const endX = step.from === 'client' ? SERVER_X : CLIENT_X
        const y = TIMELINE_Y_START + stepHeight * (idx + 1)

        // Packet circle
        const packet = packetsLayer.append('g')
          .attr('class', 'packet')
          .attr('transform', `translate(${startX}, ${y})`)

        packet.append('circle')
          .attr('r', PACKET_RADIUS)
          .attr('fill', step.color)
          .attr('filter', 'url(#glow)')

        packet.append('circle')
          .attr('r', PACKET_RADIUS / 3)
          .attr('fill', 'white')

        // Animate packet
        packet
          .transition()
          .duration(step.duration)
          .ease(d3.easeLinear)
          .attr('transform', `translate(${endX}, ${y})`)
          .on('end', function() {
            // Ripple effect at destination
            const ripple = packetsLayer.append('circle')
              .attr('class', 'packet')
              .attr('cx', endX)
              .attr('cy', y)
              .attr('r', PACKET_RADIUS)
              .attr('fill', 'none')
              .attr('stroke', step.color)
              .attr('stroke-width', 2)

            ripple
              .transition()
              .duration(400)
              .attr('r', PACKET_RADIUS * 3)
              .style('opacity', 0)
              .remove()
          })

        // Label
        const labelX = (startX + endX) / 2
        const labelY = y - 15
        const label = packetsLayer.append('text')
          .attr('class', 'packet-label')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('fill', step.color)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .style('opacity', 0)
          .text(step.label)

        label
          .transition()
          .duration(200)
          .style('opacity', 1)

        // Flag label (smaller, below)
        if (step.flag) {
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', labelX)
            .attr('y', labelY + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .style('opacity', 0)
            .text(step.flag)
            .transition()
            .duration(200)
            .style('opacity', 0.7)
        }

        // Timeline marker
        const marker = packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', CLIENT_X)
          .attr('y1', y)
          .attr('x2', SERVER_X)
          .attr('y2', y)
          .attr('stroke', step.color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4')
          .style('opacity', 0)

        marker
          .transition()
          .delay(step.duration)
          .duration(200)
          .style('opacity', 0.3)
      }, step.delay)

      animationRef.current.push(timeout)
    })
  }, [])

  // Initialize SVG
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Defs
    const defs = svg.append('defs')

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Background
    svg.append('rect')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('fill', 'transparent')

    // Static elements layer
    const staticLayer = svg.append('g').attr('class', 'static-layer')

    // Client box
    staticLayer.append('rect')
      .attr('x', CLIENT_X - 50)
      .attr('y', 30)
      .attr('width', 100)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', 'currentColor')
      .attr('class', 'text-muted')
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', CLIENT_X)
      .attr('y', 60)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Client')

    // Server box
    staticLayer.append('rect')
      .attr('x', SERVER_X - 50)
      .attr('y', 30)
      .attr('width', 100)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', 'currentColor')
      .attr('class', 'text-muted')
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', SERVER_X)
      .attr('y', 60)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Server')

    // Client timeline
    staticLayer.append('line')
      .attr('x1', CLIENT_X)
      .attr('y1', TIMELINE_Y_START)
      .attr('x2', CLIENT_X)
      .attr('y2', TIMELINE_Y_END)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-muted-foreground')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8 4')

    // Server timeline
    staticLayer.append('line')
      .attr('x1', SERVER_X)
      .attr('y1', TIMELINE_Y_START)
      .attr('x2', SERVER_X)
      .attr('y2', TIMELINE_Y_END)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-muted-foreground')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8 4')

    // Time arrow
    staticLayer.append('text')
      .attr('x', 50)
      .attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground')
      .attr('font-size', '12px')
      .attr('transform', `rotate(-90, 50, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    // Packets layer (on top)
    svg.append('g').attr('class', 'packets-layer')
  }, [])

  // Update protocol indicator
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.select('.protocol-indicator').remove()

    const color = currentScene.protocol === 'tcp' ? '#3b82f6' : '#f59e0b'
    const label = currentScene.protocol.toUpperCase()

    const indicator = svg.select('.static-layer').append('g')
      .attr('class', 'protocol-indicator')

    indicator.append('rect')
      .attr('x', (CLIENT_X + SERVER_X) / 2 - 30)
      .attr('y', 35)
      .attr('width', 60)
      .attr('height', 24)
      .attr('rx', 12)
      .attr('fill', color)
      .attr('opacity', 0.2)

    indicator.append('text')
      .attr('x', (CLIENT_X + SERVER_X) / 2)
      .attr('y', 52)
      .attr('text-anchor', 'middle')
      .attr('fill', color)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(label)
  }, [currentScene])

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      animateScene(currentScene)
      const totalDuration = Math.max(...currentScene.steps.map(s => s.delay + s.duration)) + 500
      const timeout = setTimeout(() => {
        setIsPlaying(false)
      }, totalDuration)
      return () => clearTimeout(timeout)
    }
  }, [isPlaying, currentScene, animateScene])

  const handlePlay = () => {
    stopAnimation()
    setIsPlaying(true)
  }

  const handlePrev = () => {
    stopAnimation()
    setIsPlaying(false)
    setSceneIdx((prev) => (prev - 1 + SCENES.length) % SCENES.length)
  }

  const handleNext = () => {
    stopAnimation()
    setIsPlaying(false)
    setSceneIdx((prev) => (prev + 1) % SCENES.length)
  }

  const handleReset = () => {
    stopAnimation()
    setIsPlaying(false)
    setSceneIdx(0)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* SVG Animation Area */}
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      />

      {/* Narration */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-1">{currentScene.title}</h4>
        <p className="text-sm text-muted-foreground">{currentScene.description}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset} title="Reset">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrev} title="Scene trước">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handlePlay} disabled={isPlaying}>
          <Play className="w-4 h-4 mr-1" />
          Play
        </Button>
        <Button size="sm" variant="outline" onClick={handleNext} title="Scene sau">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {sceneIdx + 1}/{SCENES.length}
        </span>
      </div>

      {/* Scene quick select */}
      <div className="flex flex-wrap justify-center gap-1">
        {SCENES.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => {
              stopAnimation()
              setIsPlaying(false)
              setSceneIdx(idx)
            }}
            className={cn(
              'text-xs px-2 py-1 rounded transition-colors',
              idx === sceneIdx
                ? scene.protocol === 'tcp'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title.replace('TCP ', '').replace('UDP ', '')}
          </button>
        ))}
      </div>
    </div>
  )
}
