/**
 * Frame mapper for TCP/IP Packet Journey lab.
 * Phase 03: Hardcoded frames (RED TEAM #10 — no heuristics).
 *
 * Each frame maps 1:1 to walkthrough step index.
 * Device positions: client(0) → dnsServer(1) → router(2) → server(3)
 */

export type DeviceId = 'client' | 'dnsServer' | 'router' | 'server'
export type LayerId = 1 | 2 | 3 | 4

export interface PacketPosition {
  device: DeviceId
  layer: LayerId
}

export interface Frame {
  stepIdx: number
  narration: { what: string; why: string }
  packetPath: PacketPosition[]
  highlight?: { protocol?: string; device?: DeviceId }
  isNarrationOnly?: boolean
  // true = ARP-style broadcast: client gửi ra toàn LAN, vẽ nhiều mũi tên toả
  isBroadcast?: boolean
}

// Hardcoded frames for tcp-ip-packet-journey walkthrough (8 steps)
export const TCP_IP_FRAMES: Frame[] = [
  {
    stepIdx: 0,
    narration: {
      what: 'DNS Query: Client hỏi IP của example.com',
      why: 'Application layer gửi request xuống Transport → Internet → Link để ra ngoài',
    },
    packetPath: [
      { device: 'client', layer: 4 },
      { device: 'client', layer: 3 },
      { device: 'client', layer: 2 },
      { device: 'client', layer: 1 },
      { device: 'dnsServer', layer: 1 },
    ],
    highlight: { protocol: 'DNS', device: 'dnsServer' },
  },
  {
    stepIdx: 1,
    narration: {
      what: 'DNS Response: DNS Server trả về IP',
      why: 'Packet đi ngược từ Link → Internet → Transport → Application',
    },
    packetPath: [
      { device: 'dnsServer', layer: 1 },
      { device: 'client', layer: 1 },
      { device: 'client', layer: 2 },
      { device: 'client', layer: 3 },
      { device: 'client', layer: 4 },
    ],
    highlight: { protocol: 'DNS', device: 'client' },
  },
  {
    stepIdx: 2,
    narration: {
      what: 'ARP Request: Client broadcast "Ai giữ IP của Router?"',
      why: 'Broadcast L2 tới TOÀN LAN (MAC đích = FF:FF:FF:FF:FF:FF). Client chưa biết ai là Router nên phải hỏi tất cả. Chỉ thiết bị có IP khớp mới trả lời.',
    },
    packetPath: [
      { device: 'client', layer: 2 },
      { device: 'client', layer: 1 },
      { device: 'router', layer: 1 },
    ],
    highlight: { protocol: 'ARP', device: 'router' },
    isBroadcast: true,
  },
  {
    stepIdx: 3,
    narration: {
      what: 'ARP Reply: Router unicast MAC của CHÍNH NÓ về Client',
      why: 'Đây là MAC của Router (gateway), KHÔNG phải MAC của Server. Server ở ngoài LAN — Client không bao giờ biết MAC Server. Frame L2 chỉ đi được 1 hop, next-hop luôn là Router.',
    },
    packetPath: [
      { device: 'router', layer: 1 },
      { device: 'client', layer: 1 },
      { device: 'client', layer: 2 },
    ],
    highlight: { protocol: 'ARP', device: 'client' },
  },
  {
    stepIdx: 4,
    narration: {
      what: 'ICMP Echo Request: Client ping Server qua Router',
      why: 'Packet đi L4→L1, qua router (L1→L2→L1), tới server (L1→L4)',
    },
    packetPath: [
      { device: 'client', layer: 4 },
      { device: 'client', layer: 1 },
      { device: 'router', layer: 1 },
      { device: 'router', layer: 2 },
      { device: 'router', layer: 1 },
      { device: 'server', layer: 1 },
      { device: 'server', layer: 4 },
    ],
    highlight: { protocol: 'ICMP', device: 'server' },
  },
  {
    stepIdx: 5,
    narration: {
      what: 'ICMP Echo Reply: Server phản hồi ping',
      why: 'Đường ngược lại: server → router → client',
    },
    packetPath: [
      { device: 'server', layer: 4 },
      { device: 'server', layer: 1 },
      { device: 'router', layer: 1 },
      { device: 'router', layer: 2 },
      { device: 'router', layer: 1 },
      { device: 'client', layer: 1 },
      { device: 'client', layer: 4 },
    ],
    highlight: { protocol: 'ICMP', device: 'client' },
  },
  {
    stepIdx: 6,
    narration: {
      what: 'Routing Decision: Router xem bảng định tuyến',
      why: 'Internet layer quyết định next hop dựa trên destination IP',
    },
    packetPath: [{ device: 'router', layer: 2 }],
    highlight: { protocol: 'IP', device: 'router' },
  },
  {
    stepIdx: 7,
    narration: {
      what: 'So sánh: ping thành công vs ping fail',
      why: 'Hiểu layer nào fail giúp debug đúng hướng',
    },
    packetPath: [],
    isNarrationOnly: true,
  },
]
