'use client'

/**
 * TCP vs UDP Visual Comparison
 * Side-by-side comparison with interactive headers
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Minus } from 'lucide-react'

interface ComparisonRow {
  feature: string
  tcp: { value: string; status: 'yes' | 'no' | 'partial' }
  udp: { value: string; status: 'yes' | 'no' | 'partial' }
  explanation: string
}

const COMPARISONS: ComparisonRow[] = [
  {
    feature: 'Connection-oriented',
    tcp: { value: '3-way handshake', status: 'yes' },
    udp: { value: 'Connectionless', status: 'no' },
    explanation: 'TCP thiết lập kết nối trước khi gửi data. UDP gửi thẳng không cần bắt tay.',
  },
  {
    feature: 'Reliable delivery',
    tcp: { value: 'ACK + Retransmit', status: 'yes' },
    udp: { value: 'Best-effort', status: 'no' },
    explanation: 'TCP đảm bảo data đến đích bằng ACK. UDP gửi xong không kiểm tra.',
  },
  {
    feature: 'Ordering',
    tcp: { value: 'Sequence numbers', status: 'yes' },
    udp: { value: 'No ordering', status: 'no' },
    explanation: 'TCP giữ thứ tự packet bằng seq number. UDP packet có thể đến lộn xộn.',
  },
  {
    feature: 'Flow control',
    tcp: { value: 'Window size', status: 'yes' },
    udp: { value: 'None', status: 'no' },
    explanation: 'TCP điều chỉnh tốc độ gửi theo khả năng nhận. UDP gửi tối đa không quan tâm.',
  },
  {
    feature: 'Congestion control',
    tcp: { value: 'Slow start, AIMD', status: 'yes' },
    udp: { value: 'None', status: 'no' },
    explanation: 'TCP giảm tốc khi mạng nghẽn. UDP tiếp tục gửi có thể làm tệ hơn.',
  },
  {
    feature: 'Header size',
    tcp: { value: '20-60 bytes', status: 'partial' },
    udp: { value: '8 bytes', status: 'yes' },
    explanation: 'UDP header nhỏ hơn nhiều → overhead thấp hơn, tốt cho small packets.',
  },
  {
    feature: 'Latency',
    tcp: { value: '+1 RTT (handshake)', status: 'partial' },
    udp: { value: 'Minimal', status: 'yes' },
    explanation: 'TCP cần ít nhất 1 RTT cho handshake trước khi gửi data. UDP gửi ngay.',
  },
  {
    feature: 'Use cases',
    tcp: { value: 'Web, DB, SSH, Email', status: 'yes' },
    udp: { value: 'DNS, VoIP, Game, Stream', status: 'yes' },
    explanation: 'TCP cho data integrity. UDP cho real-time và low-latency applications.',
  },
]

const TCP_HEADER_FIELDS = [
  { name: 'Source Port', bits: 16, color: 'bg-blue-500/30' },
  { name: 'Dest Port', bits: 16, color: 'bg-blue-500/30' },
  { name: 'Sequence Number', bits: 32, color: 'bg-emerald-500/30' },
  { name: 'Acknowledgment', bits: 32, color: 'bg-emerald-500/30' },
  { name: 'Offset/Flags', bits: 16, color: 'bg-amber-500/30' },
  { name: 'Window', bits: 16, color: 'bg-violet-500/30' },
  { name: 'Checksum', bits: 16, color: 'bg-rose-500/30' },
  { name: 'Urgent Ptr', bits: 16, color: 'bg-rose-500/30' },
]

const UDP_HEADER_FIELDS = [
  { name: 'Source Port', bits: 16, color: 'bg-amber-500/30' },
  { name: 'Dest Port', bits: 16, color: 'bg-amber-500/30' },
  { name: 'Length', bits: 16, color: 'bg-amber-500/30' },
  { name: 'Checksum', bits: 16, color: 'bg-amber-500/30' },
]

function StatusIcon({ status }: { status: 'yes' | 'no' | 'partial' }) {
  if (status === 'yes') return <Check className="w-4 h-4 text-emerald-500" />
  if (status === 'no') return <X className="w-4 h-4 text-rose-500" />
  return <Minus className="w-4 h-4 text-amber-500" />
}

export function TcpUdpComparison() {
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [showHeaders, setShowHeaders] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header Structure Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">TCP vs UDP</h3>
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className={cn(
            'text-sm px-3 py-1 rounded-lg transition-colors',
            showHeaders ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          )}
        >
          {showHeaders ? 'Hide Headers' : 'Show Headers'}
        </button>
      </div>

      {/* Header Diagrams */}
      {showHeaders && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TCP Header */}
          <div className="bg-blue-500/10 rounded-lg p-4">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">
              TCP Header (20-60 bytes)
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {TCP_HEADER_FIELDS.map((field, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono text-center',
                    field.color
                  )}
                >
                  <div className="font-medium">{field.name}</div>
                  <div className="text-muted-foreground">{field.bits} bits</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              + Options (0-40 bytes) → Total: 20-60 bytes
            </p>
          </div>

          {/* UDP Header */}
          <div className="bg-amber-500/10 rounded-lg p-4">
            <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 text-sm">
              UDP Header (8 bytes)
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {UDP_HEADER_FIELDS.map((field, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono text-center',
                    field.color
                  )}
                >
                  <div className="font-medium">{field.name}</div>
                  <div className="text-muted-foreground">{field.bits} bits</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Chỉ 8 bytes cố định — minimal overhead
            </p>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-semibold">Feature</th>
              <th className="text-center p-3 font-semibold text-blue-600 dark:text-blue-400">TCP</th>
              <th className="text-center p-3 font-semibold text-amber-600 dark:text-amber-400">UDP</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISONS.map((row, idx) => (
              <>
                <tr
                  key={idx}
                  onClick={() => setSelectedRow(selectedRow === idx ? null : idx)}
                  className={cn(
                    'cursor-pointer transition-colors border-t border-border',
                    selectedRow === idx ? 'bg-muted/30' : 'hover:bg-muted/20'
                  )}
                >
                  <td className="p-3 font-medium">{row.feature}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StatusIcon status={row.tcp.status} />
                      <span className="text-muted-foreground text-xs">{row.tcp.value}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <StatusIcon status={row.udp.status} />
                      <span className="text-muted-foreground text-xs">{row.udp.value}</span>
                    </div>
                  </td>
                </tr>
                {selectedRow === idx && (
                  <tr key={`${idx}-detail`}>
                    <td colSpan={3} className="p-3 bg-muted/20 text-sm text-muted-foreground border-t border-border/50">
                      {row.explanation}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Dùng TCP khi:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Data phải đến đủ và đúng thứ tự</li>
            <li>• Web, API, Database, Email, File transfer</li>
            <li>• Mất 1 byte = corrupt toàn bộ message</li>
          </ul>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-4">
          <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Dùng UDP khi:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Latency quan trọng hơn completeness</li>
            <li>• DNS, VoIP, Video streaming, Game</li>
            <li>• Mất vài packet OK, miễn là nhanh</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
