'use client'

/**
 * DNS Visualizer - D3.js animated scenarios for DNS resolution
 * Shows: recursive resolution flow, caching, record types, negative caching
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface DnsVisualizerProps {
  className?: string
}

const WIDTH = 750
const HEIGHT = 450
const CLIENT_X = 80
const STUB_X = 180
const RECURSIVE_X = 320
const ROOT_X = 460
const TLD_X = 560
const AUTH_X = 680
const TIMELINE_Y_START = 140
const TIMELINE_Y_END = 410
const PACKET_RADIUS = 7

interface Scene {
  id: string
  title: string
  description: string
  type: 'resolution' | 'caching' | 'record' | 'error'
  nodes: string[]
  steps: PacketStep[]
}

interface PacketStep {
  from: string
  to: string
  label: string
  subLabel?: string
  color: string
  delay: number
  duration: number
  lost?: boolean
}

const NODE_POSITIONS: Record<string, { x: number; label: string; icon: string }> = {
  client: { x: CLIENT_X, label: 'Browser', icon: '💻' },
  stub: { x: STUB_X, label: 'Stub', icon: '📋' },
  recursive: { x: RECURSIVE_X, label: 'Recursive', icon: '🔄' },
  root: { x: ROOT_X, label: 'Root', icon: '🌐' },
  tld: { x: TLD_X, label: 'TLD', icon: '📁' },
  auth: { x: AUTH_X, label: 'Auth', icon: '🔑' },
}

const getX = (node: string): number => NODE_POSITIONS[node]?.x || CLIENT_X

const SCENES: Scene[] = [
  {
    id: 'full-resolution',
    title: 'DNS Resolution — Full Path',
    description: 'Browser → Stub resolver → Recursive resolver → Root → TLD → Authoritative. Recursive resolver làm toàn bộ công việc "đi hỏi" thay client.',
    type: 'resolution',
    nodes: ['client', 'stub', 'recursive', 'root', 'tld', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'root', label: '.com NS?', color: '#8b5cf6', delay: 900, duration: 350 },
      { from: 'root', to: 'recursive', label: 'a.gtld-servers.net', subLabel: 'Referral', color: '#f59e0b', delay: 1350, duration: 350 },
      { from: 'recursive', to: 'tld', label: 'example.com NS?', color: '#8b5cf6', delay: 1800, duration: 350 },
      { from: 'tld', to: 'recursive', label: 'ns1.example.com', subLabel: 'Referral', color: '#f59e0b', delay: 2250, duration: 350 },
      { from: 'recursive', to: 'auth', label: 'A record?', color: '#8b5cf6', delay: 2700, duration: 350 },
      { from: 'auth', to: 'recursive', label: '93.184.216.34', subLabel: 'AA=1', color: '#22c55e', delay: 3150, duration: 350 },
      { from: 'recursive', to: 'stub', label: '93.184.216.34', color: '#22c55e', delay: 3600, duration: 400 },
      { from: 'stub', to: 'client', label: 'IP found!', subLabel: 'TTL=3600', color: '#22c55e', delay: 4100, duration: 300 },
    ],
  },
  {
    id: 'cache-hit',
    title: 'DNS Cache Hit — Instant Response',
    description: 'Recursive resolver đã cache record từ lần query trước. TTL còn hiệu lực → trả ngay, không cần hỏi Root/TLD/Auth. Query time < 5ms.',
    type: 'caching',
    nodes: ['client', 'stub', 'recursive'],
    steps: [
      { from: 'client', to: 'stub', label: 'example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'stub', label: '93.184.216.34', subLabel: '📦 Cache hit!', color: '#22c55e', delay: 900, duration: 400 },
      { from: 'stub', to: 'client', label: 'IP found!', subLabel: 'TTL=2847', color: '#22c55e', delay: 1400, duration: 300 },
    ],
  },
  {
    id: 'ttl-expired',
    title: 'TTL Expired — Cache Miss',
    description: 'TTL=0, cache hết hạn. Recursive resolver phải đi hỏi lại authoritative. Đây là lý do đổi IP mà user vẫn thấy IP cũ khi TTL còn cao.',
    type: 'caching',
    nodes: ['client', 'stub', 'recursive', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'recursive', label: '⏰ TTL=0', subLabel: 'Cache expired', color: '#f59e0b', delay: 900, duration: 100, lost: true },
      { from: 'recursive', to: 'auth', label: 'A record?', subLabel: 'Fresh query', color: '#8b5cf6', delay: 1200, duration: 500 },
      { from: 'auth', to: 'recursive', label: '2.2.2.2', subLabel: 'New IP!', color: '#22c55e', delay: 1800, duration: 500 },
      { from: 'recursive', to: 'stub', label: '2.2.2.2', color: '#22c55e', delay: 2400, duration: 400 },
      { from: 'stub', to: 'client', label: 'New IP!', subLabel: 'TTL=3600', color: '#22c55e', delay: 2900, duration: 300 },
    ],
  },
  {
    id: 'nxdomain',
    title: 'NXDOMAIN — Domain Not Found',
    description: 'Authoritative trả NXDOMAIN (domain không tồn tại). Resolver cache negative response theo SOA minimum TTL. Subdomain mới tạo có thể bị cache này.',
    type: 'error',
    nodes: ['client', 'stub', 'recursive', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'typo.example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'auth', label: 'A record?', color: '#8b5cf6', delay: 900, duration: 500 },
      { from: 'auth', to: 'recursive', label: 'NXDOMAIN', subLabel: '❌ Not found', color: '#ef4444', delay: 1500, duration: 500 },
      { from: 'recursive', to: 'stub', label: 'NXDOMAIN', subLabel: 'Cached!', color: '#ef4444', delay: 2100, duration: 400 },
      { from: 'stub', to: 'client', label: 'Not found!', color: '#ef4444', delay: 2600, duration: 300 },
    ],
  },
  {
    id: 'cname-chain',
    title: 'CNAME Resolution — Extra Hop',
    description: 'www.example.com có CNAME trỏ về example.com. Resolver phải resolve thêm 1 lần nữa để lấy A record của target. Đây là lý do CNAME chậm hơn A record.',
    type: 'record',
    nodes: ['client', 'stub', 'recursive', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'www.example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'auth', label: 'A for www?', color: '#8b5cf6', delay: 900, duration: 500 },
      { from: 'auth', to: 'recursive', label: 'CNAME: example.com', subLabel: 'Alias!', color: '#f59e0b', delay: 1500, duration: 500 },
      { from: 'recursive', to: 'auth', label: 'A for example.com?', color: '#8b5cf6', delay: 2200, duration: 500 },
      { from: 'auth', to: 'recursive', label: '93.184.216.34', color: '#22c55e', delay: 2800, duration: 500 },
      { from: 'recursive', to: 'stub', label: '93.184.216.34', color: '#22c55e', delay: 3400, duration: 400 },
      { from: 'stub', to: 'client', label: 'IP found!', subLabel: '2 lookups', color: '#22c55e', delay: 3900, duration: 300 },
    ],
  },
  {
    id: 'mx-query',
    title: 'MX Record — Mail Server Lookup',
    description: 'Email client cần gửi mail tới @example.com. Query MX record để tìm mail server. MX có priority (số nhỏ = ưu tiên cao).',
    type: 'record',
    nodes: ['client', 'stub', 'recursive', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'MX example.com?', subLabel: '📧', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query MX', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'auth', label: 'MX record?', color: '#8b5cf6', delay: 900, duration: 500 },
      { from: 'auth', to: 'recursive', label: 'mail.example.com', subLabel: 'Priority 10', color: '#22c55e', delay: 1500, duration: 500 },
      { from: 'recursive', to: 'auth', label: 'A for mail?', color: '#8b5cf6', delay: 2200, duration: 500 },
      { from: 'auth', to: 'recursive', label: '93.184.216.35', color: '#22c55e', delay: 2800, duration: 500 },
      { from: 'recursive', to: 'stub', label: '93.184.216.35', color: '#22c55e', delay: 3400, duration: 400 },
      { from: 'stub', to: 'client', label: 'Mail server!', color: '#22c55e', delay: 3900, duration: 300 },
    ],
  },
  {
    id: 'servfail',
    title: 'SERVFAIL — Authoritative Down',
    description: 'Authoritative server không phản hồi hoặc trả lỗi. Resolver retry vài lần rồi trả SERVFAIL. Domain unreachable dù config đúng.',
    type: 'error',
    nodes: ['client', 'stub', 'recursive', 'auth'],
    steps: [
      { from: 'client', to: 'stub', label: 'example.com?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'recursive', label: 'Query A', color: '#3b82f6', delay: 400, duration: 400 },
      { from: 'recursive', to: 'auth', label: 'A record?', color: '#8b5cf6', delay: 900, duration: 500 },
      { from: 'recursive', to: 'auth', label: 'Retry 1...', subLabel: '⏳', color: '#f59e0b', delay: 1600, duration: 500, lost: true },
      { from: 'recursive', to: 'auth', label: 'Retry 2...', subLabel: '⏳', color: '#f59e0b', delay: 2300, duration: 500, lost: true },
      { from: 'recursive', to: 'stub', label: 'SERVFAIL', subLabel: '💀 Auth down', color: '#ef4444', delay: 3000, duration: 400 },
      { from: 'stub', to: 'client', label: 'Server Error', color: '#ef4444', delay: 3500, duration: 300 },
    ],
  },
  {
    id: 'hosts-file',
    title: '/etc/hosts Override',
    description: 'OS kiểm tra /etc/hosts TRƯỚC khi hỏi DNS. Nếu có entry → dùng ngay, không cần network. Thường dùng để test local development.',
    type: 'resolution',
    nodes: ['client', 'stub'],
    steps: [
      { from: 'client', to: 'stub', label: 'localhost?', color: '#3b82f6', delay: 0, duration: 300 },
      { from: 'stub', to: 'stub', label: '📄 /etc/hosts', subLabel: 'Check first!', color: '#f59e0b', delay: 400, duration: 100, lost: true },
      { from: 'stub', to: 'client', label: '127.0.0.1', subLabel: '⚡ Instant', color: '#22c55e', delay: 700, duration: 300 },
    ],
  },
  {
    id: 'doh-bypass',
    title: 'DoH — DNS over HTTPS',
    description: 'Firefox/Chrome dùng DoH: query DNS qua HTTPS port 443 tới Cloudflare/Google. ISP không thấy domain đang hỏi. Có thể bypass corporate DNS filter.',
    type: 'resolution',
    nodes: ['client', 'recursive'],
    steps: [
      { from: 'client', to: 'recursive', label: 'HTTPS Query', subLabel: '🔒 Encrypted', color: '#22c55e', delay: 0, duration: 600 },
      { from: 'recursive', to: 'client', label: '93.184.216.34', subLabel: 'JSON response', color: '#22c55e', delay: 800, duration: 600 },
    ],
  },
  {
    id: 'dig-trace',
    title: 'dig +trace — Bypass Cache',
    description: 'dig +trace tự đi hỏi từ root, không qua resolver cache. Dùng để xác nhận authoritative đã cập nhật record mới chưa, phân biệt với cache cũ.',
    type: 'resolution',
    nodes: ['client', 'root', 'tld', 'auth'],
    steps: [
      { from: 'client', to: 'root', label: '.com NS?', subLabel: 'Direct!', color: '#8b5cf6', delay: 0, duration: 400 },
      { from: 'root', to: 'client', label: 'a.gtld-servers', color: '#f59e0b', delay: 500, duration: 400 },
      { from: 'client', to: 'tld', label: 'example.com NS?', color: '#8b5cf6', delay: 1000, duration: 400 },
      { from: 'tld', to: 'client', label: 'ns1.example.com', color: '#f59e0b', delay: 1500, duration: 400 },
      { from: 'client', to: 'auth', label: 'A record?', color: '#8b5cf6', delay: 2000, duration: 400 },
      { from: 'auth', to: 'client', label: '93.184.216.34', subLabel: '✓ Fresh!', color: '#22c55e', delay: 2500, duration: 400 },
    ],
  },
]

export function DnsVisualizer({ className }: DnsVisualizerProps) {
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
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', (startX + endX) / 2)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '11px')
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
              .attr('y', y + 14)
              .attr('text-anchor', 'middle')
              .attr('fill', step.color)
              .attr('font-size', '9px')
              .style('opacity', 0)
              .text(step.subLabel)
              .transition()
              .duration(300)
              .style('opacity', 0.7)
          }
          return
        }

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
              .duration(350)
              .attr('r', PACKET_RADIUS * 2.5)
              .style('opacity', 0)
              .remove()
          })

        const labelX = (startX + endX) / 2
        const labelY = y - 12
        packetsLayer.append('text')
          .attr('class', 'packet-label')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('fill', step.color)
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .style('opacity', 0)
          .text(step.label)
          .transition()
          .duration(180)
          .style('opacity', 1)

        if (step.subLabel) {
          packetsLayer.append('text')
            .attr('class', 'packet-label')
            .attr('x', labelX)
            .attr('y', labelY + 12)
            .attr('text-anchor', 'middle')
            .attr('fill', step.color)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .style('opacity', 0)
            .text(step.subLabel)
            .transition()
            .duration(180)
            .style('opacity', 0.7)
        }

        packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', startX)
          .attr('y1', y)
          .attr('x2', endX)
          .attr('y2', y)
          .attr('stroke', step.color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3 3')
          .style('opacity', 0)
          .transition()
          .delay(step.duration)
          .duration(180)
          .style('opacity', 0.25)
      }, step.delay)

      animationRef.current.push(timeout)
    })
  }, [])

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
      .attr('stdDeviation', '2.5')
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

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const staticLayer = svg.select('.static-layer')
    staticLayer.selectAll('*').remove()

    const drawNode = (node: string) => {
      const pos = NODE_POSITIONS[node]
      if (!pos) return

      staticLayer.append('rect')
        .attr('x', pos.x - 32)
        .attr('y', 55)
        .attr('width', 64)
        .attr('height', 50)
        .attr('rx', 8)
        .attr('fill', 'currentColor')
        .attr('class', 'text-muted')
        .attr('opacity', 0.2)

      staticLayer.append('text')
        .attr('x', pos.x)
        .attr('y', 77)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground')
        .attr('font-size', '16px')
        .text(pos.icon)

      staticLayer.append('text')
        .attr('x', pos.x)
        .attr('y', 95)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(pos.label)

      staticLayer.append('line')
        .attr('x1', pos.x)
        .attr('y1', TIMELINE_Y_START)
        .attr('x2', pos.x)
        .attr('y2', TIMELINE_Y_END)
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 3')
    }

    currentScene.nodes.forEach(drawNode)

    staticLayer.append('text')
      .attr('x', 28)
      .attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground')
      .attr('font-size', '11px')
      .attr('transform', `rotate(-90, 28, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    const typeColors: Record<string, string> = {
      resolution: '#3b82f6',
      caching: '#f59e0b',
      record: '#8b5cf6',
      error: '#ef4444',
    }
    const typeLabels: Record<string, string> = {
      resolution: 'RESOLUTION',
      caching: 'CACHING',
      record: 'RECORD TYPE',
      error: 'ERROR',
    }

    const nodeXs = currentScene.nodes.map(n => getX(n))
    const badgeX = (Math.min(...nodeXs) + Math.max(...nodeXs)) / 2

    staticLayer.append('rect')
      .attr('x', badgeX - 42)
      .attr('y', 18)
      .attr('width', 84)
      .attr('height', 22)
      .attr('rx', 11)
      .attr('fill', typeColors[currentScene.type])
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', badgeX)
      .attr('y', 33)
      .attr('text-anchor', 'middle')
      .attr('fill', typeColors[currentScene.type])
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(typeLabels[currentScene.type])
  }, [currentScene])

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
                ? scene.type === 'resolution'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : scene.type === 'caching'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : scene.type === 'record'
                      ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title.split(' — ')[0].replace('DNS ', '')}
          </button>
        ))}
      </div>
    </div>
  )
}
