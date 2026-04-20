'use client'

/**
 * ARP Header Comparison — ARP packet structure with Request vs Reply diff
 * Interactive: click field to expand explanation
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ArpField {
  name: string
  bits: number
  color: string
  requestValue: string
  replyValue: string
  explanation: string
}

const ARP_FIELDS: ArpField[] = [
  {
    name: 'Hardware Type',
    bits: 16,
    color: 'bg-blue-500/30',
    requestValue: '1 (Ethernet)',
    replyValue: '1 (Ethernet)',
    explanation: 'Loại phần cứng L2. Ethernet = 1. Giá trị này giống nhau trong cả Request và Reply.',
  },
  {
    name: 'Protocol Type',
    bits: 16,
    color: 'bg-blue-500/30',
    requestValue: '0x0800 (IPv4)',
    replyValue: '0x0800 (IPv4)',
    explanation: 'Loại giao thức L3 cần resolve. IPv4 = 0x0800. Cùng giá trị trong Request và Reply.',
  },
  {
    name: 'HW Addr Length',
    bits: 8,
    color: 'bg-violet-500/30',
    requestValue: '6 (MAC = 6 bytes)',
    replyValue: '6 (MAC = 6 bytes)',
    explanation: 'Độ dài MAC address tính bằng byte. Ethernet MAC = 6 bytes. Cố định.',
  },
  {
    name: 'Proto Addr Length',
    bits: 8,
    color: 'bg-violet-500/30',
    requestValue: '4 (IPv4 = 4 bytes)',
    replyValue: '4 (IPv4 = 4 bytes)',
    explanation: 'Độ dài IP address tính bằng byte. IPv4 = 4 bytes. Cố định.',
  },
  {
    name: 'Operation',
    bits: 16,
    color: 'bg-amber-500/30',
    requestValue: '1 (REQUEST)',
    replyValue: '2 (REPLY)',
    explanation: 'Phân biệt Request (1) vs Reply (2). Đây là field duy nhất khác biệt cơ bản giữa Request và Reply.',
  },
  {
    name: 'Sender MAC',
    bits: 48,
    color: 'bg-emerald-500/30',
    requestValue: 'Client MAC (aa:bb:cc:...)',
    replyValue: 'Target MAC (dd:ee:ff:...)',
    explanation: 'MAC của máy gửi packet. Trong Request: MAC của Client (người hỏi). Trong Reply: MAC của Target (người trả lời). Đây chính là dữ liệu quan trọng nhất trong Reply.',
  },
  {
    name: 'Sender IP',
    bits: 32,
    color: 'bg-emerald-500/30',
    requestValue: 'Client IP (192.168.1.5)',
    replyValue: 'Target IP (192.168.1.10)',
    explanation: 'IP của máy gửi. Trong Request: IP của Client. Trong Reply: IP của Target — xác nhận mapping IP→MAC.',
  },
  {
    name: 'Target MAC',
    bits: 48,
    color: 'bg-cyan-500/30',
    requestValue: '00:00:00:00:00:00 (unknown)',
    replyValue: 'Client MAC (aa:bb:cc:...)',
    explanation: 'MAC của máy đích. Trong Request: 0 vì chưa biết (đó là lý do phải hỏi!). Trong Reply: MAC của Client — để unicast reply về đúng nơi.',
  },
  {
    name: 'Target IP',
    bits: 32,
    color: 'bg-cyan-500/30',
    requestValue: 'Target IP (192.168.1.10)',
    replyValue: 'Client IP (192.168.1.5)',
    explanation: 'IP của máy đích. Trong Request: IP cần resolve (máy cần hỏi). Trong Reply: IP của Client (phản chiếu lại để Client xác nhận đây là reply cho mình).',
  },
]

export function ArpHeaderComparison() {
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [showBits, setShowBits] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ARP Packet Structure</h3>
        <button
          onClick={() => setShowBits(!showBits)}
          className={cn(
            'text-sm px-3 py-1 rounded-lg transition-colors',
            showBits ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          )}
        >
          {showBits ? 'Hide bit sizes' : 'Show bit sizes'}
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-semibold">
                Field {showBits && <span className="text-muted-foreground font-normal text-xs">(bits)</span>}
              </th>
              <th className="text-center p-3 font-semibold text-blue-600 dark:text-blue-400">
                Request (op=1)
              </th>
              <th className="text-center p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                Reply (op=2)
              </th>
            </tr>
          </thead>
          <tbody>
            {ARP_FIELDS.map((field, idx) => (
              <>
                <tr
                  key={idx}
                  onClick={() => setSelectedField(selectedField === idx ? null : idx)}
                  className={cn(
                    'cursor-pointer transition-colors border-t border-border',
                    selectedField === idx ? 'bg-muted/30' : 'hover:bg-muted/20'
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full flex-none', field.color.replace('/30', ''))} />
                      <span className="font-medium">{field.name}</span>
                      {showBits && (
                        <span className="text-xs text-muted-foreground font-mono">{field.bits}b</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs font-mono text-muted-foreground">{field.requestValue}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={cn(
                        'text-xs font-mono',
                        field.requestValue !== field.replyValue
                          ? 'text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-muted-foreground'
                      )}
                    >
                      {field.replyValue}
                    </span>
                  </td>
                </tr>
                {selectedField === idx && (
                  <tr key={`${idx}-detail`}>
                    <td
                      colSpan={3}
                      className="p-3 bg-muted/20 text-sm text-muted-foreground border-t border-border/50"
                    >
                      {field.explanation}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        <span>Giá trị màu vàng = khác nhau giữa Request và Reply</span>
        <span className="ml-2">• Click row để xem giải thích</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 rounded-lg p-4">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">
            ARP Request — broadcast
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 font-mono">
            <li>Eth dst: ff:ff:ff:ff:ff:ff</li>
            <li>op: 1 (REQUEST)</li>
            <li>sender: Client IP + Client MAC</li>
            <li>target: Target IP + 00:00:00:00:00:00</li>
          </ul>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2 text-sm">
            ARP Reply — unicast
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 font-mono">
            <li>Eth dst: Client MAC (unicast)</li>
            <li>op: 2 (REPLY)</li>
            <li>sender: Target IP + Target MAC ← key data</li>
            <li>target: Client IP + Client MAC</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
