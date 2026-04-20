'use client'

/**
 * IP Address Classifier - Educational visualizer for IP classes, ranges, and use cases
 * Explains: Classes A/B/C/D/E, Private vs Public, Special ranges
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Home,
  Cloud,
  Server,
  Globe,
  Radio,
  Ban,
  FlaskConical,
  Network,
  Wifi,
} from 'lucide-react'

interface IpClassification {
  class: 'A' | 'B' | 'C' | 'D' | 'E'
  classDescription: string
  classRange: string
  classDefaultMask: string
  isPrivate: boolean
  privateRange?: string
  isSpecial: boolean
  specialType?: string
  specialDescription?: string
  useCase: string
  useCaseIcon: React.ReactNode
  color: string
  networkBits: number
  hostBits: number
  maxNetworks: string
  maxHosts: string
}

const IP_CLASSES = [
  {
    class: 'A',
    range: '1.0.0.0 - 126.255.255.255',
    firstOctet: '1-126',
    defaultMask: '/8 (255.0.0.0)',
    networkBits: 8,
    hostBits: 24,
    maxNetworks: '126',
    maxHosts: '16,777,214',
    description: 'Dành cho tổ chức rất lớn (ISP, chính phủ)',
    color: '#ef4444',
  },
  {
    class: 'B',
    range: '128.0.0.0 - 191.255.255.255',
    firstOctet: '128-191',
    defaultMask: '/16 (255.255.0.0)',
    networkBits: 16,
    hostBits: 16,
    maxNetworks: '16,384',
    maxHosts: '65,534',
    description: 'Dành cho tổ chức vừa và lớn (đại học, công ty lớn)',
    color: '#f59e0b',
  },
  {
    class: 'C',
    range: '192.0.0.0 - 223.255.255.255',
    firstOctet: '192-223',
    defaultMask: '/24 (255.255.255.0)',
    networkBits: 24,
    hostBits: 8,
    maxNetworks: '2,097,152',
    maxHosts: '254',
    description: 'Dành cho tổ chức nhỏ, mạng LAN',
    color: '#22c55e',
  },
  {
    class: 'D',
    range: '224.0.0.0 - 239.255.255.255',
    firstOctet: '224-239',
    defaultMask: 'N/A',
    networkBits: 0,
    hostBits: 0,
    maxNetworks: 'N/A',
    maxHosts: 'N/A',
    description: 'Multicast - gửi tới nhóm thiết bị (IPTV, streaming)',
    color: '#8b5cf6',
  },
  {
    class: 'E',
    range: '240.0.0.0 - 255.255.255.255',
    firstOctet: '240-255',
    defaultMask: 'N/A',
    networkBits: 0,
    hostBits: 0,
    maxNetworks: 'N/A',
    maxHosts: 'N/A',
    description: 'Reserved - dành cho nghiên cứu, thử nghiệm',
    color: '#6b7280',
  },
]

const PRIVATE_RANGES = [
  {
    name: 'Class A Private',
    range: '10.0.0.0/8',
    start: '10.0.0.0',
    end: '10.255.255.255',
    hosts: '16,777,214',
    useCase: 'Doanh nghiệp lớn, Cloud (AWS VPC, Azure VNet)',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    name: 'Class B Private',
    range: '172.16.0.0/12',
    start: '172.16.0.0',
    end: '172.31.255.255',
    hosts: '1,048,574',
    useCase: 'Doanh nghiệp vừa, Docker default, Kubernetes',
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    name: 'Class C Private',
    range: '192.168.0.0/16',
    start: '192.168.0.0',
    end: '192.168.255.255',
    hosts: '65,534',
    useCase: 'Mạng gia đình, văn phòng nhỏ, router WiFi',
    icon: <Home className="w-4 h-4" />,
  },
]

const SPECIAL_RANGES = [
  {
    name: 'Loopback',
    range: '127.0.0.0/8',
    example: '127.0.0.1',
    description: 'Địa chỉ localhost - test trên chính máy',
    icon: <Server className="w-4 h-4" />,
    color: '#06b6d4',
  },
  {
    name: 'Link-Local',
    range: '169.254.0.0/16',
    example: '169.254.x.x',
    description: 'APIPA - tự gán khi không có DHCP',
    icon: <Wifi className="w-4 h-4" />,
    color: '#ec4899',
  },
  {
    name: 'Multicast',
    range: '224.0.0.0/4',
    example: '224.0.0.1',
    description: 'Gửi tới nhóm thiết bị (IPTV, video conference)',
    icon: <Radio className="w-4 h-4" />,
    color: '#8b5cf6',
  },
  {
    name: 'Broadcast',
    range: '255.255.255.255',
    example: '255.255.255.255',
    description: 'Limited broadcast - gửi tới tất cả trong LAN',
    icon: <Globe className="w-4 h-4" />,
    color: '#f59e0b',
  },
  {
    name: 'Reserved',
    range: '0.0.0.0/8',
    example: '0.0.0.0',
    description: 'This network - đại diện default route',
    icon: <Ban className="w-4 h-4" />,
    color: '#6b7280',
  },
]

function parseIp(ip: string): number[] | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null

  const octets = parts.map(p => parseInt(p, 10))
  if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return null

  return octets
}

function classifyIp(octets: number[]): IpClassification | null {
  const [first, second] = octets

  // Check special addresses first
  if (first === 0) {
    return {
      class: 'A',
      classDescription: 'Reserved',
      classRange: '0.0.0.0/8',
      classDefaultMask: 'N/A',
      isPrivate: false,
      isSpecial: true,
      specialType: 'This Network',
      specialDescription: '0.0.0.0 = default route hoặc "bất kỳ địa chỉ nào". Không gán cho host.',
      useCase: 'Default route trong routing table',
      useCaseIcon: <Ban className="w-5 h-5" />,
      color: '#6b7280',
      networkBits: 0,
      hostBits: 0,
      maxNetworks: 'N/A',
      maxHosts: 'N/A',
    }
  }

  if (first === 127) {
    return {
      class: 'A',
      classDescription: 'Loopback',
      classRange: '127.0.0.0/8',
      classDefaultMask: '/8',
      isPrivate: false,
      isSpecial: true,
      specialType: 'Loopback',
      specialDescription: '127.x.x.x dùng để test trên chính máy. 127.0.0.1 = localhost.',
      useCase: 'Development, testing local services',
      useCaseIcon: <Server className="w-5 h-5" />,
      color: '#06b6d4',
      networkBits: 8,
      hostBits: 24,
      maxNetworks: '1',
      maxHosts: 'N/A (loopback)',
    }
  }

  if (first === 169 && second === 254) {
    return {
      class: 'B',
      classDescription: 'Link-Local (APIPA)',
      classRange: '169.254.0.0/16',
      classDefaultMask: '/16',
      isPrivate: false,
      isSpecial: true,
      specialType: 'Link-Local',
      specialDescription: 'APIPA - tự động gán khi DHCP không khả dụng. Chỉ giao tiếp trong LAN.',
      useCase: 'Fallback khi không có DHCP server',
      useCaseIcon: <Wifi className="w-5 h-5" />,
      color: '#ec4899',
      networkBits: 16,
      hostBits: 16,
      maxNetworks: '1',
      maxHosts: '65,534',
    }
  }

  if (first >= 224 && first <= 239) {
    return {
      class: 'D',
      classDescription: 'Multicast',
      classRange: '224.0.0.0 - 239.255.255.255',
      classDefaultMask: 'N/A',
      isPrivate: false,
      isSpecial: true,
      specialType: 'Multicast',
      specialDescription: 'Gửi packet tới NHÓM thiết bị đã đăng ký. Dùng cho streaming, IPTV, video conference.',
      useCase: 'IPTV, Video streaming, OSPF routing',
      useCaseIcon: <Radio className="w-5 h-5" />,
      color: '#8b5cf6',
      networkBits: 0,
      hostBits: 0,
      maxNetworks: 'N/A',
      maxHosts: 'N/A',
    }
  }

  if (first >= 240) {
    return {
      class: 'E',
      classDescription: 'Reserved/Experimental',
      classRange: '240.0.0.0 - 255.255.255.255',
      classDefaultMask: 'N/A',
      isPrivate: false,
      isSpecial: true,
      specialType: 'Reserved',
      specialDescription: 'Dành cho nghiên cứu và thử nghiệm. Không dùng trên Internet công cộng.',
      useCase: 'Research, experimental protocols',
      useCaseIcon: <FlaskConical className="w-5 h-5" />,
      color: '#6b7280',
      networkBits: 0,
      hostBits: 0,
      maxNetworks: 'N/A',
      maxHosts: 'N/A',
    }
  }

  // Class A (1-126)
  if (first >= 1 && first <= 126) {
    const isPrivate = first === 10
    return {
      class: 'A',
      classDescription: 'Class A - Tổ chức rất lớn',
      classRange: '1.0.0.0 - 126.255.255.255',
      classDefaultMask: '/8 (255.0.0.0)',
      isPrivate,
      privateRange: isPrivate ? '10.0.0.0/8' : undefined,
      isSpecial: false,
      useCase: isPrivate
        ? 'Doanh nghiệp lớn, Cloud VPC (AWS, Azure, GCP)'
        : 'ISP, tổ chức chính phủ, công ty toàn cầu',
      useCaseIcon: isPrivate ? <Building2 className="w-5 h-5" /> : <Globe className="w-5 h-5" />,
      color: '#ef4444',
      networkBits: 8,
      hostBits: 24,
      maxNetworks: '126',
      maxHosts: '16,777,214',
    }
  }

  // Class B (128-191)
  if (first >= 128 && first <= 191) {
    const isPrivate = first === 172 && second >= 16 && second <= 31
    return {
      class: 'B',
      classDescription: 'Class B - Tổ chức vừa và lớn',
      classRange: '128.0.0.0 - 191.255.255.255',
      classDefaultMask: '/16 (255.255.0.0)',
      isPrivate,
      privateRange: isPrivate ? '172.16.0.0/12' : undefined,
      isSpecial: false,
      useCase: isPrivate
        ? 'Docker networks, Kubernetes clusters, doanh nghiệp vừa'
        : 'Đại học, công ty lớn, tổ chức quốc gia',
      useCaseIcon: isPrivate ? <Cloud className="w-5 h-5" /> : <Building2 className="w-5 h-5" />,
      color: '#f59e0b',
      networkBits: 16,
      hostBits: 16,
      maxNetworks: '16,384',
      maxHosts: '65,534',
    }
  }

  // Class C (192-223)
  if (first >= 192 && first <= 223) {
    const isPrivate = first === 192 && second === 168
    return {
      class: 'C',
      classDescription: 'Class C - Tổ chức nhỏ',
      classRange: '192.0.0.0 - 223.255.255.255',
      classDefaultMask: '/24 (255.255.255.0)',
      isPrivate,
      privateRange: isPrivate ? '192.168.0.0/16' : undefined,
      isSpecial: false,
      useCase: isPrivate
        ? 'Mạng gia đình, văn phòng nhỏ, router WiFi'
        : 'SMB, web servers, small organizations',
      useCaseIcon: isPrivate ? <Home className="w-5 h-5" /> : <Network className="w-5 h-5" />,
      color: '#22c55e',
      networkBits: 24,
      hostBits: 8,
      maxNetworks: '2,097,152',
      maxHosts: '254',
    }
  }

  return null
}

function IpBinaryDisplay({ octets, classification }: { octets: number[]; classification: IpClassification }) {
  const binaryOctets = octets.map(o => o.toString(2).padStart(8, '0'))
  const { networkBits } = classification

  return (
    <div className="font-mono text-sm flex flex-wrap justify-center gap-1">
      {binaryOctets.map((binary, octetIdx) => (
        <span key={octetIdx} className="flex">
          {binary.split('').map((bit, bitIdx) => {
            const globalBitIdx = octetIdx * 8 + bitIdx
            const isNetworkBit = globalBitIdx < networkBits
            return (
              <span
                key={bitIdx}
                className={cn(
                  'w-3 h-5 flex items-center justify-center rounded-sm text-xs',
                  isNetworkBit
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/30 text-amber-400'
                )}
              >
                {bit}
              </span>
            )
          })}
          {octetIdx < 3 && <span className="mx-1 text-muted-foreground">.</span>}
        </span>
      ))}
    </div>
  )
}

export function IpAddressClassifier({ className }: { className?: string }) {
  const [inputValue, setInputValue] = useState('192.168.1.100')
  const [activeTab, setActiveTab] = useState<'classify' | 'classes' | 'private' | 'special'>('classify')

  const { octets, classification } = useMemo(() => {
    const parsed = parseIp(inputValue)
    if (!parsed) return { octets: null, classification: null }
    return { octets: parsed, classification: classifyIp(parsed) }
  }, [inputValue])

  const quickExamples = [
    { ip: '10.0.0.1', label: 'Private A' },
    { ip: '172.16.0.1', label: 'Private B' },
    { ip: '192.168.1.1', label: 'Private C' },
    { ip: '8.8.8.8', label: 'Public (Google DNS)' },
    { ip: '127.0.0.1', label: 'Localhost' },
    { ip: '224.0.0.1', label: 'Multicast' },
    { ip: '169.254.1.1', label: 'Link-Local' },
    { ip: '255.255.255.255', label: 'Broadcast' },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        {[
          { id: 'classify', label: 'Phân loại IP' },
          { id: 'classes', label: 'Classes A-E' },
          { id: 'private', label: 'Private Ranges' },
          { id: 'special', label: 'Special' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex-1 px-3 py-2 text-sm rounded-md transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'classify' && (
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Nhập địa chỉ IP:
              </label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="192.168.1.100"
                className="w-48 font-mono"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {quickExamples.map(ex => (
                <Button
                  key={ex.ip}
                  size="sm"
                  variant="outline"
                  onClick={() => setInputValue(ex.ip)}
                  className="text-xs"
                >
                  {ex.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Classification Result */}
          {octets && classification ? (
            <div className="space-y-4">
              {/* IP Display */}
              <div
                className="rounded-lg p-4 border-2"
                style={{ borderColor: classification.color }}
              >
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <span
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${classification.color}20` }}
                    >
                      {classification.useCaseIcon}
                    </span>
                    <span className="font-mono text-2xl font-bold">{inputValue}</span>
                    <span
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{
                        backgroundColor: `${classification.color}20`,
                        color: classification.color,
                      }}
                    >
                      CLASS {classification.class}
                    </span>
                  </div>

                  {/* Binary */}
                  <IpBinaryDisplay octets={octets} classification={classification} />

                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <span className="inline-block w-3 h-3 rounded bg-emerald-500/30 mr-1" />
                      Network ({classification.networkBits} bits)
                    </span>
                    <span>
                      <span className="inline-block w-3 h-3 rounded bg-amber-500/30 mr-1" />
                      Host ({classification.hostBits} bits)
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Classification Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Phân loại</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Class:</span>{' '}
                      <span className="font-medium">{classification.classDescription}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Range:</span>{' '}
                      <span className="font-mono text-xs">{classification.classRange}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Default Mask:</span>{' '}
                      <span className="font-mono">{classification.classDefaultMask}</span>
                    </p>
                    {classification.maxHosts !== 'N/A' && (
                      <p>
                        <span className="text-muted-foreground">Max Hosts/Network:</span>{' '}
                        <span className="font-medium">{classification.maxHosts}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & Use Case */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Trạng thái & Sử dụng</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      {classification.isPrivate && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                          PRIVATE
                        </span>
                      )}
                      {!classification.isPrivate && !classification.isSpecial && (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                          PUBLIC
                        </span>
                      )}
                      {classification.isSpecial && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                          {classification.specialType}
                        </span>
                      )}
                    </div>
                    {classification.privateRange && (
                      <p>
                        <span className="text-muted-foreground">Private Range:</span>{' '}
                        <span className="font-mono text-xs">{classification.privateRange}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Dùng cho:</span>{' '}
                      <span>{classification.useCase}</span>
                    </p>
                    {classification.specialDescription && (
                      <p className="text-muted-foreground text-xs mt-2">
                        {classification.specialDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nhập địa chỉ IP hợp lệ (ví dụ: 192.168.1.100)
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            IP Classes phân loại theo octet đầu tiên. Ngày nay CIDR thay thế nhưng vẫn cần hiểu để đọc tài liệu cũ.
          </p>
          <div className="space-y-2">
            {IP_CLASSES.map(cls => (
              <div
                key={cls.class}
                className="rounded-lg p-3 border-l-4 bg-muted/30"
                style={{ borderColor: cls.color }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: `${cls.color}20`, color: cls.color }}
                      >
                        CLASS {cls.class}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        First octet: {cls.firstOctet}
                      </span>
                    </div>
                    <p className="text-sm">{cls.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: {cls.range}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Default Mask</p>
                    <p className="font-mono">{cls.defaultMask}</p>
                    {cls.maxHosts !== 'N/A' && (
                      <>
                        <p className="text-muted-foreground mt-1">Max Hosts</p>
                        <p className="font-medium">{cls.maxHosts}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'private' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            RFC 1918 định nghĩa 3 dải IP private - dùng nội bộ, không route trên Internet. Cần NAT để ra ngoài.
          </p>
          <div className="space-y-2">
            {PRIVATE_RANGES.map(range => (
              <div
                key={range.name}
                className="rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setInputValue(range.start.replace('.0.0', '.1.100').replace('.0.0.0', '.1.1.1'))
                  setActiveTab('classify')
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    {range.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{range.name}</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {range.range}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{range.useCase}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {range.start} → {range.end} ({range.hosts} hosts)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'special' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Các dải IP đặc biệt có mục đích riêng, không dùng cho host thông thường.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SPECIAL_RANGES.map(range => (
              <div
                key={range.name}
                className="rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setInputValue(range.example)
                  setActiveTab('classify')
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${range.color}20`, color: range.color }}
                  >
                    {range.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{range.name}</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {range.range}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{range.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
