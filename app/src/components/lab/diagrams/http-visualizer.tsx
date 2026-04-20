'use client'

/**
 * HTTP Visualizer - D3.js animated scenarios for HTTP protocol
 * Shows: request/response, status codes, HTTP/1.1 vs HTTP/2, TLS handshake,
 *        redirect chain, 4xx errors, 5xx errors, keep-alive connection reuse
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface HttpVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 420
const CLIENT_X = 100
const SERVER_X = 600
const PROXY_X = 350
const TIMELINE_Y_START = 120
const TIMELINE_Y_END = 380
const PACKET_RADIUS = 8

interface Scene {
  id: string
  title: string
  description: string
  type: 'request' | 'status' | 'version' | 'tls' | 'error'
  showProxy?: boolean
  steps: PacketStep[]
}

interface PacketStep {
  from: 'client' | 'proxy' | 'server'
  to: 'client' | 'proxy' | 'server'
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
    case 'proxy': return PROXY_X
    case 'server': return SERVER_X
    default: return CLIENT_X
  }
}

const SCENES: Scene[] = [
  {
    id: 'http-basic',
    title: 'Basic HTTP Request/Response',
    description: 'Client gửi HTTP Request (method + path + headers). Server xử lý và trả Response (status line + headers + body). Đây là chu trình cơ bản nhất.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'GET /api/users', subLabel: 'HTTP Request', color: '#3b82f6', delay: 0, duration: 800 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'HTTP Response', color: '#22c55e', delay: 1000, duration: 800 },
    ],
  },
  {
    id: 'status-200-201',
    title: 'Status Codes — 2xx Success',
    description: '200 OK: GET thành công. 201 Created: POST tạo resource mới thành công. 204 No Content: DELETE thành công, không có body trả về.',
    type: 'status',
    steps: [
      { from: 'client', to: 'server', label: 'GET /resource', subLabel: 'Read', color: '#3b82f6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: '+ body', color: '#22c55e', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'POST /resource', subLabel: 'Create', color: '#3b82f6', delay: 1800, duration: 700 },
      { from: 'server', to: 'client', label: '201 Created', subLabel: 'Location: /resource/1', color: '#22c55e', delay: 2600, duration: 700 },
    ],
  },
  {
    id: 'status-301-redirect',
    title: 'Redirect Chain — 301/302',
    description: '301 Moved Permanently: resource chuyển vĩnh viễn. 302 Found: tạm thời. Client phải follow Location header. Nhiều redirect hop → latency tăng.',
    type: 'status',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /old-url', subLabel: 'HTTP', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'proxy', to: 'client', label: '301 Moved', subLabel: 'Location: /new-url', color: '#f59e0b', delay: 700, duration: 600 },
      { from: 'client', to: 'proxy', label: 'GET /new-url', subLabel: 'Follow redirect', color: '#3b82f6', delay: 1500, duration: 600 },
      { from: 'proxy', to: 'server', label: 'Proxy forward', color: '#6b7280', delay: 2200, duration: 400 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Final response', color: '#22c55e', delay: 2700, duration: 800 },
    ],
  },
  {
    id: 'status-4xx-errors',
    title: '4xx Client Errors — 401/403/404',
    description: '401 Unauthorized: thiếu hoặc sai token. 403 Forbidden: token valid nhưng không đủ quyền. 404 Not Found: URL sai hoặc resource không tồn tại. Debug: đọc status trước, rồi mới đọc body.',
    type: 'error',
    steps: [
      { from: 'client', to: 'server', label: 'GET /secure', subLabel: 'No token', color: '#3b82f6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: '401 Unauthorized', subLabel: 'WWW-Authenticate', color: '#f59e0b', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'GET /admin', subLabel: 'Wrong role', color: '#3b82f6', delay: 1800, duration: 700 },
      { from: 'server', to: 'client', label: '403 Forbidden', subLabel: 'Role: user ≠ admin', color: '#ef4444', delay: 2600, duration: 700 },
    ],
  },
  {
    id: 'status-5xx-errors',
    title: '5xx Server Errors — 502/503',
    description: '502 Bad Gateway: nginx nhận request nhưng upstream (app server) không phản hồi hoặc crash. 503 Service Unavailable: upstream quá tải hoặc đang restart. Không phải lỗi nginx — cần check app logs.',
    type: 'error',
    showProxy: true,
    steps: [
      { from: 'client', to: 'proxy', label: 'GET /api', color: '#3b82f6', delay: 0, duration: 600 },
      { from: 'proxy', to: 'server', label: 'Proxy forward', color: '#6b7280', delay: 700, duration: 400 },
      { from: 'server', to: 'proxy', label: 'App crashed!', subLabel: 'Connection refused', color: '#ef4444', delay: 1200, duration: 300, lost: true },
      { from: 'proxy', to: 'client', label: '502 Bad Gateway', subLabel: 'Upstream error', color: '#ef4444', delay: 1600, duration: 600 },
    ],
  },
  {
    id: 'http1-hol-blocking',
    title: 'HTTP/1.1 — Head-of-Line Blocking',
    description: 'HTTP/1.1 xử lý request tuần tự trên 1 connection. Request 2 phải chờ Request 1 hoàn thành. Giải pháp: mở nhiều TCP connection song song (tốn tài nguyên).',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'GET /style.css', subLabel: 'Request 1', color: '#8b5cf6', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK (css)', subLabel: 'Response 1', color: '#8b5cf6', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'GET /script.js', subLabel: 'Request 2 (waiting)', color: '#6b7280', delay: 1700, duration: 700 },
      { from: 'server', to: 'client', label: '200 OK (js)', subLabel: 'Response 2', color: '#6b7280', delay: 2500, duration: 700 },
    ],
  },
  {
    id: 'http2-multiplexing',
    title: 'HTTP/2 — Multiplexing',
    description: 'HTTP/2 gửi nhiều stream song song trên 1 TCP connection. Binary frames, mỗi frame có Stream ID. HPACK compression giảm header size. Không có head-of-line blocking ở L7.',
    type: 'version',
    steps: [
      { from: 'client', to: 'server', label: 'Stream 1: css', subLabel: 'HTTP/2 frame', color: '#06b6d4', delay: 0, duration: 600 },
      { from: 'client', to: 'server', label: 'Stream 2: js', subLabel: 'Concurrent!', color: '#06b6d4', delay: 100, duration: 600 },
      { from: 'server', to: 'client', label: 'Stream 1 resp', subLabel: '200 OK', color: '#22c55e', delay: 700, duration: 600 },
      { from: 'server', to: 'client', label: 'Stream 2 resp', subLabel: '200 OK', color: '#22c55e', delay: 800, duration: 600 },
    ],
  },
  {
    id: 'tls-handshake',
    title: 'TLS Handshake — HTTPS Setup',
    description: 'ClientHello: client gửi cipher suites hỗ trợ. ServerHello + Certificate: server chọn cipher, gửi cert. Key Exchange: cả hai derive session key. Finished: verify xong, bắt đầu encrypt data.',
    type: 'tls',
    steps: [
      { from: 'client', to: 'server', label: 'ClientHello', subLabel: 'cipher suites, random', color: '#10b981', delay: 0, duration: 700 },
      { from: 'server', to: 'client', label: 'ServerHello + Cert', subLabel: 'chosen cipher, certificate', color: '#10b981', delay: 800, duration: 700 },
      { from: 'client', to: 'server', label: 'Key Exchange', subLabel: 'verify cert, derive key', color: '#10b981', delay: 1700, duration: 700 },
      { from: 'server', to: 'client', label: 'Finished', subLabel: 'handshake complete ✓', color: '#22c55e', delay: 2500, duration: 700 },
    ],
  },
  {
    id: 'keep-alive',
    title: 'Keep-Alive — Connection Reuse',
    description: 'HTTP/1.1 Keep-Alive tái sử dụng TCP connection cho nhiều request. Tránh TCP 3-way handshake overhead cho mỗi request. Connection: keep-alive header kiểm soát hành vi này.',
    type: 'request',
    steps: [
      { from: 'client', to: 'server', label: 'TCP Handshake', subLabel: 'SYN/SYN-ACK/ACK', color: '#6b7280', delay: 0, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /page', subLabel: 'Connection: keep-alive', color: '#3b82f6', delay: 700, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'Keep-Alive: timeout=5', color: '#22c55e', delay: 1400, duration: 600 },
      { from: 'client', to: 'server', label: 'GET /image.png', subLabel: 'Reuse connection!', color: '#3b82f6', delay: 2200, duration: 600 },
      { from: 'server', to: 'client', label: '200 OK', subLabel: 'No new handshake', color: '#22c55e', delay: 2900, duration: 600 },
    ],
  },
]

export function HttpVisualizer({ className }: HttpVisualizerProps) {
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

        // Timeline dashed line
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

  // Initialize SVG defs + layers
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

    svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', 'transparent')
    svg.append('g').attr('class', 'static-layer')
    svg.append('g').attr('class', 'packets-layer')
  }, [])

  // Draw static nodes based on current scene
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const staticLayer = svg.select('.static-layer')
    staticLayer.selectAll('*').remove()

    const drawNode = (x: number, label: string, icon?: string) => {
      staticLayer.append('rect')
        .attr('x', x - 45).attr('y', 40)
        .attr('width', 90).attr('height', 50)
        .attr('rx', 8)
        .attr('fill', 'currentColor')
        .attr('class', 'text-muted')
        .attr('opacity', 0.2)

      staticLayer.append('text')
        .attr('x', x).attr('y', 70)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .text(icon ? `${icon} ${label}` : label)

      staticLayer.append('line')
        .attr('x1', x).attr('y1', TIMELINE_Y_START)
        .attr('x2', x).attr('y2', TIMELINE_Y_END)
        .attr('stroke', 'currentColor')
        .attr('class', 'text-muted-foreground')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8 4')
    }

    drawNode(CLIENT_X, 'Client', '💻')
    drawNode(SERVER_X, 'Server', '🖥️')

    if (currentScene.showProxy) {
      drawNode(PROXY_X, 'Nginx/LB', '🔀')
    }

    // Time axis label
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
      request: '#3b82f6',
      status: '#22c55e',
      version: '#06b6d4',
      tls: '#10b981',
      error: '#ef4444',
    }
    const typeLabels: Record<string, string> = {
      request: 'REQUEST',
      status: 'STATUS',
      version: 'HTTP VER',
      tls: 'TLS',
      error: 'ERROR',
    }
    const badgeX = currentScene.showProxy ? PROXY_X : (CLIENT_X + SERVER_X) / 2

    staticLayer.append('rect')
      .attr('x', badgeX - 40).attr('y', 45)
      .attr('width', 80).attr('height', 24)
      .attr('rx', 12)
      .attr('fill', typeColors[currentScene.type])
      .attr('opacity', 0.2)

    staticLayer.append('text')
      .attr('x', badgeX).attr('y', 62)
      .attr('text-anchor', 'middle')
      .attr('fill', typeColors[currentScene.type])
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(typeLabels[currentScene.type])
  }, [currentScene])

  // Trigger animation when isPlaying changes
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
                ? scene.type === 'error'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : scene.type === 'tls'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : scene.type === 'version'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {scene.title}
          </button>
        ))}
      </div>
    </div>
  )
}
