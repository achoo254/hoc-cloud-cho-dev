/**
 * Shared constants, byte-level helpers, and layer factories for the HTTP
 * sample capture. Also exports the three TCP-handshake packets (SYN/SYN-ACK/ACK).
 */

import type { DecodedPacket, DecodedLayer } from '../packet-types'

// ---------------------------------------------------------------------------
// Layout constants (exported so http-capture.ts can build HTTP data packets)
// ---------------------------------------------------------------------------

export const ETH_LEN = 14
export const IP_LEN = 20
export const TCP_LEN = 20  // data offset = 5, no options

export const MAC_CLIENT = [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x01]
export const MAC_SERVER = [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x02]
export const IP_CLIENT = [192, 168, 1, 10]
export const IP_SERVER = [1, 1, 1, 1]
export const PORT_CLIENT = 54321
export const PORT_SERVER = 80

// ---------------------------------------------------------------------------
// Byte-writing helpers
// ---------------------------------------------------------------------------

export function macFmt(m: number[]): string {
  return m.map((b) => b.toString(16).padStart(2, '0')).join(':')
}

export function ipFmt(ip: number[]): string {
  return ip.join('.')
}

export function writeU16BE(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = (val >> 8) & 0xff
  buf[offset + 1] = val & 0xff
}

export function writeU32BE(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = (val >>> 24) & 0xff
  buf[offset + 1] = (val >>> 16) & 0xff
  buf[offset + 2] = (val >>> 8) & 0xff
  buf[offset + 3] = val & 0xff
}

function hexWord(n: number, nibbles = 4): string {
  return '0x' + n.toString(16).padStart(nibbles, '0').toUpperCase()
}

// ---------------------------------------------------------------------------
// Raw-bytes builder: writes Ethernet + IPv4 + TCP headers into buf
// ---------------------------------------------------------------------------

export function writeEthIPv4TCP(
  buf: Uint8Array,
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  srcPort: number,
  dstPort: number,
  seq: number,
  ack: number,
  flagsByte: number,
  payloadLen: number,
): void {
  dstMac.forEach((b, i) => { buf[i] = b })
  srcMac.forEach((b, i) => { buf[6 + i] = b })
  buf[12] = 0x08; buf[13] = 0x00

  const ipStart = ETH_LEN
  writeU16BE(buf, ipStart + 2, IP_LEN + TCP_LEN + payloadLen)
  buf[ipStart] = 0x45; buf[ipStart + 1] = 0x00
  buf[ipStart + 4] = 0x00; buf[ipStart + 5] = 0x01
  buf[ipStart + 6] = 0x40; buf[ipStart + 7] = 0x00
  buf[ipStart + 8] = 64; buf[ipStart + 9] = 0x06
  buf[ipStart + 10] = 0x00; buf[ipStart + 11] = 0x00
  srcIP.forEach((b, i) => { buf[ipStart + 12 + i] = b })
  dstIP.forEach((b, i) => { buf[ipStart + 16 + i] = b })

  const tcpStart = ETH_LEN + IP_LEN
  writeU16BE(buf, tcpStart, srcPort)
  writeU16BE(buf, tcpStart + 2, dstPort)
  writeU32BE(buf, tcpStart + 4, seq)
  writeU32BE(buf, tcpStart + 8, ack)
  writeU16BE(buf, tcpStart + 12, (0x50 << 8) | flagsByte)
  writeU16BE(buf, tcpStart + 14, 65535)
  buf[tcpStart + 16] = 0x00; buf[tcpStart + 17] = 0x00
  buf[tcpStart + 18] = 0x00; buf[tcpStart + 19] = 0x00
}

// ---------------------------------------------------------------------------
// Layer field factories
// ---------------------------------------------------------------------------

export function makeEthernetLayer(srcMac: number[], dstMac: number[]): DecodedLayer {
  return {
    name: 'Ethernet',
    fields: [
      { name: 'Dst MAC', value: macFmt(dstMac), byteOffset: 0, byteLength: 6 },
      { name: 'Src MAC', value: macFmt(srcMac), byteOffset: 6, byteLength: 6 },
      { name: 'EtherType', value: '0x0800 (IPv4)', byteOffset: 12, byteLength: 2 },
    ],
  }
}

export function makeIPv4Layer(srcIPStr: string, dstIPStr: string, totalLen: number): DecodedLayer {
  const ipStart = ETH_LEN
  return {
    name: 'IPv4',
    fields: [
      { name: 'Version+IHL', value: '0x45', byteOffset: ipStart, byteLength: 1 },
      { name: 'DSCP+ECN', value: '0x00', byteOffset: ipStart + 1, byteLength: 1 },
      { name: 'Total Length', value: String(totalLen), byteOffset: ipStart + 2, byteLength: 2 },
      { name: 'Identification', value: '0x0001', byteOffset: ipStart + 4, byteLength: 2 },
      { name: 'Flags+Fragment', value: '0x4000', byteOffset: ipStart + 6, byteLength: 2 },
      { name: 'TTL', value: '64', byteOffset: ipStart + 8, byteLength: 1 },
      { name: 'Protocol', value: '6 (TCP)', byteOffset: ipStart + 9, byteLength: 1 },
      { name: 'Checksum', value: '0x0000', byteOffset: ipStart + 10, byteLength: 2 },
      { name: 'Source IP', value: srcIPStr, byteOffset: ipStart + 12, byteLength: 4 },
      { name: 'Destination IP', value: dstIPStr, byteOffset: ipStart + 16, byteLength: 4 },
    ],
  }
}

export function makeTCPLayer(
  srcPort: number,
  dstPort: number,
  seq: number,
  ack: number,
  flagsByte: number,
  flagStr: string,
): DecodedLayer {
  const tcpStart = ETH_LEN + IP_LEN
  const dataOffsetFlags = (0x50 << 8) | flagsByte
  return {
    name: 'TCP',
    fields: [
      { name: 'Source Port', value: String(srcPort), byteOffset: tcpStart, byteLength: 2 },
      { name: 'Dest Port', value: String(dstPort), byteOffset: tcpStart + 2, byteLength: 2 },
      { name: 'Sequence', value: String(seq), byteOffset: tcpStart + 4, byteLength: 4 },
      { name: 'Acknowledgment', value: String(ack), byteOffset: tcpStart + 8, byteLength: 4 },
      { name: 'Data Offset+Flags', value: `${flagStr} (${hexWord(dataOffsetFlags)})`, byteOffset: tcpStart + 12, byteLength: 2 },
      { name: 'Window', value: '65535', byteOffset: tcpStart + 14, byteLength: 2 },
      { name: 'Checksum', value: '0x0000', byteOffset: tcpStart + 16, byteLength: 2 },
      { name: 'Urgent Ptr', value: '0', byteOffset: tcpStart + 18, byteLength: 2 },
    ],
  }
}

// ---------------------------------------------------------------------------
// TCP 3-way handshake packets (SYN / SYN-ACK / ACK)
// ---------------------------------------------------------------------------

export function makeSYN(): DecodedPacket {
  const buf = new Uint8Array(54)
  writeEthIPv4TCP(buf, MAC_CLIENT, MAC_SERVER, IP_CLIENT, IP_SERVER,
    PORT_CLIENT, PORT_SERVER, 1000, 0, 0x02, 0)
  const ts = '12:30:46.000000'
  const srcStr = ipFmt(IP_CLIENT); const dstStr = ipFmt(IP_SERVER)
  return {
    index: 0, timestamp: ts, rawBytes: buf,
    summary: `${ts} IP ${srcStr}.${PORT_CLIENT} > ${dstStr}.${PORT_SERVER}: Flags [S], seq 1000, length 0`,
    layers: [
      makeEthernetLayer(MAC_CLIENT, MAC_SERVER),
      makeIPv4Layer(srcStr, dstStr, IP_LEN + TCP_LEN),
      makeTCPLayer(PORT_CLIENT, PORT_SERVER, 1000, 0, 0x02, '[S]'),
    ],
  }
}

export function makeSYNACK(): DecodedPacket {
  const buf = new Uint8Array(54)
  writeEthIPv4TCP(buf, MAC_SERVER, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    PORT_SERVER, PORT_CLIENT, 2000, 1001, 0x12, 0)
  const ts = '12:30:46.001000'
  const srcStr = ipFmt(IP_SERVER); const dstStr = ipFmt(IP_CLIENT)
  return {
    index: 1, timestamp: ts, rawBytes: buf,
    summary: `${ts} IP ${srcStr}.${PORT_SERVER} > ${dstStr}.${PORT_CLIENT}: Flags [S.], seq 2000, length 0`,
    layers: [
      makeEthernetLayer(MAC_SERVER, MAC_CLIENT),
      makeIPv4Layer(srcStr, dstStr, IP_LEN + TCP_LEN),
      makeTCPLayer(PORT_SERVER, PORT_CLIENT, 2000, 1001, 0x12, '[S.]'),
    ],
  }
}

export function makeACK(): DecodedPacket {
  const buf = new Uint8Array(54)
  writeEthIPv4TCP(buf, MAC_CLIENT, MAC_SERVER, IP_CLIENT, IP_SERVER,
    PORT_CLIENT, PORT_SERVER, 1001, 2001, 0x10, 0)
  const ts = '12:30:46.002000'
  const srcStr = ipFmt(IP_CLIENT); const dstStr = ipFmt(IP_SERVER)
  return {
    index: 2, timestamp: ts, rawBytes: buf,
    summary: `${ts} IP ${srcStr}.${PORT_CLIENT} > ${dstStr}.${PORT_SERVER}: Flags [.], seq 1001, length 0`,
    layers: [
      makeEthernetLayer(MAC_CLIENT, MAC_SERVER),
      makeIPv4Layer(srcStr, dstStr, IP_LEN + TCP_LEN),
      makeTCPLayer(PORT_CLIENT, PORT_SERVER, 1001, 2001, 0x10, '[.]'),
    ],
  }
}
