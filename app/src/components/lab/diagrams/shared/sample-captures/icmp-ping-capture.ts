/**
 * Hardcoded ICMP ping sample capture (2 packets).
 * rawBytes layout per packet: [Ethernet 14B | IPv4 20B | ICMP 8B | Payload 16B] = 58 bytes
 *
 * Packet 0: Echo Request  192.168.1.10 → 8.8.8.8
 * Packet 1: Echo Reply    8.8.8.8 → 192.168.1.10
 */

import type { DecodedPacket } from '../packet-types'

// ---------------------------------------------------------------------------
// Byte-level layout constants (offsets within rawBytes)
// ---------------------------------------------------------------------------
const ETH_DST = 0      // 6 bytes
const ETH_SRC = 6      // 6 bytes
const ETH_TYPE = 12    // 2 bytes  0x08 0x00
const IP_START = 14    // IPv4 header start
const ICMP_START = 34  // IP_START + 20
const PAYLOAD_START = 42 // ICMP_START + 8

// Common MAC addresses
const MAC_A = [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff] // client NIC
const MAC_B = [0x11, 0x22, 0x33, 0x44, 0x55, 0x66] // gateway NIC

// IP addresses as byte arrays
const IP_CLIENT = [192, 168, 1, 10]
const IP_SERVER = [8, 8, 8, 8]

// Shared ICMP echo id/seq
const ICMP_ID_HI = 0x12
const ICMP_ID_LO = 0x34
const ICMP_SEQ_HI = 0x00
const ICMP_SEQ_LO = 0x01

// IPv4 total length: 20 (IP) + 8 (ICMP) + 16 (payload) = 44 = 0x002c
const IP_TOTAL_LEN_HI = 0x00
const IP_TOTAL_LEN_LO = 0x2c

// ICMP payload: "ping data      " (16 ASCII bytes)
const PAYLOAD = [
  0x70, 0x69, 0x6e, 0x67, 0x20, 0x64, 0x61, 0x74,
  0x61, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
]

// ---------------------------------------------------------------------------
// Build rawBytes for a single ICMP packet
// ---------------------------------------------------------------------------

function buildICMPRawBytes(
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
  icmpType: number, // 8 = request, 0 = reply
): Uint8Array {
  const buf = new Uint8Array(58)

  // Ethernet header (14 bytes)
  dstMac.forEach((b, i) => { buf[ETH_DST + i] = b })
  srcMac.forEach((b, i) => { buf[ETH_SRC + i] = b })
  buf[ETH_TYPE] = 0x08
  buf[ETH_TYPE + 1] = 0x00

  // IPv4 header (20 bytes, starting at offset 14)
  buf[IP_START + 0] = 0x45         // Version=4, IHL=5
  buf[IP_START + 1] = 0x00         // DSCP+ECN
  buf[IP_START + 2] = IP_TOTAL_LEN_HI
  buf[IP_START + 3] = IP_TOTAL_LEN_LO
  buf[IP_START + 4] = 0x12         // Identification hi
  buf[IP_START + 5] = 0x34         // Identification lo
  buf[IP_START + 6] = 0x00         // Flags+Fragment hi
  buf[IP_START + 7] = 0x00         // Flags+Fragment lo
  buf[IP_START + 8] = 64           // TTL
  buf[IP_START + 9] = 0x01         // Protocol: ICMP
  buf[IP_START + 10] = 0x00        // Checksum hi (not computed)
  buf[IP_START + 11] = 0x00        // Checksum lo
  srcIP.forEach((b, i) => { buf[IP_START + 12 + i] = b })
  dstIP.forEach((b, i) => { buf[IP_START + 16 + i] = b })

  // ICMP header (8 bytes, starting at offset 34)
  buf[ICMP_START + 0] = icmpType   // Type
  buf[ICMP_START + 1] = 0x00       // Code
  buf[ICMP_START + 2] = 0x00       // Checksum hi
  buf[ICMP_START + 3] = 0x00       // Checksum lo
  buf[ICMP_START + 4] = ICMP_ID_HI
  buf[ICMP_START + 5] = ICMP_ID_LO
  buf[ICMP_START + 6] = ICMP_SEQ_HI
  buf[ICMP_START + 7] = ICMP_SEQ_LO

  // Payload (16 bytes)
  PAYLOAD.forEach((b, i) => { buf[PAYLOAD_START + i] = b })

  return buf
}

// ---------------------------------------------------------------------------
// Build DecodedPacket with fields consistent with rawBytes layout
// ---------------------------------------------------------------------------

function makePingPacket(
  index: number,
  timestamp: string,
  icmpType: number,
  srcMac: number[],
  dstMac: number[],
  srcIP: number[],
  dstIP: number[],
): DecodedPacket {
  const rawBytes = buildICMPRawBytes(srcMac, dstMac, srcIP, dstIP, icmpType)

  const srcIPStr = srcIP.join('.')
  const dstIPStr = dstIP.join('.')
  const macFmt = (m: number[]) => m.map((b) => b.toString(16).padStart(2, '0')).join(':')
  const icmpKind = icmpType === 8 ? 'echo request' : 'echo reply'
  // ICMP payload length = totalLen(44) - IP header(20) - ICMP header(8) = 16
  const summary = `${timestamp} IP ${srcIPStr} > ${dstIPStr}: ICMP ${icmpKind}, id 0x1234, seq 1, length 16`

  return {
    index,
    timestamp,
    summary,
    rawBytes,
    layers: [
      {
        name: 'Ethernet',
        fields: [
          { name: 'Dst MAC', value: macFmt(dstMac), byteOffset: ETH_DST, byteLength: 6 },
          { name: 'Src MAC', value: macFmt(srcMac), byteOffset: ETH_SRC, byteLength: 6 },
          { name: 'EtherType', value: '0x0800 (IPv4)', byteOffset: ETH_TYPE, byteLength: 2 },
        ],
      },
      {
        name: 'IPv4',
        fields: [
          { name: 'Version+IHL', value: '0x45', byteOffset: IP_START + 0, byteLength: 1 },
          { name: 'DSCP+ECN', value: '0x00', byteOffset: IP_START + 1, byteLength: 1 },
          { name: 'Total Length', value: '44', byteOffset: IP_START + 2, byteLength: 2 },
          { name: 'Identification', value: '0x1234', byteOffset: IP_START + 4, byteLength: 2 },
          { name: 'Flags+Fragment', value: '0x0000', byteOffset: IP_START + 6, byteLength: 2 },
          { name: 'TTL', value: '64', byteOffset: IP_START + 8, byteLength: 1 },
          { name: 'Protocol', value: '1 (ICMP)', byteOffset: IP_START + 9, byteLength: 1 },
          { name: 'Checksum', value: '0x0000', byteOffset: IP_START + 10, byteLength: 2 },
          { name: 'Source IP', value: srcIPStr, byteOffset: IP_START + 12, byteLength: 4 },
          { name: 'Destination IP', value: dstIPStr, byteOffset: IP_START + 16, byteLength: 4 },
        ],
      },
      {
        name: 'ICMP',
        fields: [
          {
            name: 'Type',
            value: icmpType === 8 ? '8 (Echo Request)' : '0 (Echo Reply)',
            byteOffset: ICMP_START + 0,
            byteLength: 1,
          },
          { name: 'Code', value: '0', byteOffset: ICMP_START + 1, byteLength: 1 },
          { name: 'Checksum', value: '0x0000', byteOffset: ICMP_START + 2, byteLength: 2 },
          { name: 'Identifier', value: '0x1234', byteOffset: ICMP_START + 4, byteLength: 2 },
          { name: 'Sequence', value: '1', byteOffset: ICMP_START + 6, byteLength: 2 },
          { name: 'Data', value: '16 bytes', byteOffset: PAYLOAD_START, byteLength: 16 },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Exported sample capture
// ---------------------------------------------------------------------------

export const icmpPingCapture: DecodedPacket[] = [
  makePingPacket(0, '12:30:45.123456', 8, MAC_B, MAC_A, IP_CLIENT, IP_SERVER),
  makePingPacket(1, '12:30:45.234567', 0, MAC_A, MAC_B, IP_SERVER, IP_CLIENT),
]
