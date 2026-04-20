'use client'

/**
 * ICMP Ping Visualizer - D3.js animated scenarios for ICMP protocol
 * Shows: ping echo, traceroute TTL trick, ICMP errors, RTT measurement
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface IcmpPingVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 420
const CLIENT_X = 100
const SERVER_X = 600
const ROUTER1_X = 280
const ROUTER2_X = 420
const TIMELINE_Y_START = 120
const TIMELINE_Y_END = 380
const PACKET_RADIUS = 8

interface Scene {
  id: string
  title: string
  description: string
  type: 'ping' | 'traceroute' | 'error'
  showRouters?: boolean
  steps: PacketStep[]
}

interface PacketStep {
  from: 'client' | 'router1' | 'router2' | 'server'
  to: 'client' | 'router1' | 'router2' | 'server'
  label: string
  subLabel?: string
  color: string
  delay: number
  duration: number
  lost?: boolean
}

const getX = (node: string): number => {
  switch (node) {
    case 'client': return CLIENT_X
    case 'router1': return ROUTER1_X
    case 'router2': return ROUTER2_X
    case 'server': return SERVER_X
    default: return CLIENT_X
  }
}

const SCENES: Scene[] = [
  {
    id: 'ping-basic',
    title: 'Ping Echo Request/Reply',
    description: 'Ping gửi ICMP Type 8 (Echo Request) và nhận Type 0 (Echo Reply). Chỉ test L3 reachability — không liên quan port hay service.',
    type: 'ping',
    steps: [
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 'Type 8', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: 'Type 0', color: '#22c55e', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'ping-blocked',
    title: 'Ping Blocked (ICMP Filtered)',
    description: 'Firewall block ICMP inbound → ping timeout. Nhưng service TCP có thể vẫn hoạt động bình thường!',
    type: 'ping',
    steps: [
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 'Type 8', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 'retry...', color: '#3b82f6', delay: 1500, duration: 800 },
      { from: 'client', to: 'server', label: 'Timeout!', subLabel: '⏳', color: '#ef4444', delay: 3000, duration: 800, lost: true },
    ],
  },
  {
    id: 'traceroute-ttl',
    title: 'Traceroute TTL Trick',
    description: 'Gửi packet TTL=1: router 1 drop và trả Time Exceeded. TTL=2: router 2 trả. TTL=3: tới server → nhận reply. Thu được IP từng hop!',
    type: 'traceroute',
    showRouters: true,
    steps: [
      { from: 'client', to: 'router1', label: 'TTL=1', subLabel: 'Probe', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'router1', to: 'client', label: 'Time Exceeded', subLabel: 'Type 11', color: '#f59e0b', delay: 600, duration: 500 },
      { from: 'client', to: 'router2', label: 'TTL=2', subLabel: 'Probe', color: '#3b82f6', delay: 1300, duration: 700 },
      { from: 'router2', to: 'client', label: 'Time Exceeded', subLabel: 'Type 11', color: '#f59e0b', delay: 2100, duration: 700 },
      { from: 'client', to: 'server', label: 'TTL=3', subLabel: 'Probe', color: '#3b82f6', delay: 3000, duration: 900 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: 'Reached!', color: '#22c55e', delay: 4000, duration: 900 },
    ],
  },
  {
    id: 'traceroute-silent-hop',
    title: 'Traceroute — Hop Im Lặng (*)',
    description: 'Router 1 không trả ICMP (firewall/config) → hiện * trong output. Nhưng đường vẫn thông — hop tiếp theo phản hồi bình thường.',
    type: 'traceroute',
    showRouters: true,
    steps: [
      { from: 'client', to: 'router1', label: 'TTL=1', subLabel: 'Probe', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'client', to: 'router1', label: '* * *', subLabel: 'No response', color: '#6b7280', delay: 800, duration: 100, lost: true },
      { from: 'client', to: 'router2', label: 'TTL=2', subLabel: 'Probe', color: '#3b82f6', delay: 1200, duration: 700 },
      { from: 'router2', to: 'client', label: 'Time Exceeded', subLabel: 'Type 11', color: '#f59e0b', delay: 2000, duration: 700 },
      { from: 'client', to: 'server', label: 'TTL=3', subLabel: 'Probe', color: '#3b82f6', delay: 2900, duration: 900 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: '✓ Path OK', color: '#22c55e', delay: 3900, duration: 900 },
    ],
  },
  {
    id: 'icmp-unreachable-host',
    title: 'ICMP Host Unreachable',
    description: 'Router không tìm được đường tới host đích → gửi ICMP Type 3 Code 1 (Host Unreachable). Routing fail, không phải service fail.',
    type: 'error',
    showRouters: true,
    steps: [
      { from: 'client', to: 'router1', label: 'Packet', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'router1', to: 'router2', label: 'Forward', color: '#3b82f6', delay: 600, duration: 400 },
      { from: 'router2', to: 'client', label: 'Host Unreachable', subLabel: 'Type 3 Code 1', color: '#ef4444', delay: 1100, duration: 900 },
    ],
  },
  {
    id: 'icmp-unreachable-port',
    title: 'ICMP Port Unreachable (UDP)',
    description: 'UDP packet tới port không có service listen → host trả ICMP Type 3 Code 3. Đây là cách UDP traceroute biết đã tới đích!',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'UDP Packet', subLabel: 'port 33434', color: '#f59e0b', delay: 0, duration: 800 },
      { from: 'server', to: 'client', label: 'Port Unreachable', subLabel: 'Type 3 Code 3', color: '#ef4444', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'ping-vs-service',
    title: 'Ping OK ≠ Service OK',
    description: 'Ping OK (ICMP qua) nhưng TCP:80 bị firewall block → web không truy cập được. Ping chỉ test L3, không test L4 service!',
    type: 'ping',
    steps: [
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 'ICMP', color: '#3b82f6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: '✓ L3 OK', color: '#22c55e', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'TCP SYN', subLabel: 'port 80', color: '#8b5cf6', delay: 1800, duration: 700 },
      { from: 'client', to: 'server', label: 'Blocked!', subLabel: '✗ Firewall', color: '#ef4444', delay: 2700, duration: 700, lost: true },
    ],
  },
  {
    id: 'rtt-measurement',
    title: 'RTT (Round Trip Time)',
    description: 'RTT = thời gian từ gửi Echo Request đến nhận Echo Reply. RTT tăng đột biến tại hop nào → vấn đề tập trung tại đó.',
    type: 'ping',
    steps: [
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 't=0ms', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: 't=12ms', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 't=1000ms', color: '#3b82f6', delay: 1800, duration: 600 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: 't=1015ms', color: '#22c55e', delay: 2500, duration: 600 },
    ],
  },
  {
    id: 'ttl-fingerprint',
    title: 'TTL Fingerprinting',
    description: 'Reply TTL=54 → gốc 64 (Linux), qua 10 hop. TTL=117 → gốc 128 (Windows), qua 11 hop. Ước lượng khoảng cách + OS fingerprint.',
    type: 'ping',
    steps: [
      { from: 'client', to: 'server', label: 'Echo Request', subLabel: 'TTL=64', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: 'TTL=54 🐧', color: '#22c55e', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'mtu-discovery',
    title: 'MTU Discovery (Frag Needed)',
    description: 'Packet lớn với DF bit set → router không fragment được → ICMP Type 3 Code 4 "Frag Needed". Client giảm size và retry.',
    type: 'error',
    showRouters: true,
    steps: [
      { from: 'client', to: 'router1', label: 'Ping -s 1472', subLabel: 'DF bit set', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'router1', to: 'client', label: 'Frag Needed', subLabel: 'MTU=1400', color: '#ef4444', delay: 600, duration: 600 },
      { from: 'client', to: 'router1', label: 'Ping -s 1372', subLabel: 'Smaller', color: '#3b82f6', delay: 1500, duration: 500 },
      { from: 'router1', to: 'router2', label: 'Forward', color: '#3b82f6', delay: 2100, duration: 400 },
      { from: 'router2', to: 'server', label: 'Forward', color: '#3b82f6', delay: 2600, duration: 400 },
      { from: 'server', to: 'client', label: 'Echo Reply', subLabel: '✓ OK', color: '#22c55e', delay: 3100, duration: 900 },
    ],
  },
  {
    id: 'icmp-redirect',
    title: 'ICMP Redirect',
    description: 'Router gửi Redirect (Type 5) khi biết có đường tốt hơn. Host cập nhật routing table tạm thời. Hiếm gặp trong production.',
    type: 'error',
    showRouters: true,
    steps: [
      { from: 'client', to: 'router1', label: 'Packet', subLabel: 'to Server', color: '#3b82f6', delay: 0, duration: 500 },
      { from: 'router1', to: 'client', label: 'Redirect', subLabel: 'Use R2!', color: '#f59e0b', delay: 600, duration: 600 },
      { from: 'router1', to: 'router2', label: 'Forward', color: '#3b82f6', delay: 700, duration: 400 },
      { from: 'client', to: 'router2', label: 'Next packet', subLabel: 'Direct to R2', color: '#22c55e', delay: 1600, duration: 600 },
    ],
  },
]

export function IcmpPingVisualizer({ className }: IcmpPingVisualizerProps) {
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

    svg.selectAll('.packet').remove()
    svg.selectAll('.packet-label').remove()
    svg.selectAll('.timeline-marker').remove()

    const packetsLayer = svg.select('.packets-layer')
    const stepHeight = (TIMELINE_Y_END - TIMELINE_Y_START) / (scene.steps.length + 1)

    scene.steps.forEach((step, idx) => {
      const timeout = setTimeout(() => {
        const startX = getX(step.from)
        const endX = getX(step.to)
        const y = TIMELINE_Y_START + stepHeight * (idx + 1)

        if (step.lost) {
          // Lost packet — just show label
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', (startX + endX) / 2)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .style('opacity', 0)
            .text(step.label)
            .transition()
            .duration(300)
            .style('opacity', 1)

          if (step.subLabel) {
            packetsLayer.append('text')
              .attr('class', 'packet-label')
              .attr('x', (startX + endX) / 2)
              .attr('y', y + 16)
              .attr('text-anchor', 'middle')
              .attr('fill', step.color)
              .attr('font-size', '10px')
              .style('opacity', 0)
              .text(step.subLabel)
              .transition()
              .duration(300)
              .style('opacity', 0.7)
          }
          return
        }

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
        packetsLayer.append('text')
          .attr('class', 'packet-label')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('fill', step.color)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .style('opacity', 0)
          .text(step.label)
          .transition()
          .duration(200)
          .style('opacity', 1)

        if (step.subLabel) {
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', labelX)
            .attr('y', labelY + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .style('opacity', 0)
            .text(step.subLabel)
            .transition()
            .duration(200)
            .style('opacity', 0.7)
        }

        // Timeline marker
        packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', startX)
          .attr('y1', y)
          .attr('x2', endX)
          .attr('y2', y)
          .attr('stroke', step.color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4')
          .style('opacity', 0)
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

    const defs = svg.append('defs')
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

    svg.append('rect')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('fill', 'transparent')

    svg.append('g').attr('class', 'static-layer')
    svg.append('g').attr('class', 'packets-layer')
  }, [])

  // Draw static elements based on scene
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const staticLayer = svg.select('.static-layer')
    staticLayer.selectAll('*').remove()

    const drawNode = (x: number, label: string, icon?: string) => {
      staticLayer.append('rect')
        .attr('x', x - 45)
        .attr('y', 40)
        .attr('width', 90)
        .attr('height', 50)
        .attr('rx', 8)
        .attr('fill', 'currentColor')
        .attr('class', 'text-muted')
        .attr('opacity', 0.2)

      staticLayer.append('text')
        .attr('x', x)
        .attr('y', 70)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .text(icon ? `${icon} ${label}` : label)

      // Timeline
      staticLayer.append('line')
        .attr('x1', x)
        .attr('y1', TIMELINE_Y_START)
        .attr('x2', x)
        .attr('y2', TIMELINE_Y_END)
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8 4')
    }

    // Always draw Client and Server
    drawNode(CLIENT_X, 'Client', '💻')
    drawNode(SERVER_X, 'Server', '🖥️')

    // Draw routers if needed
    if (currentScene.showRouters) {
      drawNode(ROUTER1_X, 'Router 1', '📡')
      drawNode(ROUTER2_X, 'Router 2', '📡')
    }

    // Time arrow
    staticLayer.append('text')
      .attr('x', 40)
      .attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground')
      .attr('font-size', '12px')
      .attr('transform', `rotate(-90, 40, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    // Type badge
    const typeColors: Record<string, string> = {
      ping: '#3b82f6',
      traceroute: '#f59e0b',
      error: '#ef4444',
    }
    const typeLabel = currentScene.type.toUpperCase()
    const badgeX = currentScene.showRouters ? (ROUTER1_X + ROUTER2_X) / 2 : (CLIENT_X + SERVER_X) / 2

    staticLayer.append('rect')
      .attr('x', badgeX - 40)
      .attr('y', 45)
      .attr('width', 80)
      .attr('height', 24)
      .attr('rx', 12)
      .attr('fill', typeColors[currentScene.type])
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', badgeX)
      .attr('y', 62)
      .attr('text-anchor', 'middle')
      .attr('fill', typeColors[currentScene.type])
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(typeLabel)
  }, [currentScene])

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      animateScene(currentScene)
      const totalDuration = Math.max(...currentScene.steps.map(s => s.delay + s.duration)) + 500
      const timeout = setTimeout(() => setIsPlaying(false), totalDuration)
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
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-full border border-border rounded-lg bg-background"
      />

      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-1">{currentScene.title}</h4>
        <p className="text-sm text-muted-foreground">{currentScene.description}</p>
      </div>

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
                ? scene.type === 'ping'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : scene.type === 'traceroute'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title.replace('ICMP ', '').replace('Ping ', '')}
          </button>
        ))}
      </div>
    </div>
  )
}
