/**
 * DHCP Case A — Manual TRƯỚC: server ICMP ping-check abandons IP.
 *
 * Scenario: Client2 đặt static .200. Pool DHCP lab có range .200-.201.
 * Server thử cấp .200 (đầu pool) → ping-check ICMP → Client2 reply → abandon.
 * Server thử .201 → ping-check (không reply) → OFFER .201 cho Client1.
 *
 * 6 packets simulate the educational flow:
 *  0. DHCPDISCOVER from Client1 (broadcast)
 *  1. ICMP echo request from server → .200 (probe)
 *  2. ICMP echo reply from Client2 (static .200) → server   ← abandon trigger
 *  3. DHCPOFFER from server → Client1 with .201 (NOT .200)  ← key teaching moment
 *  4. DHCPREQUEST from Client1
 *  5. DHCPACK from server
 *
 * MAC/IP từ session lab thực tế (re-capture 2026-05-24):
 *   Server  192.168.81.128  00:0c:29:ba:58:e7
 *   Client1 (DHCP)          00:0c:29:c4:f1:be → nhận .201
 *   Client2 (static .200)   00:0c:29:4c:8b:da
 */

import type { DecodedPacket } from '../packet-types'

// MAC bytes
const MAC_SERVER = [0x00, 0x0c, 0x29, 0xba, 0x58, 0xe7]
const MAC_CLIENT1 = [0x00, 0x0c, 0x29, 0xc4, 0xf1, 0xbe]
const MAC_CLIENT2 = [0x00, 0x0c, 0x29, 0x4c, 0x8b, 0xda]
const MAC_BCAST = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]

// IP bytes
const IP_ZERO = [0, 0, 0, 0]
const IP_BCAST = [255, 255, 255, 255]
const IP_SERVER = [192, 168, 81, 128]
const IP_200 = [192, 168, 81, 200]
const IP_201 = [192, 168, 81, 201]

const macFmt = (m: number[]) =>
  m.map((b) => b.toString(16).padStart(2, '0')).join(':')
const ipFmt = (ip: number[]) => ip.join('.')

// ---------------------------------------------------------------------------
// Byte builders
// ---------------------------------------------------------------------------

function writeMacIPv4(
  buf: Uint8Array,
  srcMac: number[],
  dstMac: number[],
  protocol: number,
  totalLen: number,
  srcIP: number[],
  dstIP: number[],
) {
  // Ethernet header
  dstMac.forEach((b, i) => (buf[i] = b))
  srcMac.forEach((b, i) => (buf[6 + i] = b))
  buf[12] = 0x08
  buf[13] = 0x00
  // IPv4 header (offset 14)
  buf[14] = 0x45 // version 4, IHL 5
  buf[15] = 0x00
  buf[16] = (totalLen >> 8) & 0xff
  buf[17] = totalLen & 0xff
  buf[18] = 0x12
  buf[19] = 0x34
  buf[20] = 0x00
  buf[21] = 0x00
  buf[22] = 64 // TTL
  buf[23] = protocol
  buf[24] = 0x00 // checksum
  buf[25] = 0x00
  srcIP.forEach((b, i) => (buf[26 + i] = b))
  dstIP.forEach((b, i) => (buf[30 + i] = b))
}

function buildDhcpPacket(
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  srcPort: number,
  dstPort: number,
  dhcpMsgType: number,
  yiaddr: number[],
  clientMac: number[],
  serverIdentifier: number[] | null,
): Uint8Array {
  // Ethernet 14 + IPv4 20 + UDP 8 + BOOTP fixed 240 + magic cookie+Option 53 (7) + Option 54 (6) + End (1) = 296 bytes
  const total = 14 + 20 + 8 + 250
  const buf = new Uint8Array(total)
  const ipTotalLen = total - 14
  writeMacIPv4(buf, srcMac, dstMac, 0x11 /* UDP */, ipTotalLen, srcIP, dstIP)

  // UDP header @ 34
  buf[34] = (srcPort >> 8) & 0xff
  buf[35] = srcPort & 0xff
  buf[36] = (dstPort >> 8) & 0xff
  buf[37] = dstPort & 0xff
  buf[38] = ((total - 34) >> 8) & 0xff
  buf[39] = (total - 34) & 0xff
  buf[40] = 0x00 // checksum
  buf[41] = 0x00

  // BOOTP/DHCP @ 42
  const bs = 42
  buf[bs + 0] = dhcpMsgType === 1 || dhcpMsgType === 3 ? 0x01 : 0x02 // op
  buf[bs + 1] = 0x01 // htype Ethernet
  buf[bs + 2] = 0x06 // hlen
  buf[bs + 3] = 0x00 // hops
  buf[bs + 4] = 0x39
  buf[bs + 5] = 0x03
  buf[bs + 6] = 0xf3
  buf[bs + 7] = 0x26 // xid
  buf[bs + 8] = 0x00
  buf[bs + 9] = 0x00 // secs
  buf[bs + 10] = 0x00
  buf[bs + 11] = 0x00 // flags
  // ciaddr (12-15) = 0
  // yiaddr (16-19)
  yiaddr.forEach((b, i) => (buf[bs + 16 + i] = b))
  // siaddr (20-23) = server IP for OFFER/ACK
  if (dhcpMsgType === 2 || dhcpMsgType === 5) {
    IP_SERVER.forEach((b, i) => (buf[bs + 20 + i] = b))
  }
  // chaddr (28-43, 16 bytes; first 6 = MAC)
  clientMac.forEach((b, i) => (buf[bs + 28 + i] = b))
  // Magic cookie @ bs+236
  buf[bs + 236] = 0x63
  buf[bs + 237] = 0x82
  buf[bs + 238] = 0x53
  buf[bs + 239] = 0x63
  // Option 53 — DHCP Message Type
  buf[bs + 240] = 53
  buf[bs + 241] = 1
  buf[bs + 242] = dhcpMsgType
  // Option 54 (Server Identifier) for OFFER/REQUEST/ACK
  if (serverIdentifier) {
    buf[bs + 243] = 54
    buf[bs + 244] = 4
    serverIdentifier.forEach((b, i) => (buf[bs + 245 + i] = b))
    // End option
    buf[bs + 249] = 0xff
  } else {
    buf[bs + 243] = 0xff
  }

  return buf
}

function buildIcmpPacket(
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  icmpType: number, // 8 = request, 0 = reply
): Uint8Array {
  const total = 14 + 20 + 8 + 16
  const buf = new Uint8Array(total)
  writeMacIPv4(buf, srcMac, dstMac, 0x01 /* ICMP */, total - 14, srcIP, dstIP)
  // ICMP header @ 34
  buf[34] = icmpType
  buf[35] = 0x00
  buf[36] = 0x00
  buf[37] = 0x00
  buf[38] = 0xd4
  buf[39] = 0x8d // identifier (0xd48d for variety vs icmp-ping sample)
  buf[40] = 0x00
  buf[41] = 0x00 // sequence 0
  // 16 bytes payload (just bytes for hex view)
  for (let i = 0; i < 16; i++) buf[42 + i] = 0x61 + (i % 16)
  return buf
}

// ---------------------------------------------------------------------------
// Decoded layer builders
// ---------------------------------------------------------------------------

function ethLayer(srcMac: number[], dstMac: number[], etherType = '0x0800 (IPv4)') {
  return {
    name: 'Ethernet',
    fields: [
      { name: 'Dst MAC', value: macFmt(dstMac), byteOffset: 0, byteLength: 6 },
      { name: 'Src MAC', value: macFmt(srcMac), byteOffset: 6, byteLength: 6 },
      { name: 'EtherType', value: etherType, byteOffset: 12, byteLength: 2 },
    ],
  }
}

function ipv4Layer(
  srcIP: number[],
  dstIP: number[],
  totalLen: number,
  protoLabel: string,
) {
  return {
    name: 'IPv4',
    fields: [
      { name: 'Version+IHL', value: '0x45', byteOffset: 14, byteLength: 1 },
      { name: 'Total Length', value: String(totalLen), byteOffset: 16, byteLength: 2 },
      { name: 'TTL', value: '64', byteOffset: 22, byteLength: 1 },
      { name: 'Protocol', value: protoLabel, byteOffset: 23, byteLength: 1 },
      { name: 'Source IP', value: ipFmt(srcIP), byteOffset: 26, byteLength: 4 },
      { name: 'Destination IP', value: ipFmt(dstIP), byteOffset: 30, byteLength: 4 },
    ],
  }
}

function udpLayer(srcPort: number, dstPort: number, len: number) {
  return {
    name: 'UDP',
    fields: [
      { name: 'Source Port', value: String(srcPort), byteOffset: 34, byteLength: 2 },
      { name: 'Destination Port', value: String(dstPort), byteOffset: 36, byteLength: 2 },
      { name: 'Length', value: String(len), byteOffset: 38, byteLength: 2 },
      { name: 'Checksum', value: '0x0000', byteOffset: 40, byteLength: 2 },
    ],
  }
}

function dhcpLayer(
  msgTypeLabel: string,
  msgTypeNum: number,
  yiaddr: number[],
  clientMac: number[],
  serverIdentifier: number[] | null,
) {
  const bs = 42
  const fields = [
    { name: 'op (Message op code)', value: msgTypeNum === 1 || msgTypeNum === 3 ? '1 (BOOTREQUEST)' : '2 (BOOTREPLY)', byteOffset: bs, byteLength: 1 },
    { name: 'htype', value: '1 (Ethernet)', byteOffset: bs + 1, byteLength: 1 },
    { name: 'hlen', value: '6', byteOffset: bs + 2, byteLength: 1 },
    { name: 'xid (Transaction ID)', value: '0x3903f326', byteOffset: bs + 4, byteLength: 4 },
    { name: 'yiaddr (Your IP)', value: ipFmt(yiaddr), byteOffset: bs + 16, byteLength: 4 },
    { name: 'chaddr (Client MAC)', value: macFmt(clientMac), byteOffset: bs + 28, byteLength: 6 },
    { name: 'Magic cookie', value: '0x63825363 (DHCP)', byteOffset: bs + 236, byteLength: 4 },
    { name: 'Option 53 — DHCP Message Type', value: `${msgTypeNum} (${msgTypeLabel})`, byteOffset: bs + 240, byteLength: 3 },
  ]
  if (serverIdentifier) {
    fields.push({
      name: 'Option 54 — Server Identifier',
      value: ipFmt(serverIdentifier),
      byteOffset: bs + 243,
      byteLength: 6,
    })
  }
  return { name: 'DHCP/BOOTP', fields }
}

function icmpLayer(typeNum: number) {
  return {
    name: 'ICMP',
    fields: [
      { name: 'Type', value: typeNum === 8 ? '8 (Echo Request)' : '0 (Echo Reply)', byteOffset: 34, byteLength: 1 },
      { name: 'Code', value: '0', byteOffset: 35, byteLength: 1 },
      { name: 'Checksum', value: '0x0000', byteOffset: 36, byteLength: 2 },
      { name: 'Identifier', value: '0xd48d', byteOffset: 38, byteLength: 2 },
      { name: 'Sequence', value: '0', byteOffset: 40, byteLength: 2 },
      { name: 'Data', value: '16 bytes ASCII', byteOffset: 42, byteLength: 16 },
    ],
  }
}

// ---------------------------------------------------------------------------
// Exported capture
// ---------------------------------------------------------------------------

function pkDhcp(
  index: number,
  ts: string,
  msgType: number,
  msgLabel: string,
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  srcPort: number,
  dstPort: number,
  yiaddr: number[],
  clientMac: number[],
  serverIdentifier: number[] | null,
  narrative: string,
) {
  const raw = buildDhcpPacket(srcMac, dstMac, srcIP, dstIP, srcPort, dstPort, msgType, yiaddr, clientMac, serverIdentifier)
  return {
    index,
    timestamp: ts,
    summary: `${ts} ${ipFmt(srcIP)}.${srcPort} > ${ipFmt(dstIP)}.${dstPort}: BOOTP/DHCP ${msgLabel}, ${narrative}`,
    rawBytes: raw,
    layers: [
      ethLayer(srcMac, dstMac),
      ipv4Layer(srcIP, dstIP, raw.length - 14, '17 (UDP)'),
      udpLayer(srcPort, dstPort, raw.length - 34),
      dhcpLayer(msgLabel, msgType, yiaddr, clientMac, serverIdentifier),
    ],
  }
}

function pkIcmp(
  index: number,
  ts: string,
  icmpType: number,
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  narrative: string,
) {
  const raw = buildIcmpPacket(srcMac, dstMac, srcIP, dstIP, icmpType)
  return {
    index,
    timestamp: ts,
    summary: `${ts} ${ipFmt(srcIP)} > ${ipFmt(dstIP)}: ICMP ${icmpType === 8 ? 'echo request' : 'echo reply'}${narrative ? ` — ${narrative}` : ''}`,
    rawBytes: raw,
    layers: [
      ethLayer(srcMac, dstMac),
      ipv4Layer(srcIP, dstIP, raw.length - 14, '1 (ICMP)'),
      icmpLayer(icmpType),
    ],
  }
}

export const dhcpCaseACapture: DecodedPacket[] = [
  pkDhcp(0, '04:53:04.001', 1, 'Discover', MAC_CLIENT1, MAC_BCAST, IP_ZERO, IP_BCAST, 68, 67, IP_ZERO, MAC_CLIENT1, null, 'Client1 broadcast, chưa có IP'),
  pkIcmp(1, '04:53:04.050', 8, MAC_SERVER, MAC_BCAST, IP_SERVER, IP_200, 'server probe .200 trước OFFER (ping-check)'),
  pkIcmp(2, '04:53:04.051', 0, MAC_CLIENT2, MAC_SERVER, IP_200, IP_SERVER, 'Client2 (static .200) reply — server thấy có máy đang dùng'),
  pkDhcp(3, '04:53:08.002', 2, 'Offer', MAC_SERVER, MAC_CLIENT1, IP_SERVER, IP_BCAST, 67, 68, IP_201, MAC_CLIENT1, IP_SERVER, 'server đã abandon .200, OFFER .201'),
  pkDhcp(4, '04:53:08.020', 3, 'Request', MAC_CLIENT1, MAC_BCAST, IP_ZERO, IP_BCAST, 68, 67, IP_201, MAC_CLIENT1, IP_SERVER, 'Client1 broadcast Request, Server Identifier = .128'),
  pkDhcp(5, '04:53:08.045', 5, 'ACK', MAC_SERVER, MAC_CLIENT1, IP_SERVER, IP_BCAST, 67, 68, IP_201, MAC_CLIENT1, IP_SERVER, 'lease .201 chính thức cấp'),
]
