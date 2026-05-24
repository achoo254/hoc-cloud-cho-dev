/**
 * DHCP Case B — Manual SAU: ARP cache flap (2 MAC cùng IP).
 *
 * Scenario: Client1 đã có lease DHCP .201 (qua DHCPACK trước đó).
 * Client2 đặt static .201 (trùng IP Client1).
 * Server arping .201 → CẢ 2 MAC đều reply → cache flap → traffic intermittent.
 *
 * 6 packets simulate 3 vòng arping với reply từ 2 MAC khác nhau cùng IP.
 *
 * MAC từ session lab thực tế (re-capture 2026-05-24 case-B.pcap):
 *   Server  192.168.81.128  00:0c:29:ba:58:e7
 *   Client1 (DHCP .201)     00:0c:29:c4:f1:be
 *   Client2 (static .201)   00:0c:29:4c:8b:da
 */

import type { DecodedPacket } from '../packet-types'

const MAC_SERVER = [0x00, 0x0c, 0x29, 0xba, 0x58, 0xe7]
const MAC_CLIENT1 = [0x00, 0x0c, 0x29, 0xc4, 0xf1, 0xbe]
const MAC_CLIENT2 = [0x00, 0x0c, 0x29, 0x4c, 0x8b, 0xda]
const MAC_BCAST = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]

const IP_SERVER = [192, 168, 81, 128]
const IP_201 = [192, 168, 81, 201]

const macFmt = (m: number[]) =>
  m.map((b) => b.toString(16).padStart(2, '0')).join(':')
const ipFmt = (ip: number[]) => ip.join('.')

// ARP packet: Ethernet 14 + ARP 28 + padding to 60 = 60 bytes
function buildArpPacket(
  srcMac: number[],
  dstMac: number[],
  opcode: number, // 1 = request, 2 = reply
  senderMac: number[],
  senderIp: number[],
  targetMac: number[],
  targetIp: number[],
): Uint8Array {
  const buf = new Uint8Array(60)
  // Ethernet
  dstMac.forEach((b, i) => (buf[i] = b))
  srcMac.forEach((b, i) => (buf[6 + i] = b))
  buf[12] = 0x08
  buf[13] = 0x06 // ARP ethertype
  // ARP @ 14
  buf[14] = 0x00
  buf[15] = 0x01 // HTYPE Ethernet
  buf[16] = 0x08
  buf[17] = 0x00 // PTYPE IPv4
  buf[18] = 6 // HLEN
  buf[19] = 4 // PLEN
  buf[20] = 0x00
  buf[21] = opcode // OPER
  senderMac.forEach((b, i) => (buf[22 + i] = b))
  senderIp.forEach((b, i) => (buf[28 + i] = b))
  targetMac.forEach((b, i) => (buf[32 + i] = b))
  targetIp.forEach((b, i) => (buf[38 + i] = b))
  // padding zeros to 60 bytes
  return buf
}

function ethLayer(srcMac: number[], dstMac: number[]) {
  return {
    name: 'Ethernet',
    fields: [
      { name: 'Dst MAC', value: macFmt(dstMac), byteOffset: 0, byteLength: 6 },
      { name: 'Src MAC', value: macFmt(srcMac), byteOffset: 6, byteLength: 6 },
      { name: 'EtherType', value: '0x0806 (ARP)', byteOffset: 12, byteLength: 2 },
    ],
  }
}

function arpLayer(
  opcode: number,
  senderMac: number[],
  senderIp: number[],
  targetMac: number[],
  targetIp: number[],
) {
  return {
    name: 'ARP',
    fields: [
      { name: 'Hardware Type', value: '1 (Ethernet)', byteOffset: 14, byteLength: 2 },
      { name: 'Protocol Type', value: '0x0800 (IPv4)', byteOffset: 16, byteLength: 2 },
      { name: 'Hardware Size', value: '6', byteOffset: 18, byteLength: 1 },
      { name: 'Protocol Size', value: '4', byteOffset: 19, byteLength: 1 },
      { name: 'Opcode', value: opcode === 1 ? '1 (Request)' : '2 (Reply)', byteOffset: 20, byteLength: 2 },
      { name: 'Sender MAC', value: macFmt(senderMac), byteOffset: 22, byteLength: 6 },
      { name: 'Sender IP', value: ipFmt(senderIp), byteOffset: 28, byteLength: 4 },
      { name: 'Target MAC', value: macFmt(targetMac), byteOffset: 32, byteLength: 6 },
      { name: 'Target IP', value: ipFmt(targetIp), byteOffset: 38, byteLength: 4 },
    ],
  }
}

function pkArpReq(index: number, ts: string, narrative: string): DecodedPacket {
  const raw = buildArpPacket(MAC_SERVER, MAC_BCAST, 1, MAC_SERVER, IP_SERVER, [0, 0, 0, 0, 0, 0], IP_201)
  return {
    index,
    timestamp: ts,
    summary: `${ts} ARP Request who-has ${ipFmt(IP_201)} tell ${ipFmt(IP_SERVER)} — ${narrative}`,
    rawBytes: raw,
    layers: [
      ethLayer(MAC_SERVER, MAC_BCAST),
      arpLayer(1, MAC_SERVER, IP_SERVER, [0, 0, 0, 0, 0, 0], IP_201),
    ],
  }
}

function pkArpReply(
  index: number,
  ts: string,
  responderMac: number[],
  narrative: string,
): DecodedPacket {
  const raw = buildArpPacket(responderMac, MAC_SERVER, 2, responderMac, IP_201, MAC_SERVER, IP_SERVER)
  const who = responderMac === MAC_CLIENT1 ? 'Client1 (DHCP)' : 'Client2 (static)'
  return {
    index,
    timestamp: ts,
    summary: `${ts} ARP Reply ${ipFmt(IP_201)} is-at ${macFmt(responderMac)} (${who}) — ${narrative}`,
    rawBytes: raw,
    layers: [
      ethLayer(responderMac, MAC_SERVER),
      arpLayer(2, responderMac, IP_201, MAC_SERVER, IP_SERVER),
    ],
  }
}

export const dhcpCaseBCapture: DecodedPacket[] = [
  pkArpReq(0, '04:44:53.848', 'server hỏi ai đang giữ .201'),
  pkArpReply(1, '04:44:53.849', MAC_CLIENT2, 'Client2 (static .201) reply trước'),
  pkArpReply(2, '04:44:53.849', MAC_CLIENT1, 'Client1 (DHCP .201) reply CÙNG → FLAP'),
  pkArpReq(3, '04:44:54.865', 'arping vòng 2'),
  pkArpReply(4, '04:44:54.865', MAC_CLIENT2, 'Client2 vẫn claim .201'),
  pkArpReply(5, '04:44:54.866', MAC_CLIENT1, 'Client1 vẫn claim .201 — server cache flap'),
]
