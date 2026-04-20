'use client'

/**
 * Network Topology Diagram with D3.js
 * Features: Device icons, path connections, packet animation with auto-loop
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { TopologyConfig, PacketConfig } from './types'
import { getNetworkIcon } from './network-icons'
import { renderToStaticMarkup } from 'react-dom/server'

interface NetworkTopologyProps {
  config: TopologyConfig
  className?: string
}

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 400
const ICON_SIZE = 48
const PACKET_RADIUS = 8

// Animation state for resume support
interface AnimationState {
  packetIdx: number
  segmentIdx: number
  position: { x: number; y: number } | null
}

export function NetworkTopology({ config, className }: NetworkTopologyProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const animationRef = useRef<number[]>([])
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track animation state for resume
  const animStateRef = useRef<AnimationState>({ packetIdx: 0, segmentIdx: 0, position: null })
  const isPausedRef = useRef(false)

  const width = config.width || DEFAULT_WIDTH
  const height = config.height || DEFAULT_HEIGHT
  const autoLoop = config.autoLoop ?? true
  const loopDelay = config.loopDelay ?? 1000

  // Get node position by ID
  const getNodePos = useCallback((nodeId: string) => {
    const node = config.nodes.find(n => n.id === nodeId)
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
  }, [config.nodes])

  // Build path between nodes for a packet
  const buildPacketPath = useCallback((packetPath: string[]) => {
    const points: { x: number; y: number }[] = []
    for (const nodeId of packetPath) {
      points.push(getNodePos(nodeId))
    }
    return points
  }, [getNodePos])

  // Animate packet along path with resume support
  const animatePacket = useCallback((
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    packet: PacketConfig,
    packetIdx: number,
    startSegment: number,
    startPos: { x: number; y: number } | null,
    onComplete: () => void
  ) => {
    const points = buildPacketPath(packet.path)
    if (points.length < 2) return

    const color = packet.color || '#22c55e'
    const speed = packet.speed || 800

    // Check if packet element already exists (resume case)
    const existingPacket = svg.select<SVGGElement>(`.packet-${packet.id}`)

    // Create or reuse packet element
    const packetEl = existingPacket.empty()
      ? svg.select('.packets-layer')
          .append('g')
          .attr('class', `packet packet-${packet.id}`)
      : existingPacket

    // Add circles only if new element
    if (existingPacket.empty()) {
      // Packet circle with glow effect
      packetEl.append('circle')
        .attr('r', PACKET_RADIUS)
        .attr('fill', color)
        .attr('filter', 'url(#glow)')

      // Inner dot
      packetEl.append('circle')
        .attr('r', PACKET_RADIUS / 3)
        .attr('fill', 'white')
    }

    let currentSegment = startSegment

    const animateSegment = () => {
      if (isPausedRef.current) return

      if (currentSegment >= points.length - 1) {
        packetEl.remove()
        animStateRef.current = { packetIdx: packetIdx + 1, segmentIdx: 0, position: null }
        onComplete()
        return
      }

      // Update state for resume
      animStateRef.current = { packetIdx, segmentIdx: currentSegment, position: points[currentSegment] }

      const start = startPos && currentSegment === startSegment ? startPos : points[currentSegment]
      const end = points[currentSegment + 1]

      packetEl
        .attr('transform', `translate(${start.x}, ${start.y})`)
        .transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attr('transform', `translate(${end.x}, ${end.y})`)
        .on('end', () => {
          currentSegment++
          startPos = null // Clear startPos after first segment
          animateSegment()
        })
    }

    animateSegment()
  }, [buildPacketPath])

  // Start or resume packet animations sequentially
  const startAnimations = useCallback((resume = false) => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    isPausedRef.current = false

    // If not resuming, reset state and clear packets
    if (!resume) {
      svg.select('.packets-layer').selectAll('.packet').remove()
      animStateRef.current = { packetIdx: 0, segmentIdx: 0, position: null }
    }

    const { packetIdx: startPacketIdx, segmentIdx: startSegment, position: startPos } = animStateRef.current

    const animateFromPacket = (pktIdx: number, segIdx: number, pos: { x: number; y: number } | null) => {
      if (pktIdx >= config.packets.length) {
        // All packets done, loop if enabled
        if (autoLoop && !isPausedRef.current) {
          loopTimeoutRef.current = setTimeout(() => {
            startAnimations(false)
          }, loopDelay)
        }
        return
      }

      const packet = config.packets[pktIdx]
      animatePacket(svg as any, packet, pktIdx, segIdx, pos, () => {
        // Small delay between packets for visual clarity
        const timeoutId = window.setTimeout(() => {
          if (!isPausedRef.current) {
            animateFromPacket(pktIdx + 1, 0, null)
          }
        }, 200)
        animationRef.current.push(timeoutId)
      })
    }

    // Start from saved state
    animateFromPacket(startPacketIdx, resume ? startSegment : 0, resume ? startPos : null)
  }, [config.packets, animatePacket, autoLoop, loopDelay])

  // Pause animations - keep packets in place and save position
  const pauseAnimations = useCallback(() => {
    isPausedRef.current = true
    animationRef.current.forEach(id => clearTimeout(id))
    animationRef.current = []
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current)
      loopTimeoutRef.current = null
    }
    const svg = d3.select(svgRef.current)

    // Capture current position before interrupting
    const packetEl = svg.select('.packets-layer').select('.packet')
    if (!packetEl.empty()) {
      const transform = packetEl.attr('transform')
      const match = transform?.match(/translate\(([^,]+),\s*([^)]+)\)/)
      if (match) {
        animStateRef.current.position = { x: parseFloat(match[1]), y: parseFloat(match[2]) }
      }
    }

    // Interrupt but don't remove
    svg.select('.packets-layer').selectAll('.packet').interrupt()
  }, [])

  // Stop and clear animations
  const stopAnimations = useCallback(() => {
    pauseAnimations()
    const svg = d3.select(svgRef.current)
    svg.select('.packets-layer').selectAll('.packet').remove()
  }, [pauseAnimations])

  // Reset and restart from beginning
  const handleReset = useCallback(() => {
    stopAnimations()
    animStateRef.current = { packetIdx: 0, segmentIdx: 0, position: null }
    setIsPlaying(true)
    setTimeout(() => startAnimations(false), 100)
  }, [stopAnimations, startAnimations])

  // Toggle play/pause with resume support
  const handleToggle = useCallback(() => {
    if (isPlaying) {
      pauseAnimations()
      setIsPlaying(false)
    } else {
      // Resume from paused position
      setIsPlaying(true)
      setTimeout(() => startAnimations(true), 50)
    }
  }, [isPlaying, pauseAnimations, startAnimations])

  // Initialize SVG and render static elements
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Defs for effects
    const defs = svg.append('defs')

    // Glow filter for packets
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

    // Arrow marker for links
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'currentColor')
      .attr('class', 'text-muted-foreground')

    // Links layer
    const linksLayer = svg.append('g').attr('class', 'links-layer')

    // Draw links
    config.links.forEach(link => {
      const source = getNodePos(link.source)
      const target = getNodePos(link.target)

      // Calculate offset to not overlap icons
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const offsetX = (dx / dist) * (ICON_SIZE / 2 + 5)
      const offsetY = (dy / dist) * (ICON_SIZE / 2 + 5)

      linksLayer.append('line')
        .attr('class', 'link')
        .attr('x1', source.x + offsetX)
        .attr('y1', source.y + offsetY)
        .attr('x2', target.x - offsetX)
        .attr('y2', target.y - offsetY)
        .attr('stroke', 'currentColor')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.4)
        .attr('marker-end', 'url(#arrowhead)')
    })

    // Nodes layer
    const nodesLayer = svg.append('g').attr('class', 'nodes-layer')

    // Draw nodes
    config.nodes.forEach(node => {
      const nodeGroup = nodesLayer.append('g')
        .attr('class', `node node-${node.id}`)
        .attr('transform', `translate(${node.x - ICON_SIZE / 2}, ${node.y - ICON_SIZE / 2})`)

      // Background circle for better visibility
      nodeGroup.append('circle')
        .attr('cx', ICON_SIZE / 2)
        .attr('cy', ICON_SIZE / 2)
        .attr('r', ICON_SIZE / 2 + 4)
        .attr('fill', 'currentColor')
        .attr('class', 'text-background')
        .attr('opacity', 0.8)

      // Render icon as foreignObject
      const IconComponent = getNetworkIcon(node.type)
      const iconHtml = renderToStaticMarkup(<IconComponent size={ICON_SIZE} />)

      nodeGroup.append('foreignObject')
        .attr('width', ICON_SIZE)
        .attr('height', ICON_SIZE)
        .html(`<div class="text-foreground">${iconHtml}</div>`)

      // Label
      nodeGroup.append('text')
        .attr('x', ICON_SIZE / 2)
        .attr('y', ICON_SIZE + 16)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-xs fill-muted-foreground font-medium')
        .text(node.label)
    })

    // Packets layer (on top)
    svg.append('g').attr('class', 'packets-layer')

  }, [config.nodes, config.links, getNodePos, width, height])

  // Initial animation start
  useEffect(() => {
    // Start animation on mount
    const timeoutId = setTimeout(() => startAnimations(false), 100)
    return () => {
      clearTimeout(timeoutId)
      pauseAnimations()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('space-y-4', className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      />

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handleToggle}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
