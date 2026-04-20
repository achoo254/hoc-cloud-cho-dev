'use client'

/**
 * Host Bits Visualizer - Animated explanation of Network/Broadcast addresses
 * Uses D3.js for packet animations similar to Network Topology.
 *
 * Features:
 * - Preset scenes for Network/Broadcast/Normal addresses
 * - Manual IP input to explore any address in subnet
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Play, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface HostBitsVisualizerProps {
  className?: string
}

const WIDTH = 700
const HEIGHT = 380
const DEVICE_Y = 280
const PACKET_RADIUS = 10

interface Device {
  id: string
  x: number
  y: number
  ipNum: number
  label: string
}

interface SubnetConfig {
  prefix: string        // e.g., "192.168.1" or "10.0.0" or "172.16.0" or "224.0.0"
  cidr: number          // e.g., 24, 16, 8
  class: 'A' | 'B' | 'C' | 'D'
  classColor: string
  isMulticast?: boolean
  isPublic?: boolean
}

interface Scene {
  id: string
  title: string
  description: string
  subnet: SubnetConfig
  hostValue: number
  highlightDevices: string[]
  packetColor: string
  isSpecialAddress: boolean
  specialLabel?: string
}

const SUBNET_CLASS_C: SubnetConfig = {
  prefix: '192.168.1',
  cidr: 24,
  class: 'C',
  classColor: '#22c55e',
}

const SUBNET_CLASS_B: SubnetConfig = {
  prefix: '172.16.0',
  cidr: 16,
  class: 'B',
  classColor: '#f59e0b',
}

const SUBNET_CLASS_A: SubnetConfig = {
  prefix: '10.0.0',
  cidr: 8,
  class: 'A',
  classColor: '#ef4444',
}

const SUBNET_CLASS_D: SubnetConfig = {
  prefix: '224.0.0',
  cidr: 4,
  class: 'D',
  classColor: '#8b5cf6',
  isMulticast: true,
}

// Public network examples
const SUBNET_PUBLIC_A: SubnetConfig = {
  prefix: '8.8.8',
  cidr: 24,
  class: 'A',
  classColor: '#ef4444',
  isPublic: true,
}

const SUBNET_PUBLIC_B: SubnetConfig = {
  prefix: '142.250.204',
  cidr: 24,
  class: 'B',
  classColor: '#f59e0b',
  isPublic: true,
}

const SUBNET_PUBLIC_C: SubnetConfig = {
  prefix: '203.113.152',
  cidr: 24,
  class: 'C',
  classColor: '#22c55e',
  isPublic: true,
}

// Unicast devices (Class A/B/C)
const UNICAST_DEVICES: Device[] = [
  { id: 'router', x: 100, y: DEVICE_Y, ipNum: 1, label: 'Router' },
  { id: 'host1', x: 200, y: DEVICE_Y, ipNum: 10, label: 'Server' },
  { id: 'host2', x: 300, y: DEVICE_Y, ipNum: 50, label: 'PC' },
  { id: 'host3', x: 400, y: DEVICE_Y, ipNum: 100, label: 'Laptop' },
  { id: 'host4', x: 500, y: DEVICE_Y, ipNum: 200, label: 'Phone' },
  { id: 'broadcast', x: 600, y: DEVICE_Y, ipNum: 255, label: 'All Hosts' },
]

// Multicast groups (Class D) - represent GROUP membership, not individual hosts
const MULTICAST_DEVICES: Device[] = [
  { id: 'router', x: 100, y: DEVICE_Y, ipNum: 1, label: 'Routing' },
  { id: 'host1', x: 200, y: DEVICE_Y, ipNum: 10, label: 'Video Group' },
  { id: 'host2', x: 300, y: DEVICE_Y, ipNum: 50, label: 'Voice Group' },
  { id: 'host3', x: 400, y: DEVICE_Y, ipNum: 100, label: 'Gaming Group' },
  { id: 'host4', x: 500, y: DEVICE_Y, ipNum: 200, label: 'IoT Group' },
  { id: 'broadcast', x: 600, y: DEVICE_Y, ipNum: 255, label: 'Custom Group' },
]

// Public network devices - Internet infrastructure
const PUBLIC_DEVICES: Device[] = [
  { id: 'router', x: 100, y: DEVICE_Y, ipNum: 1, label: 'ISP Gateway' },
  { id: 'host1', x: 200, y: DEVICE_Y, ipNum: 8, label: 'DNS Server' },
  { id: 'host2', x: 300, y: DEVICE_Y, ipNum: 50, label: 'Web Server' },
  { id: 'host3', x: 400, y: DEVICE_Y, ipNum: 100, label: 'Cloud VM' },
  { id: 'host4', x: 500, y: DEVICE_Y, ipNum: 200, label: 'CDN Edge' },
  { id: 'broadcast', x: 600, y: DEVICE_Y, ipNum: 255, label: 'Internet' },
]

// Default to unicast devices
const DEVICES = UNICAST_DEVICES

const PRESET_SCENES: Scene[] = [
  // ============ CLASS C (192.168.x.x/24) - Home/Small Office ============
  {
    id: 'c-intro',
    title: '🏠 Class C: Mạng gia đình (192.168.1.0/24)',
    description: 'Class C có 24 bit network, 8 bit host → 254 địa chỉ/subnet. Phổ biến nhất cho home router, văn phòng nhỏ.',
    subnet: SUBNET_CLASS_C,
    hostValue: 1,
    highlightDevices: ['router'],
    packetColor: '#22c55e',
    isSpecialAddress: false,
    specialLabel: 'CLASS C',
  },
  {
    id: 'c-network',
    title: 'Class C: Network Address (.0)',
    description: 'Host bits = 00000000 → Địa chỉ đại diện cho subnet. Router dùng trong bảng định tuyến. KHÔNG gán cho thiết bị.',
    subnet: SUBNET_CLASS_C,
    hostValue: 0,
    highlightDevices: [],
    packetColor: '#ef4444',
    isSpecialAddress: true,
    specialLabel: 'NETWORK',
  },
  {
    id: 'c-gateway',
    title: 'Class C: Gateway (.1)',
    description: 'Địa chỉ đầu tiên (.1) thường là Gateway/Router. Convention giúp admin nhớ dễ dàng.',
    subnet: SUBNET_CLASS_C,
    hostValue: 1,
    highlightDevices: ['router'],
    packetColor: '#3b82f6',
    isSpecialAddress: false,
  },
  {
    id: 'c-dhcp',
    title: 'Class C: DHCP Pool (.100)',
    description: 'DHCP server gán IP tự động. Pool thường từ .100-.200 cho laptop, phone kết nối WiFi.',
    subnet: SUBNET_CLASS_C,
    hostValue: 100,
    highlightDevices: ['host3'],
    packetColor: '#22c55e',
    isSpecialAddress: false,
  },
  {
    id: 'c-broadcast',
    title: 'Class C: Broadcast (.255)',
    description: 'Host bits = 11111111 → Gửi tới TẤT CẢ thiết bị trong subnet. Dùng cho ARP, DHCP discover.',
    subnet: SUBNET_CLASS_C,
    hostValue: 255,
    highlightDevices: ['router', 'host1', 'host2', 'host3', 'host4'],
    packetColor: '#f59e0b',
    isSpecialAddress: false,
    specialLabel: 'BROADCAST',
  },

  // ============ CLASS B (172.16.x.x/16) - Enterprise/Docker ============
  {
    id: 'b-intro',
    title: '🏢 Class B: Doanh nghiệp (172.16.0.0/16)',
    description: 'Class B có 16 bit network, 16 bit host → 65,534 địa chỉ/subnet. Dùng cho Docker, Kubernetes, doanh nghiệp vừa.',
    subnet: SUBNET_CLASS_B,
    hostValue: 1,
    highlightDevices: ['router'],
    packetColor: '#f59e0b',
    isSpecialAddress: false,
    specialLabel: 'CLASS B',
  },
  {
    id: 'b-network',
    title: 'Class B: Network Address (.0)',
    description: '172.16.0.0 là network address. 16 bit host cho phép hơn 65K thiết bị trong 1 subnet (thực tế chia nhỏ hơn).',
    subnet: SUBNET_CLASS_B,
    hostValue: 0,
    highlightDevices: [],
    packetColor: '#ef4444',
    isSpecialAddress: true,
    specialLabel: 'NETWORK',
  },
  {
    id: 'b-docker',
    title: 'Class B: Docker Default (172.17.x.x)',
    description: 'Docker bridge network mặc định dùng 172.17.0.0/16. Hay conflict với VPN công ty dùng 172.16.0.0/12!',
    subnet: { ...SUBNET_CLASS_B, prefix: '172.17.0' },
    hostValue: 2,
    highlightDevices: ['host1'],
    packetColor: '#3b82f6',
    isSpecialAddress: false,
    specialLabel: 'DOCKER',
  },
  {
    id: 'b-broadcast',
    title: 'Class B: Broadcast (.255)',
    description: 'Broadcast 172.16.0.255 gửi tới tất cả trong /24 subnet. Với /16, broadcast là 172.16.255.255.',
    subnet: SUBNET_CLASS_B,
    hostValue: 255,
    highlightDevices: ['router', 'host1', 'host2', 'host3', 'host4'],
    packetColor: '#f59e0b',
    isSpecialAddress: false,
    specialLabel: 'BROADCAST',
  },

  // ============ CLASS A (10.x.x.x/8) - Cloud/Large Enterprise ============
  {
    id: 'a-intro',
    title: '☁️ Class A: Cloud VPC (10.0.0.0/8)',
    description: 'Class A có 8 bit network, 24 bit host → 16 triệu địa chỉ! AWS VPC, Azure VNet, GCP thường dùng 10.x.x.x.',
    subnet: SUBNET_CLASS_A,
    hostValue: 1,
    highlightDevices: ['router'],
    packetColor: '#ef4444',
    isSpecialAddress: false,
    specialLabel: 'CLASS A',
  },
  {
    id: 'a-network',
    title: 'Class A: Network Address (10.0.0.0)',
    description: '10.0.0.0/8 là private range lớn nhất. Thực tế chia thành nhiều /16 hoặc /24 cho các VPC/subnet.',
    subnet: SUBNET_CLASS_A,
    hostValue: 0,
    highlightDevices: [],
    packetColor: '#ef4444',
    isSpecialAddress: true,
    specialLabel: 'NETWORK',
  },
  {
    id: 'a-aws',
    title: 'Class A: AWS VPC Subnet',
    description: 'AWS VPC thường dùng 10.0.0.0/16, chia thành /24 subnets. Mỗi AZ có subnet riêng: 10.0.1.0/24, 10.0.2.0/24...',
    subnet: { ...SUBNET_CLASS_A, prefix: '10.0.1', cidr: 24 },
    hostValue: 10,
    highlightDevices: ['host1'],
    packetColor: '#f97316',
    isSpecialAddress: false,
    specialLabel: 'AWS',
  },
  {
    id: 'a-broadcast',
    title: 'Class A: Broadcast',
    description: 'Trong subnet /24 như 10.0.1.0/24, broadcast là 10.0.1.255. Cloud thường disable broadcast, dùng unicast thay thế.',
    subnet: { ...SUBNET_CLASS_A, prefix: '10.0.1', cidr: 24 },
    hostValue: 255,
    highlightDevices: ['router', 'host1', 'host2', 'host3', 'host4'],
    packetColor: '#f59e0b',
    isSpecialAddress: false,
    specialLabel: 'BROADCAST',
  },

  // ============ CLASS D (224.x.x.x - 239.x.x.x) - Multicast ============
  {
    id: 'd-intro',
    title: '📡 Class D: Multicast (224.0.0.0/4)',
    description: 'Class D dành cho Multicast - gửi packet tới NHÓM thiết bị đã đăng ký. Không có network/broadcast address như unicast.',
    subnet: SUBNET_CLASS_D,
    hostValue: 1,
    highlightDevices: ['host1', 'host3'],
    packetColor: '#8b5cf6',
    isSpecialAddress: false,
    specialLabel: 'MULTICAST',
  },
  {
    id: 'd-all-hosts',
    title: 'Multicast: All Hosts (224.0.0.1)',
    description: '224.0.0.1 gửi tới TẤT CẢ hosts trong LAN segment. Tương tự broadcast nhưng chỉ hosts đăng ký group mới nhận.',
    subnet: SUBNET_CLASS_D,
    hostValue: 1,
    highlightDevices: ['router', 'host1', 'host2', 'host3', 'host4'],
    packetColor: '#8b5cf6',
    isSpecialAddress: false,
    specialLabel: 'ALL HOSTS',
  },
  {
    id: 'd-all-routers',
    title: 'Multicast: All Routers (224.0.0.2)',
    description: '224.0.0.2 gửi tới TẤT CẢ routers. OSPF, RIP dùng địa chỉ này để trao đổi routing information.',
    subnet: SUBNET_CLASS_D,
    hostValue: 2,
    highlightDevices: ['router'],
    packetColor: '#8b5cf6',
    isSpecialAddress: false,
    specialLabel: 'ALL ROUTERS',
  },
  {
    id: 'd-ospf',
    title: 'Multicast: OSPF (224.0.0.5)',
    description: '224.0.0.5 dành cho OSPF routing protocol. Chỉ OSPF routers mới join group này.',
    subnet: { ...SUBNET_CLASS_D, prefix: '224.0.0' },
    hostValue: 5,
    highlightDevices: ['router'],
    packetColor: '#8b5cf6',
    isSpecialAddress: false,
    specialLabel: 'OSPF',
  },
  {
    id: 'd-iptv',
    title: 'Multicast: IPTV/Streaming (239.x.x.x)',
    description: '239.0.0.0/8 là "Administratively Scoped" - dùng cho IPTV, video streaming trong mạng nội bộ. Mỗi channel là 1 multicast group.',
    subnet: { ...SUBNET_CLASS_D, prefix: '239.1.1' },
    hostValue: 1,
    highlightDevices: ['host2', 'host4'],
    packetColor: '#8b5cf6',
    isSpecialAddress: false,
    specialLabel: 'IPTV',
  },

  // ============ PUBLIC NETWORKS - Real Internet IPs ============
  {
    id: 'pub-google-dns',
    title: '🌐 Public: Google DNS (8.8.8.8)',
    description: 'Google Public DNS - một trong những DNS server phổ biến nhất. Class A public IP, route được trên Internet toàn cầu.',
    subnet: SUBNET_PUBLIC_A,
    hostValue: 8,
    highlightDevices: ['host1'],
    packetColor: '#3b82f6',
    isSpecialAddress: false,
    specialLabel: 'PUBLIC',
  },
  {
    id: 'pub-cloudflare',
    title: '🌐 Public: Cloudflare DNS (1.1.1.1)',
    description: 'Cloudflare DNS - nổi tiếng với tốc độ nhanh và privacy. 1.1.1.1 dễ nhớ, Class A public.',
    subnet: { ...SUBNET_PUBLIC_A, prefix: '1.1.1' },
    hostValue: 1,
    highlightDevices: ['host1'],
    packetColor: '#f97316',
    isSpecialAddress: false,
    specialLabel: 'PUBLIC',
  },
  {
    id: 'pub-google-server',
    title: '🌐 Public: Google Server (142.250.x.x)',
    description: 'Google sở hữu dải 142.250.0.0/15. Class B public IP cho các dịch vụ như Search, YouTube, Gmail.',
    subnet: SUBNET_PUBLIC_B,
    hostValue: 68,
    highlightDevices: ['host1'],
    packetColor: '#22c55e',
    isSpecialAddress: false,
    specialLabel: 'PUBLIC',
  },
  {
    id: 'pub-vn-isp',
    title: '🌐 Public: Vietnam ISP (203.113.x.x)',
    description: 'Dải 203.x.x.x phổ biến ở châu Á. Nhiều ISP Việt Nam (VNPT, Viettel) dùng Class C public cho khách hàng.',
    subnet: SUBNET_PUBLIC_C,
    hostValue: 1,
    highlightDevices: ['router'],
    packetColor: '#ef4444',
    isSpecialAddress: false,
    specialLabel: 'PUBLIC',
  },
  {
    id: 'pub-aws',
    title: '🌐 Public: AWS EC2 (54.x.x.x)',
    description: 'AWS sở hữu nhiều dải public IP. 54.x.x.x, 52.x.x.x thường là EC2 instances. Class A public.',
    subnet: { ...SUBNET_PUBLIC_A, prefix: '54.169.100' },
    hostValue: 50,
    highlightDevices: ['host1'],
    packetColor: '#f59e0b',
    isSpecialAddress: false,
    specialLabel: 'AWS',
  },
]

function generateSceneFromHostValue(hostValue: number, subnet: SubnetConfig): Scene {
  const hostBits = hostValue.toString(2).padStart(8, '0')

  // MULTICAST (Class D) - Different logic, no network/broadcast concept
  if (subnet.isMulticast) {
    // Multicast groups based on address ranges
    let groupName = 'Custom Group'
    let groupDesc = `Multicast group ${subnet.prefix}.${hostValue}`
    let highlightDevices: string[] = ['broadcast'] // Default to Custom Group

    if (hostValue === 1) {
      groupName = 'All Hosts'
      groupDesc = 'Tất cả hosts trong LAN segment đều nhận packet này.'
      highlightDevices = ['host1', 'host2', 'host3', 'host4', 'broadcast']
    } else if (hostValue === 2) {
      groupName = 'All Routers'
      groupDesc = 'Tất cả routers nhận packet. Dùng cho routing protocols.'
      highlightDevices = ['router']
    } else if (hostValue >= 5 && hostValue <= 6) {
      groupName = 'OSPF Routers'
      groupDesc = 'Routers chạy OSPF protocol join group này.'
      highlightDevices = ['router']
    } else if (hostValue === 9) {
      groupName = 'RIPv2'
      groupDesc = 'RIPv2 routing protocol multicast group.'
      highlightDevices = ['router']
    } else if (hostValue >= 100 && hostValue <= 199) {
      groupName = 'Streaming'
      groupDesc = 'Devices đã subscribe video/audio stream này.'
      highlightDevices = ['host1', 'host2', 'host4']
    } else if (hostValue >= 200) {
      groupName = 'Custom Group'
      groupDesc = 'User-defined multicast group. Dùng cho ứng dụng tự tạo.'
      highlightDevices = ['broadcast']
    } else if (hostValue >= 10 && hostValue <= 50) {
      groupName = 'Video Group'
      groupDesc = 'Video conferencing hoặc surveillance stream.'
      highlightDevices = ['host1']
    } else if (hostValue >= 51 && hostValue <= 70) {
      groupName = 'Voice Group'
      groupDesc = 'VoIP hoặc audio multicast.'
      highlightDevices = ['host2']
    } else if (hostValue >= 71 && hostValue <= 90) {
      groupName = 'Gaming Group'
      groupDesc = 'Multiplayer game multicast.'
      highlightDevices = ['host3']
    } else if (hostValue >= 91 && hostValue <= 99) {
      groupName = 'IoT Group'
      groupDesc = 'IoT device discovery và control.'
      highlightDevices = ['host4']
    }

    return {
      id: 'multicast',
      title: `Multicast: ${groupName}`,
      description: `${subnet.prefix}.${hostValue} → ${groupDesc} Chỉ members đã JOIN group mới nhận.`,
      subnet,
      hostValue,
      highlightDevices,
      packetColor: '#8b5cf6',
      isSpecialAddress: false,
      specialLabel: 'MULTICAST',
    }
  }

  // UNICAST (Class A/B/C) - Network and Broadcast addresses
  if (hostValue === 0) {
    return {
      id: 'network',
      title: 'Network Address (Host bits toàn 0)',
      description: `Host bits = ${hostBits} → Địa chỉ .0 đại diện cho CẢ MẠNG. Không gán cho thiết bị nào. Router dùng trong routing table.`,
      subnet,
      hostValue,
      highlightDevices: [],
      packetColor: '#ef4444',
      isSpecialAddress: true,
      specialLabel: 'NETWORK',
    }
  }

  if (hostValue === 255) {
    return {
      id: 'broadcast',
      title: 'Broadcast (Host bits toàn 1)',
      description: `Host bits = ${hostBits} → Gửi tới TẤT CẢ thiết bị trong subnet. Dùng cho ARP request, DHCP discover.`,
      subnet,
      hostValue,
      highlightDevices: ['router', 'host1', 'host2', 'host3', 'host4'],
      packetColor: '#f59e0b',
      isSpecialAddress: false,
      specialLabel: 'BROADCAST',
    }
  }

  // Regular unicast host
  const devices = UNICAST_DEVICES
  const exactDevice = devices.find(d => d.ipNum === hostValue)
  const closestDevice = devices.reduce((prev, curr) =>
    Math.abs(curr.ipNum - hostValue) < Math.abs(prev.ipNum - hostValue) ? curr : prev
  )

  const targetDevice = exactDevice || closestDevice

  return {
    id: 'normal',
    title: `Host: .${hostValue}`,
    description: `Packet gửi tới ${subnet.prefix}.${hostValue} → thiết bị nhận. Host bits = ${hostBits}.`,
    subnet,
    hostValue,
    highlightDevices: [targetDevice.id],
    packetColor: subnet.classColor,
    isSpecialAddress: false,
  }
}

// Helper to get full IP from scene
function getFullIp(scene: Scene): string {
  return `${scene.subnet.prefix}.${scene.hostValue}`
}


export function HostBitsVisualizer({ className }: HostBitsVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [presetIdx, setPresetIdx] = useState(0)
  const [customHostValue, setCustomHostValue] = useState<number | null>(null)
  const [selectedSubnet, setSelectedSubnet] = useState<SubnetConfig>(SUBNET_CLASS_C)
  const [inputValue, setInputValue] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const animationRef = useRef<number | null>(null)

  // Generate current scene from preset or custom value
  const currentScene = useMemo(() => {
    if (customHostValue !== null) {
      return generateSceneFromHostValue(customHostValue, selectedSubnet)
    }
    return PRESET_SCENES[presetIdx]
  }, [presetIdx, customHostValue, selectedSubnet])

  // Computed values for display
  const fullIp = getFullIp(currentScene)

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    const svg = d3.select(svgRef.current)
    svg.selectAll('.packet').interrupt().remove()
    svg.selectAll('.ripple').interrupt().remove()
  }, [])

  const animatePacket = useCallback((scene: Scene) => {
    const svg = d3.select(svgRef.current)
    if (!svg.node()) return

    // Clear previous animations
    svg.selectAll('.packet').remove()
    svg.selectAll('.ripple').remove()

    const packetsLayer = svg.select('.packets-layer')
    const startX = WIDTH / 2
    const startY = 80

    // Create packet
    const packet = packetsLayer.append('g')
      .attr('class', 'packet')
      .attr('transform', `translate(${startX}, ${startY})`)

    packet.append('circle')
      .attr('r', PACKET_RADIUS)
      .attr('fill', scene.packetColor)
      .attr('filter', 'url(#glow)')

    packet.append('circle')
      .attr('r', PACKET_RADIUS / 3)
      .attr('fill', 'white')

    // Determine animation type based on hostValue
    const isNetworkAddress = scene.hostValue === 0
    const isBroadcastAddress = scene.hostValue === 255

    if (isNetworkAddress) {
      // Network address - packet goes to "network" label area then fades
      packet
        .transition()
        .duration(1500)
        .attr('transform', `translate(${startX}, ${DEVICE_Y - 60})`)
        .transition()
        .duration(500)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).remove()
          // Show "not assignable" indicator
          const indicator = packetsLayer.append('text')
            .attr('class', 'ripple')
            .attr('x', startX)
            .attr('y', DEVICE_Y - 60)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ef4444')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('✕ Không gán được')
            .style('opacity', 0)

          indicator
            .transition()
            .duration(300)
            .style('opacity', 1)
            .transition()
            .delay(2000)
            .duration(500)
            .style('opacity', 0)
            .remove()
        })
    } else if (isBroadcastAddress && !scene.subnet.isMulticast) {
      // Broadcast - packet splits to all devices (except broadcast icon itself)
      // Note: Multicast doesn't use broadcast concept
      const targetDevices = UNICAST_DEVICES.filter(d => d.id !== 'broadcast')

      packet
        .transition()
        .duration(800)
        .attr('transform', `translate(${startX}, ${DEVICE_Y - 80})`)
        .on('end', function() {
          d3.select(this).remove()

          // Create multiple packets going to each device
          targetDevices.forEach((device, idx) => {
            const subPacket = packetsLayer.append('g')
              .attr('class', 'packet')
              .attr('transform', `translate(${startX}, ${DEVICE_Y - 80})`)

            subPacket.append('circle')
              .attr('r', PACKET_RADIUS * 0.7)
              .attr('fill', scene.packetColor)
              .attr('filter', 'url(#glow)')

            subPacket
              .transition()
              .delay(idx * 50)
              .duration(600)
              .attr('transform', `translate(${device.x}, ${device.y - 30})`)
              .on('end', function() {
                // Ripple effect on device
                const ripple = packetsLayer.append('circle')
                  .attr('class', 'ripple')
                  .attr('cx', device.x)
                  .attr('cy', device.y)
                  .attr('r', 20)
                  .attr('fill', 'none')
                  .attr('stroke', scene.packetColor)
                  .attr('stroke-width', 2)
                  .style('opacity', 1)

                ripple
                  .transition()
                  .duration(600)
                  .attr('r', 40)
                  .style('opacity', 0)
                  .remove()

                d3.select(this).remove()
              })
          })
        })
    } else if (scene.subnet.isMulticast) {
      // Multicast - packet goes to all group members simultaneously
      const targetDevices = MULTICAST_DEVICES.filter(d => scene.highlightDevices.includes(d.id))
      if (targetDevices.length === 0) return

      packet
        .transition()
        .duration(800)
        .attr('transform', `translate(${startX}, ${DEVICE_Y - 80})`)
        .on('end', function() {
          d3.select(this).remove()

          // Send to all group members at once (multicast behavior)
          targetDevices.forEach((device, idx) => {
            const subPacket = packetsLayer.append('g')
              .attr('class', 'packet')
              .attr('transform', `translate(${startX}, ${DEVICE_Y - 80})`)

            subPacket.append('circle')
              .attr('r', PACKET_RADIUS * 0.7)
              .attr('fill', scene.packetColor)
              .attr('filter', 'url(#glow)')

            subPacket
              .transition()
              .delay(idx * 30)
              .duration(500)
              .attr('transform', `translate(${device.x}, ${device.y - 30})`)
              .on('end', function() {
                // Group join effect (different from ripple)
                const joinEffect = packetsLayer.append('circle')
                  .attr('class', 'ripple')
                  .attr('cx', device.x)
                  .attr('cy', device.y)
                  .attr('r', 15)
                  .attr('fill', scene.packetColor)
                  .attr('opacity', 0.3)

                joinEffect
                  .transition()
                  .duration(400)
                  .attr('r', 35)
                  .attr('opacity', 0)
                  .remove()

                d3.select(this).remove()
              })
          })
        })
    } else {
      // Normal unicast host - packet goes to single device
      const targetDevice = UNICAST_DEVICES.find(d => scene.highlightDevices.includes(d.id))
      if (!targetDevice) return

      packet
        .transition()
        .duration(1200)
        .attr('transform', `translate(${targetDevice.x}, ${targetDevice.y - 30})`)
        .on('end', function() {
          // Ripple effect
          const ripple = packetsLayer.append('circle')
            .attr('class', 'ripple')
            .attr('cx', targetDevice.x)
            .attr('cy', targetDevice.y)
            .attr('r', 20)
            .attr('fill', 'none')
            .attr('stroke', scene.packetColor)
            .attr('stroke-width', 3)
            .style('opacity', 1)

          ripple
            .transition()
            .duration(800)
            .attr('r', 50)
            .style('opacity', 0)
            .remove()

          d3.select(this)
            .transition()
            .delay(200)
            .duration(400)
            .style('opacity', 0)
            .remove()
        })
    }
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
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Background
    svg.append('rect')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('fill', 'transparent')

    // Devices layer
    const devicesLayer = svg.append('g').attr('class', 'devices-layer')

    // Subnet boundary box
    devicesLayer.append('rect')
      .attr('x', 60)
      .attr('y', DEVICE_Y - 50)
      .attr('width', 580)
      .attr('height', 100)
      .attr('rx', 8)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-dasharray', '4 4')

    devicesLayer.append('text')
      .attr('x', 350)
      .attr('y', DEVICE_Y + 65)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground subnet-label')
      .attr('font-size', '11px')
      .text('Subnet: 192.168.1.0/24')

    // Draw devices
    DEVICES.forEach(device => {
      const g = devicesLayer.append('g')
        .attr('class', `device device-${device.id}`)
        .attr('transform', `translate(${device.x}, ${device.y})`)

      // Device circle
      g.append('circle')
        .attr('r', 24)
        .attr('fill', 'currentColor')
        .attr('class', 'text-muted')
        .attr('opacity', 0.3)

      // Device icon (simple computer icon)
      if (device.id === 'router') {
        // Router icon (default - unicast)
        const routerGroup = g.append('g').attr('class', 'unicast-icon')
        routerGroup.append('rect')
          .attr('x', -12).attr('y', -8)
          .attr('width', 24).attr('height', 16).attr('rx', 2)
          .attr('fill', 'currentColor')
          .attr('class', 'text-foreground')
          .attr('opacity', 0.7)
        routerGroup.append('line')
          .attr('x1', -6).attr('y1', -8).attr('x2', -6).attr('y2', -14)
          .attr('stroke', 'currentColor').attr('stroke-width', 2)
          .attr('class', 'text-foreground').attr('opacity', 0.7)
        routerGroup.append('line')
          .attr('x1', 6).attr('y1', -8).attr('x2', 6).attr('y2', -14)
          .attr('stroke', 'currentColor').attr('stroke-width', 2)
          .attr('class', 'text-foreground').attr('opacity', 0.7)

        // Globe icon (public mode) - ISP Gateway
        const globeGroup = g.append('g').attr('class', 'public-icon').style('opacity', 0)
        globeGroup.append('circle')
          .attr('r', 10).attr('fill', 'none')
          .attr('stroke', 'currentColor').attr('stroke-width', 1.5)
          .attr('class', 'text-foreground').attr('opacity', 0.8)
        globeGroup.append('ellipse')
          .attr('rx', 4).attr('ry', 10).attr('fill', 'none')
          .attr('stroke', 'currentColor').attr('stroke-width', 1)
          .attr('class', 'text-foreground').attr('opacity', 0.6)
        globeGroup.append('line')
          .attr('x1', -10).attr('y1', 0).attr('x2', 10).attr('y2', 0)
          .attr('stroke', 'currentColor').attr('stroke-width', 1)
          .attr('class', 'text-foreground').attr('opacity', 0.6)

        // Multicast: Broadcast tower icon
        const mcastRouter = g.append('g').attr('class', 'multicast-icon').style('opacity', 0)
        mcastRouter.append('rect')
          .attr('x', -3).attr('y', -2).attr('width', 6).attr('height', 14).attr('rx', 1)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
        mcastRouter.append('line')
          .attr('x1', 0).attr('y1', -2).attr('x2', 0).attr('y2', -10)
          .attr('stroke', 'currentColor').attr('stroke-width', 2)
          .attr('class', 'text-foreground').attr('opacity', 0.8)
        // Signal waves
        mcastRouter.append('path')
          .attr('d', 'M-6,-6 Q-8,-10 -4,-14')
          .attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-width', 1.5)
          .attr('class', 'text-foreground').attr('opacity', 0.6)
        mcastRouter.append('path')
          .attr('d', 'M6,-6 Q8,-10 4,-14')
          .attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-width', 1.5)
          .attr('class', 'text-foreground').attr('opacity', 0.6)

      } else if (device.id === 'broadcast') {
        // Broadcast icon (speaker/megaphone) - unicast mode
        g.append('path')
          .attr('d', 'M-8,-8 L-8,8 L-2,8 L8,14 L8,-14 L-2,-8 Z')
          .attr('fill', 'currentColor')
          .attr('class', 'text-foreground broadcast-icon')
          .attr('opacity', 0.7)

        // Internet globe icon (public mode)
        const inetGroup = g.append('g').attr('class', 'public-icon').style('opacity', 0)
        inetGroup.append('circle')
          .attr('r', 11).attr('fill', 'none')
          .attr('stroke', 'currentColor').attr('stroke-width', 2)
          .attr('class', 'text-foreground').attr('opacity', 0.8)
        inetGroup.append('ellipse')
          .attr('rx', 5).attr('ry', 11).attr('fill', 'none')
          .attr('stroke', 'currentColor').attr('stroke-width', 1.5)
          .attr('class', 'text-foreground').attr('opacity', 0.7)
        inetGroup.append('line')
          .attr('x1', -11).attr('y1', 0).attr('x2', 11).attr('y2', 0)
          .attr('stroke', 'currentColor').attr('stroke-width', 1.5)
          .attr('class', 'text-foreground').attr('opacity', 0.7)
        inetGroup.append('line')
          .attr('x1', 0).attr('y1', -11).attr('x2', 0).attr('y2', 11)
          .attr('stroke', 'currentColor').attr('stroke-width', 1)
          .attr('class', 'text-foreground').attr('opacity', 0.5)

        // Multicast: Group/Network icon
        const mcastBroadcast = g.append('g').attr('class', 'multicast-icon').style('opacity', 0)
        // Three connected circles representing multicast group
        mcastBroadcast.append('circle').attr('cx', 0).attr('cy', -6).attr('r', 5)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
        mcastBroadcast.append('circle').attr('cx', -7).attr('cy', 6).attr('r', 4)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.6)
        mcastBroadcast.append('circle').attr('cx', 7).attr('cy', 6).attr('r', 4)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.6)
        // Connection lines
        mcastBroadcast.append('line').attr('x1', 0).attr('y1', -1).attr('x2', -5).attr('y2', 3)
          .attr('stroke', 'currentColor').attr('stroke-width', 1.5).attr('class', 'text-foreground').attr('opacity', 0.5)
        mcastBroadcast.append('line').attr('x1', 0).attr('y1', -1).attr('x2', 5).attr('y2', 3)
          .attr('stroke', 'currentColor').attr('stroke-width', 1.5).attr('class', 'text-foreground').attr('opacity', 0.5)

      } else {
        // Computer icon (unicast mode)
        const compGroup = g.append('g').attr('class', 'unicast-icon')
        compGroup.append('rect')
          .attr('x', -10).attr('y', -10)
          .attr('width', 20).attr('height', 14).attr('rx', 2)
          .attr('fill', 'currentColor')
          .attr('class', 'text-foreground').attr('opacity', 0.7)
        compGroup.append('rect')
          .attr('x', -6).attr('y', 6)
          .attr('width', 12).attr('height', 4)
          .attr('fill', 'currentColor')
          .attr('class', 'text-foreground').attr('opacity', 0.5)

        // Public network icons based on device ID
        const pubGroup = g.append('g').attr('class', 'public-icon').style('opacity', 0)
        if (device.id === 'host1') {
          // DNS Server - Shield with lock
          pubGroup.append('path')
            .attr('d', 'M0,-12 L8,-8 L8,4 C8,10 0,14 0,14 C0,14 -8,10 -8,4 L-8,-8 Z')
            .attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-width', 1.5)
            .attr('class', 'text-foreground').attr('opacity', 0.8)
          pubGroup.append('circle')
            .attr('cy', 0).attr('r', 3)
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
        } else if (device.id === 'host2') {
          // Web Server - Server rack
          pubGroup.append('rect')
            .attr('x', -8).attr('y', -10).attr('width', 16).attr('height', 6).attr('rx', 1)
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
          pubGroup.append('rect')
            .attr('x', -8).attr('y', -2).attr('width', 16).attr('height', 6).attr('rx', 1)
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.6)
          pubGroup.append('rect')
            .attr('x', -8).attr('y', 6).attr('width', 16).attr('height', 6).attr('rx', 1)
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.5)
          pubGroup.append('circle').attr('cx', 5).attr('cy', -7).attr('r', 1.5)
            .attr('fill', '#22c55e')
        } else if (device.id === 'host3') {
          // Cloud VM - Cloud shape
          pubGroup.append('path')
            .attr('d', 'M-10,4 C-12,4 -14,2 -14,-1 C-14,-4 -12,-6 -9,-6 C-8,-10 -4,-12 0,-12 C5,-12 9,-9 10,-5 C13,-4 14,-1 14,2 C14,5 12,6 9,6 L-10,6 Z')
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
        } else if (device.id === 'host4') {
          // CDN Edge - Lightning bolt
          pubGroup.append('path')
            .attr('d', 'M2,-12 L-6,2 L0,2 L-2,12 L8,-2 L2,-2 Z')
            .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.8)
        }

        // Multicast icons - Group/People representation
        const mcastGroup = g.append('g').attr('class', 'multicast-icon').style('opacity', 0)
        // Two people icon representing group membership
        // Person 1 (front)
        mcastGroup.append('circle').attr('cx', 0).attr('cy', -6).attr('r', 5)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.8)
        mcastGroup.append('path')
          .attr('d', 'M-6,12 C-6,4 -4,2 0,2 C4,2 6,4 6,12')
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.7)
        // Person 2 (back-left)
        mcastGroup.append('circle').attr('cx', -8).attr('cy', -4).attr('r', 3.5)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.5)
        // Person 3 (back-right)
        mcastGroup.append('circle').attr('cx', 8).attr('cy', -4).attr('r', 3.5)
          .attr('fill', 'currentColor').attr('class', 'text-foreground').attr('opacity', 0.5)
      }

      // Device label only (no IP numbers to avoid confusion)
      g.append('text')
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-muted-foreground device-label')
        .attr('font-size', '10px')
        .text(device.label)
    })

    // Packets layer (on top)
    svg.append('g').attr('class', 'packets-layer')

  }, [])

  // Get current device set based on multicast/unicast
  const currentDevices = useMemo(() => {
    if (currentScene.subnet.isMulticast) return MULTICAST_DEVICES
    if (currentScene.subnet.isPublic) return PUBLIC_DEVICES
    return UNICAST_DEVICES
  }, [currentScene.subnet.isMulticast, currentScene.subnet.isPublic])

  // Update device highlights, labels and subnet label based on scene
  useEffect(() => {
    const svg = d3.select(svgRef.current)

    // Update subnet label based on network type
    let subnetText: string
    if (currentScene.subnet.isMulticast) {
      subnetText = `Multicast Groups (${currentScene.subnet.prefix}.x)`
    } else if (currentScene.subnet.isPublic) {
      subnetText = `🌐 Public Internet (${currentScene.subnet.prefix}.x)`
    } else {
      subnetText = `Subnet: ${currentScene.subnet.prefix}.0/${currentScene.subnet.cidr} (Class ${currentScene.subnet.class})`
    }
    svg.select('.subnet-label').text(subnetText)

    // Update device labels and highlights
    currentDevices.forEach(device => {
      const isHighlighted = currentScene.highlightDevices.includes(device.id)
      const deviceGroup = svg.select(`.device-${device.id}`)

      // Update highlight
      deviceGroup
        .select('circle')
        .transition()
        .duration(300)
        .attr('opacity', isHighlighted ? 0.6 : 0.3)
        .attr('stroke', isHighlighted ? currentScene.packetColor : 'none')
        .attr('stroke-width', isHighlighted ? 3 : 0)

      // Update label text
      deviceGroup.select('.device-label').text(device.label)

      // Update icon visibility based on network type
      if (currentScene.subnet.isMulticast) {
        // Multicast: show multicast SVG icons
        deviceGroup.select('.unicast-icon').style('opacity', 0)
        deviceGroup.select('.public-icon').style('opacity', 0)
        deviceGroup.select('.multicast-icon').style('opacity', 1)
        deviceGroup.select('.broadcast-icon').style('opacity', 0)
      } else if (currentScene.subnet.isPublic) {
        // Public: show public SVG icons
        deviceGroup.select('.unicast-icon').style('opacity', 0)
        deviceGroup.select('.public-icon').style('opacity', 1)
        deviceGroup.select('.multicast-icon').style('opacity', 0)
        deviceGroup.select('.broadcast-icon').style('opacity', 0)
      } else {
        // Unicast: show default icons
        deviceGroup.select('.unicast-icon').style('opacity', 1)
        deviceGroup.select('.public-icon').style('opacity', 0)
        deviceGroup.select('.multicast-icon').style('opacity', 0)
        deviceGroup.select('.broadcast-icon').style('opacity', 0.7)
      }
    })
  }, [currentScene, currentDevices])

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      animatePacket(currentScene)
      const timeout = setTimeout(() => {
        setIsPlaying(false)
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [isPlaying, currentScene, animatePacket])

  const handlePlay = () => {
    stopAnimation()
    setIsPlaying(true)
  }

  const handlePrev = () => {
    stopAnimation()
    setIsPlaying(false)
    setCustomHostValue(null)
    setInputValue('')
    const newIdx = (presetIdx - 1 + PRESET_SCENES.length) % PRESET_SCENES.length
    setPresetIdx(newIdx)
    setSelectedSubnet(PRESET_SCENES[newIdx].subnet)
  }

  const handleNext = () => {
    stopAnimation()
    setIsPlaying(false)
    setCustomHostValue(null)
    setInputValue('')
    const newIdx = (presetIdx + 1) % PRESET_SCENES.length
    setPresetIdx(newIdx)
    setSelectedSubnet(PRESET_SCENES[newIdx].subnet)
  }

  const handleReset = () => {
    stopAnimation()
    setIsPlaying(false)
    setCustomHostValue(null)
    setInputValue('')
    setPresetIdx(0)
    setSelectedSubnet(PRESET_SCENES[0].subnet)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0 && num <= 255) {
      setCustomHostValue(num)
    } else if (value === '') {
      setCustomHostValue(null)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePlay()
    }
  }

  // Generate binary octets for display
  const binaryOctets = useMemo(() => {
    const parts = currentScene.subnet.prefix.split('.').map(Number)
    parts.push(currentScene.hostValue)
    return parts.map(n => n.toString(2).padStart(8, '0'))
  }, [currentScene])

  const networkBits = currentScene.subnet.cidr
  const hostBitsCount = 32 - networkBits

  return (
    <div className={cn('space-y-4', className)}>
      {/* IP Address Display with Binary */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{
                backgroundColor: `${currentScene.subnet.classColor}20`,
                color: currentScene.subnet.classColor,
              }}
            >
              CLASS {currentScene.subnet.class}
            </span>
            <span className="font-mono text-lg font-bold" style={{ color: currentScene.packetColor }}>
              {fullIp}
            </span>
            {currentScene.specialLabel && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${currentScene.packetColor}20`,
                  color: currentScene.packetColor,
                }}
              >
                {currentScene.specialLabel}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            /{currentScene.subnet.cidr} subnet
          </div>
        </div>

        {/* Binary representation */}
        <div className="flex justify-center items-center font-mono text-sm overflow-x-auto">
          <div className="flex gap-0.5">
            {binaryOctets.map((octet, octetIdx) => {
              const octetStartBit = octetIdx * 8
              return (
                <span key={octetIdx} className="flex">
                  {octet.split('').map((bit, bitIdx) => {
                    const globalBitIdx = octetStartBit + bitIdx
                    const isNetworkBit = globalBitIdx < networkBits
                    return (
                      <span
                        key={bitIdx}
                        className={cn(
                          'w-2.5 h-5 flex items-center justify-center text-xs',
                          isNetworkBit ? 'text-emerald-500' : 'text-amber-500'
                        )}
                        style={!isNetworkBit ? {
                          backgroundColor: `${currentScene.packetColor}20`,
                          borderRadius: bitIdx === 0 ? '2px 0 0 2px' : bitIdx === 7 ? '0 2px 2px 0' : '0',
                        } : undefined}
                      >
                        {bit}
                      </span>
                    )
                  })}
                  {octetIdx < 3 && <span className="mx-0.5 text-muted-foreground">.</span>}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="inline-block w-3 h-3 rounded bg-emerald-500/30 mr-1" />
            Network ({networkBits} bits)
          </span>
          <span>
            <span
              className="inline-block w-3 h-3 rounded mr-1"
              style={{ backgroundColor: `${currentScene.packetColor}30` }}
            />
            Host ({hostBitsCount} bits)
          </span>
        </div>
      </div>

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

      {/* Custom IP Input */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        {/* Class Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { subnet: SUBNET_CLASS_A, label: 'Class A', defaultDesc: '10.x.x.x' },
            { subnet: SUBNET_CLASS_B, label: 'Class B', defaultDesc: '172.16.x.x' },
            { subnet: SUBNET_CLASS_C, label: 'Class C', defaultDesc: '192.168.1.x' },
            { subnet: SUBNET_CLASS_D, label: 'Class D', defaultDesc: 'Multicast' },
          ].map(({ subnet, label, defaultDesc }) => {
            const isSelected = selectedSubnet.class === subnet.class
            const displayDesc = isSelected ? `${selectedSubnet.prefix}.x` : defaultDesc
            return (
              <button
                key={subnet.class}
                onClick={() => {
                  setSelectedSubnet(subnet)
                  setCustomHostValue(1)
                  setInputValue('1')
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2',
                  !isSelected && 'bg-muted hover:bg-muted/80 border-transparent'
                )}
                style={isSelected ? {
                  backgroundColor: `${selectedSubnet.classColor}20`,
                  color: selectedSubnet.classColor,
                  borderColor: selectedSubnet.classColor,
                } : undefined}
              >
                {label}
                <span className="block text-xs opacity-70 font-mono">{displayDesc}</span>
              </button>
            )
          })}
        </div>

        {/* IP Input */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-sm px-2 py-1 rounded"
              style={{ backgroundColor: `${selectedSubnet.classColor}20`, color: selectedSubnet.classColor }}
            >
              {selectedSubnet.prefix}.
            </span>
            <Input
              type="number"
              min={0}
              max={255}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="0-255"
              className="w-20 font-mono"
            />
            <Button size="sm" onClick={handlePlay} disabled={isPlaying}>
              <Play className="w-4 h-4 mr-1" />
              Play
            </Button>
          </div>
        </div>

        {/* Quick Values - different for Multicast vs Unicast */}
        <div className="flex flex-wrap justify-center gap-1">
          {(selectedSubnet.isMulticast ? [
            { v: '1', l: 'All Hosts' },
            { v: '2', l: 'All Routers' },
            { v: '5', l: 'OSPF' },
            { v: '6', l: 'OSPF DR' },
            { v: '9', l: 'RIPv2' },
            { v: '101', l: 'IPTV' },
          ] : [
            { v: '0', l: 'Network' },
            { v: '1', l: 'Gateway' },
            { v: '100', l: 'Host' },
            { v: '128', l: 'Boundary' },
            { v: '254', l: 'Last' },
            { v: '255', l: 'Broadcast' },
          ]).map(({ v, l }) => (
            <button
              key={v}
              onClick={() => handleInputChange(v)}
              className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              .{v} <span className="text-muted-foreground">({l})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset} title="Reset">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrev} title="Preset trước">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {customHostValue !== null ? 'Custom' : `Preset ${presetIdx + 1}/${PRESET_SCENES.length}`}
        </span>
        <Button size="sm" variant="outline" onClick={handleNext} title="Preset sau">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
