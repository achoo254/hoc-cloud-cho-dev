'use client'

/**
 * DHCP DORA Visualizer - D3.js animated visualization of DHCP flow
 * Shows: DORA handshake, Renewal (T1/T2), Relay agent, Failure scenarios
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

const WIDTH = 700
const HEIGHT = 420
const CLIENT_X = 120
const SERVER_X = 580
const TIMELINE_Y_START = 120
const TIMELINE_Y_END = 370
const PACKET_RADIUS = 8

interface Scene {
  id: string
  title: string
  description: string
  steps: PacketStep[]
}

interface PacketStep {
  from: 'client' | 'server' | 'relay'
  to?: 'client' | 'server' | 'relay'
  label: string
  flag?: string
  color: string
  delay: number
  duration: number
  broadcast?: boolean
}

const SCENES: Scene[] = [
  {
    id: 'dora-full',
    title: 'DORA — Discover → Offer → Request → Ack',
    description: 'Client vừa boot, broadcast DISCOVER để tìm DHCP server. Server OFFER IP, client REQUEST, server ACK xác nhận. 4 bước hoàn tất = client có IP.',
    steps: [
      { from: 'client', label: 'DISCOVER', flag: '0.0.0.0 → 255.255.255.255', color: '#3b82f6', delay: 0, duration: 800, broadcast: true },
      { from: 'server', label: 'OFFER', flag: 'IP: 192.168.1.50', color: '#22c55e', delay: 900, duration: 800, broadcast: true },
      { from: 'client', label: 'REQUEST', flag: 'Chọn IP 192.168.1.50', color: '#f59e0b', delay: 1800, duration: 800, broadcast: true },
      { from: 'server', label: 'ACK', flag: 'Lease 24h, GW, DNS', color: '#8b5cf6', delay: 2700, duration: 800, broadcast: true },
    ],
  },
  {
    id: 'discover-only',
    title: 'DISCOVER — Client kêu cứu',
    description: 'Client chưa có IP → src=0.0.0.0. Broadcast 255.255.255.255 vì không biết server ở đâu. Mang theo MAC và Transaction ID (xid).',
    steps: [
      { from: 'client', label: 'DISCOVER', flag: 'src=0.0.0.0', color: '#3b82f6', delay: 0, duration: 1000, broadcast: true },
      { from: 'client', label: 'DISCOVER', flag: 'MAC + xid', color: '#3b82f6', delay: 200, duration: 1000, broadcast: true },
    ],
  },
  {
    id: 'offer-response',
    title: 'OFFER — Server đề xuất IP',
    description: 'Server nhận DISCOVER, chọn IP trống từ pool, broadcast OFFER. Vẫn broadcast vì client chưa có IP để unicast tới.',
    steps: [
      { from: 'client', label: 'DISCOVER', flag: 'xid=0x1234', color: '#3b82f6', delay: 0, duration: 700, broadcast: true },
      { from: 'server', label: 'OFFER', flag: 'Your IP: .50', color: '#22c55e', delay: 800, duration: 800, broadcast: true },
      { from: 'server', label: '+Options', flag: 'Lease, GW, DNS', color: '#22c55e', delay: 1000, duration: 600, broadcast: true },
    ],
  },
  {
    id: 'request-broadcast',
    title: 'REQUEST — Client chọn server',
    description: 'Client broadcast REQUEST để tất cả DHCP server biết nó chọn server nào. Server không được chọn giải phóng IP đã dự trữ.',
    steps: [
      { from: 'client', label: 'REQUEST', flag: 'Server ID: .1', color: '#f59e0b', delay: 0, duration: 800, broadcast: true },
      { from: 'client', label: 'Request IP', flag: '192.168.1.50', color: '#f59e0b', delay: 200, duration: 800, broadcast: true },
    ],
  },
  {
    id: 'ack-confirm',
    title: 'ACK — Server xác nhận',
    description: 'Server ghi lease vào database, gửi ACK với đầy đủ options. Client nhận ACK mới thực sự config IP vào interface.',
    steps: [
      { from: 'client', label: 'REQUEST', flag: 'IP .50', color: '#f59e0b', delay: 0, duration: 700, broadcast: true },
      { from: 'server', label: 'ACK', flag: 'Confirmed!', color: '#8b5cf6', delay: 800, duration: 800, broadcast: true },
      { from: 'server', label: '+Lease Info', flag: '86400s, GW .1', color: '#8b5cf6', delay: 1000, duration: 600, broadcast: true },
    ],
  },
  {
    id: 'renew-t1',
    title: 'T1 Renewal (50% lease)',
    description: 'Tại T1=50% lease time, client UNICAST tới server gốc để gia hạn. Không broadcast vì đã biết server IP.',
    steps: [
      { from: 'client', label: 'REQUEST', flag: 'Renew lease', color: '#06b6d4', delay: 0, duration: 800 },
      { from: 'server', label: 'ACK', flag: 'Extended!', color: '#22c55e', delay: 900, duration: 800 },
    ],
  },
  {
    id: 'rebind-t2',
    title: 'T2 Rebind (87.5% lease)',
    description: 'Server gốc không trả lời T1 → client BROADCAST rebind tại T2. Bất kỳ DHCP server nào cũng có thể xác nhận.',
    steps: [
      { from: 'client', label: 'REQUEST', flag: 'T1 failed', color: '#06b6d4', delay: 0, duration: 700 },
      { from: 'client', label: '(no response)', flag: '...', color: '#6b7280', delay: 800, duration: 500 },
      { from: 'client', label: 'REQUEST', flag: 'Broadcast rebind', color: '#f59e0b', delay: 1500, duration: 800, broadcast: true },
      { from: 'server', label: 'ACK', flag: 'New server!', color: '#22c55e', delay: 2400, duration: 800, broadcast: true },
    ],
  },
  {
    id: 'no-offer',
    title: 'No OFFER — Server down / Pool hết',
    description: 'DISCOVER gửi đi nhưng không có OFFER → DHCP server chết, pool hết IP, hoặc firewall block. Client retry với exponential backoff.',
    steps: [
      { from: 'client', label: 'DISCOVER', flag: 'Attempt 1', color: '#3b82f6', delay: 0, duration: 800, broadcast: true },
      { from: 'client', label: 'DISCOVER', flag: 'Attempt 2 (2s)', color: '#3b82f6', delay: 1200, duration: 800, broadcast: true },
      { from: 'client', label: 'DISCOVER', flag: 'Attempt 3 (4s)', color: '#3b82f6', delay: 2400, duration: 800, broadcast: true },
      { from: 'client', label: 'APIPA', flag: '169.254.x.x', color: '#ef4444', delay: 3600, duration: 600 },
    ],
  },
  {
    id: 'nak-conflict',
    title: 'NAK — IP Conflict',
    description: 'Client REQUEST IP nhưng server từ chối (conflict hoặc không hợp lệ) → DHCPNAK. Client phải DISCOVER lại từ đầu.',
    steps: [
      { from: 'client', label: 'DISCOVER', color: '#3b82f6', delay: 0, duration: 600, broadcast: true },
      { from: 'server', label: 'OFFER', flag: 'IP: .50', color: '#22c55e', delay: 700, duration: 600, broadcast: true },
      { from: 'client', label: 'REQUEST', flag: 'IP: .50', color: '#f59e0b', delay: 1400, duration: 600, broadcast: true },
      { from: 'server', label: 'NAK', flag: 'Conflict!', color: '#ef4444', delay: 2100, duration: 600, broadcast: true },
      { from: 'client', label: 'DISCOVER', flag: 'Restart DORA', color: '#3b82f6', delay: 2900, duration: 600, broadcast: true },
    ],
  },
  {
    id: 'relay-agent',
    title: 'Relay Agent — Cross-subnet',
    description: 'Client ở subnet A, DHCP server ở subnet B. Relay agent (router) nhận broadcast, chuyển thành unicast tới server.',
    steps: [
      { from: 'client', label: 'DISCOVER', flag: 'Broadcast', color: '#3b82f6', delay: 0, duration: 600, broadcast: true },
      { from: 'relay', to: 'server', label: 'Forward', flag: 'Unicast to server', color: '#6b7280', delay: 700, duration: 700 },
      { from: 'server', to: 'relay', label: 'OFFER', flag: 'Via relay', color: '#22c55e', delay: 1500, duration: 700 },
      { from: 'relay', to: 'client', label: 'OFFER', flag: 'Broadcast back', color: '#22c55e', delay: 2300, duration: 600, broadcast: true },
    ],
  },
  {
    id: 'lease-expire',
    title: 'Lease Expired — Connection Lost',
    description: 'T1 và T2 đều fail, lease hết hạn → client mất IP đột ngột. Network down cho đến khi DORA lại thành công.',
    steps: [
      { from: 'client', label: 'REQUEST', flag: 'T1 renew', color: '#06b6d4', delay: 0, duration: 600 },
      { from: 'client', label: '(timeout)', flag: '...', color: '#6b7280', delay: 700, duration: 400 },
      { from: 'client', label: 'REQUEST', flag: 'T2 rebind', color: '#f59e0b', delay: 1300, duration: 600, broadcast: true },
      { from: 'client', label: '(timeout)', flag: '...', color: '#6b7280', delay: 2000, duration: 400 },
      { from: 'client', label: 'Lease Expired', flag: 'IP removed!', color: '#ef4444', delay: 2600, duration: 600 },
      { from: 'client', label: 'DISCOVER', flag: 'Start over', color: '#3b82f6', delay: 3400, duration: 600, broadcast: true },
    ],
  },
  {
    id: 'release',
    title: 'RELEASE — Trả lại IP',
    description: 'Client shutdown hoặc disconnect → gửi DHCPRELEASE unicast để server biết IP trống. Không phải lúc nào cũng gửi (crash, unplug).',
    steps: [
      { from: 'client', label: 'RELEASE', flag: 'Return IP .50', color: '#ef4444', delay: 0, duration: 800 },
      { from: 'server', label: '(noted)', flag: 'Pool updated', color: '#6b7280', delay: 900, duration: 600 },
    ],
  },
  {
    id: 'inform',
    title: 'DHCPINFORM — Chỉ lấy options',
    description: 'Client đã có static IP nhưng cần thông tin khác (DNS, gateway, NTP) → gửi DHCPINFORM. Server trả ACK với options.',
    steps: [
      { from: 'client', label: 'INFORM', flag: 'I have IP, need DNS', color: '#8b5cf6', delay: 0, duration: 800 },
      { from: 'server', label: 'ACK', flag: 'DNS: 8.8.8.8', color: '#22c55e', delay: 900, duration: 800 },
    ],
  },
  {
    id: 'multiple-servers',
    title: 'Multiple DHCP Servers',
    description: 'Nhiều server trong LAN → client nhận nhiều OFFER → chọn 1 → REQUEST broadcast để các server khác biết.',
    steps: [
      { from: 'client', label: 'DISCOVER', color: '#3b82f6', delay: 0, duration: 600, broadcast: true },
      { from: 'server', label: 'OFFER #1', flag: 'Server A: .50', color: '#22c55e', delay: 700, duration: 500, broadcast: true },
      { from: 'server', label: 'OFFER #2', flag: 'Server B: .100', color: '#06b6d4', delay: 900, duration: 500, broadcast: true },
      { from: 'client', label: 'REQUEST', flag: 'Choose Server A', color: '#f59e0b', delay: 1600, duration: 600, broadcast: true },
      { from: 'server', label: 'ACK', flag: 'Server A confirms', color: '#22c55e', delay: 2300, duration: 600, broadcast: true },
    ],
  },
]

export function DhcpDoraVisualizer({ className }: { className?: string }) {
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
    const RELAY_X = (CLIENT_X + SERVER_X) / 2

    scene.steps.forEach((step, idx) => {
      const timeout = setTimeout(() => {
        let startX = step.from === 'client' ? CLIENT_X : step.from === 'relay' ? RELAY_X : SERVER_X
        let endX = step.to
          ? step.to === 'client' ? CLIENT_X : step.to === 'relay' ? RELAY_X : SERVER_X
          : step.from === 'client' ? SERVER_X : CLIENT_X
        const y = TIMELINE_Y_START + stepHeight * (idx + 1)

        const packet = packetsLayer.append('g')
          .attr('class', 'packet')
          .attr('transform', `translate(${startX}, ${y})`)

        // Broadcast indicator
        if (step.broadcast) {
          packet.append('circle')
            .attr('r', PACKET_RADIUS + 4)
            .attr('fill', 'none')
            .attr('stroke', step.color)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3')
            .attr('opacity', 0.5)
        }

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
          .on('end', function () {
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
        packetsLayer.append('line')
          .attr('class', 'timeline-marker')
          .attr('x1', CLIENT_X)
          .attr('y1', y)
          .attr('x2', SERVER_X)
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

    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', 'transparent')

    const staticLayer = svg.append('g').attr('class', 'static-layer')

    // Client box
    staticLayer.append('rect')
      .attr('x', CLIENT_X - 50).attr('y', 30).attr('width', 100).attr('height', 60)
      .attr('rx', 8).attr('fill', 'currentColor').attr('class', 'text-muted').attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', CLIENT_X).attr('y', 55).attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground').attr('font-size', '14px').attr('font-weight', 'bold')
      .text('Client')

    staticLayer.append('text')
      .attr('x', CLIENT_X).attr('y', 72).attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground').attr('font-size', '10px')
      .text('Port 68')

    // Server box
    staticLayer.append('rect')
      .attr('x', SERVER_X - 50).attr('y', 30).attr('width', 100).attr('height', 60)
      .attr('rx', 8).attr('fill', 'currentColor').attr('class', 'text-muted').attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', SERVER_X).attr('y', 55).attr('text-anchor', 'middle')
      .attr('class', 'fill-foreground').attr('font-size', '14px').attr('font-weight', 'bold')
      .text('DHCP Server')

    staticLayer.append('text')
      .attr('x', SERVER_X).attr('y', 72).attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground').attr('font-size', '10px')
      .text('Port 67')

    // Timelines
    staticLayer.append('line')
      .attr('x1', CLIENT_X).attr('y1', TIMELINE_Y_START).attr('x2', CLIENT_X).attr('y2', TIMELINE_Y_END)
      .attr('stroke', 'currentColor').attr('class', 'text-muted-foreground')
      .attr('stroke-width', 2).attr('stroke-dasharray', '8 4')

    staticLayer.append('line')
      .attr('x1', SERVER_X).attr('y1', TIMELINE_Y_START).attr('x2', SERVER_X).attr('y2', TIMELINE_Y_END)
      .attr('stroke', 'currentColor').attr('class', 'text-muted-foreground')
      .attr('stroke-width', 2).attr('stroke-dasharray', '8 4')

    // Time arrow
    staticLayer.append('text')
      .attr('x', 50).attr('y', (TIMELINE_Y_START + TIMELINE_Y_END) / 2)
      .attr('text-anchor', 'middle').attr('class', 'fill-muted-foreground').attr('font-size', '12px')
      .attr('transform', `rotate(-90, 50, ${(TIMELINE_Y_START + TIMELINE_Y_END) / 2})`)
      .text('Time →')

    svg.append('g').attr('class', 'packets-layer')
  }, [])

  // Protocol indicator
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.select('.protocol-indicator').remove()

    const indicator = svg.select('.static-layer').append('g').attr('class', 'protocol-indicator')

    indicator.append('rect')
      .attr('x', (CLIENT_X + SERVER_X) / 2 - 35).attr('y', 35)
      .attr('width', 70).attr('height', 24).attr('rx', 12)
      .attr('fill', '#22c55e').attr('opacity', 0.2)

    indicator.append('text')
      .attr('x', (CLIENT_X + SERVER_X) / 2).attr('y', 52)
      .attr('text-anchor', 'middle').attr('fill', '#22c55e')
      .attr('font-size', '12px').attr('font-weight', 'bold')
      .text('UDP 67/68')
  }, [currentScene])

  // Play animation
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
              idx === sceneIdx
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title.split(' — ')[0]}
          </button>
        ))}
      </div>
    </div>
  )
}
