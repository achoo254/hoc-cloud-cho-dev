'use client'

/**
 * ARP Visualizer - D3.js animated ARP protocol scenarios
 * Shows broadcast/unicast, cache states, gateway ARP, spoofing, gratuitous ARP
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface ArpVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 400
const CLIENT_X = 110
const TARGET_X = 590
const GATEWAY_X = 590
const ATTACKER_X = 350
const TIMELINE_Y_START = 100
const TIMELINE_Y_END = 350
const PACKET_RADIUS = 8

type EntityId = 'client' | 'target' | 'gateway' | 'attacker' | 'broadcast'

interface PacketStep {
  from: EntityId
  to: EntityId
  label: string
  sublabel?: string
  color: string
  delay: number
  duration: number
  dashed?: boolean
}

interface Scene {
  id: string
  title: string
  description: string
  category: 'normal' | 'cache' | 'gateway' | 'attack' | 'gratuitous'
  entities: EntityId[]
  steps: PacketStep[]
}

const ENTITY_X: Record<EntityId, number> = {
  client: CLIENT_X,
  target: TARGET_X,
  gateway: GATEWAY_X,
  attacker: ATTACKER_X,
  broadcast: (CLIENT_X + TARGET_X) / 2,
}

const ENTITY_LABEL: Record<EntityId, string> = {
  client: 'Client',
  target: 'Target',
  gateway: 'Gateway',
  attacker: 'Attacker',
  broadcast: 'Broadcast',
}

const SCENES: Scene[] = [
  {
    id: 'arp-request-reply',
    title: 'ARP Request / Reply (cùng LAN)',
    description: 'Cache miss → Client broadcast "Ai có 192.168.1.10?". Target reply unicast với MAC của nó. Client lưu vào cache.',
    category: 'normal',
    entities: ['client', 'target'],
    steps: [
      { from: 'client', to: 'target', label: 'ARP Request', sublabel: 'FF:FF:FF:FF:FF:FF (broadcast)', color: '#3b82f6', delay: 0, duration: 900, dashed: true },
      { from: 'target', to: 'client', label: 'ARP Reply', sublabel: 'unicast → client MAC', color: '#22c55e', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'arp-cache-hit',
    title: 'ARP Cache Hit — Không cần broadcast',
    description: 'Entry REACHABLE trong ip neigh → kernel dùng MAC ngay, không phát broadcast. Tiết kiệm CPU cả LAN.',
    category: 'cache',
    entities: ['client', 'target'],
    steps: [
      { from: 'client', to: 'target', label: 'DATA (frame)', sublabel: 'MAC từ cache — no ARP!', color: '#8b5cf6', delay: 0, duration: 700 },
      { from: 'target', to: 'client', label: 'ACK / Response', sublabel: 'cache still REACHABLE', color: '#22c55e', delay: 800, duration: 700 },
    ],
  },
  {
    id: 'arp-for-gateway',
    title: 'ARP for Gateway (ping ngoài LAN)',
    description: 'Ping 8.8.8.8 → 8.8.8.8 khác subnet → ARP cho gateway 192.168.1.1. Frame dùng MAC gateway, IP đích vẫn là 8.8.8.8.',
    category: 'gateway',
    entities: ['client', 'gateway'],
    steps: [
      { from: 'client', to: 'gateway', label: 'ARP Request', sublabel: 'Who has 192.168.1.1?', color: '#3b82f6', delay: 0, duration: 900, dashed: true },
      { from: 'gateway', to: 'client', label: 'ARP Reply', sublabel: '192.168.1.1 is-at GW_MAC', color: '#22c55e', delay: 1000, duration: 800 },
      { from: 'client', to: 'gateway', label: 'IP Packet', sublabel: 'dst=8.8.8.8, frame→GW_MAC', color: '#8b5cf6', delay: 2000, duration: 700 },
    ],
  },
  {
    id: 'arp-spoofing',
    title: 'ARP Spoofing — MITM Attack',
    description: 'Attacker gửi Reply giả trước: "192.168.1.1 có MAC=attacker". Client lưu MAC sai → traffic đi qua Attacker (MITM).',
    category: 'attack',
    entities: ['client', 'gateway', 'attacker'],
    steps: [
      { from: 'attacker', to: 'client', label: 'Fake ARP Reply', sublabel: '192.168.1.1 is-at ATTACKER_MAC', color: '#ef4444', delay: 0, duration: 700 },
      { from: 'client', to: 'attacker', label: 'DATA (misdirected)', sublabel: 'dst=8.8.8.8 via ATTACKER_MAC', color: '#f59e0b', delay: 900, duration: 800 },
      { from: 'attacker', to: 'gateway', label: 'Forward (MITM)', sublabel: 'attacker reads/modifies', color: '#ef4444', delay: 1800, duration: 700 },
    ],
  },
  {
    id: 'gratuitous-arp',
    title: 'Gratuitous ARP — Failover / IP Conflict',
    description: 'Host tự broadcast MAC của chính mình (sender IP = target IP). Dùng cho: failover VRRP, cập nhật cache sau MAC change, phát hiện IP conflict.',
    category: 'gratuitous',
    entities: ['client', 'target'],
    steps: [
      { from: 'client', to: 'target', label: 'Gratuitous ARP', sublabel: '192.168.1.5 is-at NEW_MAC (broadcast)', color: '#8b5cf6', delay: 0, duration: 900, dashed: true },
      { from: 'client', to: 'target', label: 'Gratuitous ARP', sublabel: 'repeat ×2 for reliability', color: '#8b5cf6', delay: 1100, duration: 900, dashed: true },
    ],
  },
  {
    id: 'arp-cache-states',
    title: 'ARP Cache States: REACHABLE → STALE → FAILED',
    description: 'ip neigh show hiển thị state lifecycle. REACHABLE: mới dùng. STALE: idle, kernel probe trước khi dùng. FAILED: host unreachable.',
    category: 'cache',
    entities: ['client', 'target'],
    steps: [
      { from: 'client', to: 'target', label: 'ARP → REACHABLE', sublabel: 'entry fresh, usable', color: '#22c55e', delay: 0, duration: 800 },
      { from: 'client', to: 'target', label: 'STALE probe', sublabel: 'idle too long — kernel unicast probe', color: '#f59e0b', delay: 1200, duration: 800 },
      { from: 'target', to: 'client', label: 'No reply → FAILED', sublabel: 'host unreachable', color: '#ef4444', delay: 2200, duration: 600 },
    ],
  },
]

export function ArpVisualizer({ className }: ArpVisualizerProps) {
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

  const buildStaticLayer = useCallback((scene: Scene) => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', 'transparent')

    const staticLayer = svg.append('g').attr('class', 'static-layer')

    const uniqueEntities = Array.from(new Set(
      scene.steps.flatMap((s) => [s.from, s.to])
    )).filter((e) => e !== 'broadcast')

    uniqueEntities.forEach((entity) => {
      const x = ENTITY_X[entity]
      const attackerColor = entity === 'attacker' ? '#ef4444' : 'currentColor'

      staticLayer.append('rect')
        .attr('x', x - 50).attr('y', 30).attr('width', 100).attr('height', 45)
        .attr('rx', 8).attr('fill', attackerColor).attr('opacity', entity === 'attacker' ? 0.15 : 0.15)

      staticLayer.append('text')
        .attr('x', x).attr('y', 57).attr('text-anchor', 'middle')
        .attr('fill', entity === 'attacker' ? '#ef4444' : 'currentColor')
        .attr('font-size', '13px').attr('font-weight', 'bold')
        .text(ENTITY_LABEL[entity])

      staticLayer.append('line')
        .attr('x1', x).attr('y1', TIMELINE_Y_START)
        .attr('x2', x).attr('y2', TIMELINE_Y_END)
        .attr('stroke', entity === 'attacker' ? '#ef4444' : 'currentColor')
        .attr('opacity', 0.4).attr('stroke-width', 2).attr('stroke-dasharray', '8 4')
    })

    staticLayer.append('text')
      .attr('x', 30).attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle').attr('fill', 'currentColor').attr('opacity', 0.5)
      .attr('font-size', '11px')
      .attr('transform', `rotate(-90, 30, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    svg.append('g').attr('class', 'packets-layer')
  }, [])

  const animateScene = useCallback((scene: Scene) => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    svg.selectAll('.packet').remove()
    svg.selectAll('.packet-label').remove()
    svg.selectAll('.timeline-marker').remove()

    const packetsLayer = svg.select('.packets-layer')
    const stepCount = scene.steps.length
    const stepHeight = (TIMELINE_Y_END - TIMELINE_Y_START) / (stepCount + 1)

    scene.steps.forEach((step, idx) => {
      const timeout = setTimeout(() => {
        const startX = step.from === 'broadcast' ? CLIENT_X : ENTITY_X[step.from]
        const endX = step.to === 'broadcast' ? TARGET_X : ENTITY_X[step.to]
        const y = TIMELINE_Y_START + stepHeight * (idx + 1)

        const packet = packetsLayer.append('g')
          .attr('class', 'packet')
          .attr('transform', `translate(${startX}, ${y})`)

        packet.append('circle').attr('r', PACKET_RADIUS).attr('fill', step.color).attr('filter', 'url(#glow)')
        packet.append('circle').attr('r', PACKET_RADIUS / 3).attr('fill', 'white')

        packet.transition().duration(step.duration).ease(d3.easeLinear)
          .attr('transform', `translate(${endX}, ${y})`)
          .on('end', function() {
            const ripple = packetsLayer.append('circle')
              .attr('class', 'packet').attr('cx', endX).attr('cy', y)
              .attr('r', PACKET_RADIUS).attr('fill', 'none')
              .attr('stroke', step.color).attr('stroke-width', 2)
            ripple.transition().duration(400)
              .attr('r', PACKET_RADIUS * 3).style('opacity', 0).remove()
          })

        const labelX = (startX + endX) / 2
        const labelY = y - 16

        packetsLayer.append('text')
          .attr('class', 'packet-label').attr('x', labelX).attr('y', labelY)
          .attr('text-anchor', 'middle').attr('fill', step.color)
          .attr('font-size', '11px').attr('font-weight', 'bold').style('opacity', 0)
          .text(step.label)
          .transition().duration(200).style('opacity', 1)

        if (step.sublabel) {
          packetsLayer.append('text')
            .attr('class', 'packet-label').attr('x', labelX).attr('y', labelY + 13)
            .attr('text-anchor', 'middle').attr('fill', step.color)
            .attr('font-size', '9px').attr('font-family', 'monospace').style('opacity', 0)
            .text(step.sublabel)
            .transition().duration(200).style('opacity', 0.7)
        }

        packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', startX).attr('y1', y).attr('x2', endX).attr('y2', y)
          .attr('stroke', step.color).attr('stroke-width', 1)
          .attr('stroke-dasharray', step.dashed ? '6 3' : '4 4').style('opacity', 0)
          .transition().delay(step.duration).duration(200).style('opacity', 0.25)
      }, step.delay)

      animationRef.current.push(timeout)
    })
  }, [])

  useEffect(() => {
    buildStaticLayer(currentScene)
  }, [currentScene, buildStaticLayer])

  useEffect(() => {
    if (isPlaying) {
      animateScene(currentScene)
      const totalDuration = Math.max(...currentScene.steps.map((s) => s.delay + s.duration)) + 500
      const timeout = setTimeout(() => setIsPlaying(false), totalDuration)
      return () => clearTimeout(timeout)
    }
  }, [isPlaying, currentScene, animateScene])

  const handlePlay = () => { stopAnimation(); setIsPlaying(true) }
  const handlePrev = () => { stopAnimation(); setIsPlaying(false); setSceneIdx((p) => (p - 1 + SCENES.length) % SCENES.length) }
  const handleNext = () => { stopAnimation(); setIsPlaying(false); setSceneIdx((p) => (p + 1) % SCENES.length) }
  const handleReset = () => { stopAnimation(); setIsPlaying(false); setSceneIdx(0) }

  const categoryColor: Record<Scene['category'], string> = {
    normal: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    cache: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    gateway: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    attack: 'bg-red-500/20 text-red-600 dark:text-red-400',
    gratuitous: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
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
            onClick={() => { stopAnimation(); setIsPlaying(false); setSceneIdx(idx) }}
            className={cn(
              'text-xs px-2 py-1 rounded transition-colors',
              idx === sceneIdx ? categoryColor[scene.category] : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title.split(' — ')[0]}
          </button>
        ))}
      </div>
    </div>
  )
}
