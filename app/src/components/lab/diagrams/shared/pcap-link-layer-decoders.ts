/**
 * Link and network layer decoders: Ethernet, Linux SLL (cooked capture), IPv4.
 * Byte offsets in DecodedField are relative to the packet's rawBytes.
 */

import type { DecodedLayer } from './packet-types'
import { u8, u16be, macStr, ipStr, hexWord, hex2 } from './pcap-decoder-utils'

// ---------------------------------------------------------------------------
// Ethernet (DLT_EN10MB, link type 1)
// ---------------------------------------------------------------------------

export type EthernetDecodeResult = {
  layer: DecodedLayer
  etherType: number
  payloadOffset: number
}

export function decodeEthernet(bytes: Uint8Array, baseOffset = 0): EthernetDecodeResult | null {
  if (bytes.length - baseOffset < 14) return null

  const dstMac = macStr(bytes, baseOffset)
  const srcMac = macStr(bytes, baseOffset + 6)
  const etherType = u16be(bytes, baseOffset + 12)

  const etherTypeStr =
    etherType === 0x0800
      ? '0x0800 (IPv4)'
      : etherType === 0x86dd
        ? '0x86DD (IPv6)'
        : hexWord(etherType)

  return {
    layer: {
      name: 'Ethernet',
      fields: [
        { name: 'Dst MAC', value: dstMac, byteOffset: baseOffset, byteLength: 6 },
        { name: 'Src MAC', value: srcMac, byteOffset: baseOffset + 6, byteLength: 6 },
        { name: 'EtherType', value: etherTypeStr, byteOffset: baseOffset + 12, byteLength: 2 },
      ],
    },
    etherType,
    payloadOffset: baseOffset + 14,
  }
}

// ---------------------------------------------------------------------------
// Linux SLL — cooked capture (DLT_LINUX_SLL, link type 113)
// ---------------------------------------------------------------------------

export type SLLDecodeResult = {
  layer: DecodedLayer
  protocol: number
  payloadOffset: number
}

export function decodeLinuxSLL(bytes: Uint8Array): SLLDecodeResult | null {
  if (bytes.length < 16) return null

  const packetType = u16be(bytes, 0)
  const arphrd = u16be(bytes, 2)
  const addrLen = u16be(bytes, 4)
  const srcAddr = Array.from({ length: 8 }, (_, i) => hex2(bytes[6 + i] ?? 0)).join(':')
  const protocol = u16be(bytes, 14)

  const packetTypeStr =
    packetType === 0 ? '0 (To us)' : packetType === 4 ? '4 (Outgoing)' : String(packetType)

  return {
    layer: {
      name: 'Linux SLL',
      fields: [
        { name: 'Packet Type', value: packetTypeStr, byteOffset: 0, byteLength: 2 },
        { name: 'ARPHRD', value: String(arphrd), byteOffset: 2, byteLength: 2 },
        { name: 'Addr Length', value: String(addrLen), byteOffset: 4, byteLength: 2 },
        { name: 'Src Addr', value: srcAddr, byteOffset: 6, byteLength: 8 },
        { name: 'Protocol', value: hexWord(protocol), byteOffset: 14, byteLength: 2 },
      ],
    },
    protocol,
    payloadOffset: 16,
  }
}

// ---------------------------------------------------------------------------
// IPv4
// ---------------------------------------------------------------------------

export type IPv4DecodeResult = {
  layer: DecodedLayer
  protocol: number
  headerEnd: number
  totalLen: number
  srcIP: string
  dstIP: string
}

export function decodeIPv4(bytes: Uint8Array, baseOffset: number): IPv4DecodeResult | null {
  if (bytes.length - baseOffset < 20) return null

  const versionIHL = u8(bytes, baseOffset)
  const version = (versionIHL >> 4) & 0x0f
  if (version !== 4) return null

  const ihl = (versionIHL & 0x0f) * 4
  const dscpEcn = u8(bytes, baseOffset + 1)
  const totalLen = u16be(bytes, baseOffset + 2)
  const identification = u16be(bytes, baseOffset + 4)
  const flagsFrag = u16be(bytes, baseOffset + 6)
  const ttl = u8(bytes, baseOffset + 8)
  const protocol = u8(bytes, baseOffset + 9)
  const checksum = u16be(bytes, baseOffset + 10)
  const srcIP = ipStr(bytes, baseOffset + 12)
  const dstIP = ipStr(bytes, baseOffset + 16)

  const protoStr =
    protocol === 1
      ? '1 (ICMP)'
      : protocol === 6
        ? '6 (TCP)'
        : protocol === 17
          ? '17 (UDP)'
          : String(protocol)

  return {
    layer: {
      name: 'IPv4',
      fields: [
        { name: 'Version+IHL', value: hexWord(versionIHL, 2), byteOffset: baseOffset, byteLength: 1 },
        { name: 'DSCP+ECN', value: hexWord(dscpEcn, 2), byteOffset: baseOffset + 1, byteLength: 1 },
        { name: 'Total Length', value: String(totalLen), byteOffset: baseOffset + 2, byteLength: 2 },
        { name: 'Identification', value: hexWord(identification), byteOffset: baseOffset + 4, byteLength: 2 },
        { name: 'Flags+Fragment', value: hexWord(flagsFrag), byteOffset: baseOffset + 6, byteLength: 2 },
        { name: 'TTL', value: String(ttl), byteOffset: baseOffset + 8, byteLength: 1 },
        { name: 'Protocol', value: protoStr, byteOffset: baseOffset + 9, byteLength: 1 },
        { name: 'Checksum', value: hexWord(checksum), byteOffset: baseOffset + 10, byteLength: 2 },
        { name: 'Source IP', value: srcIP, byteOffset: baseOffset + 12, byteLength: 4 },
        { name: 'Destination IP', value: dstIP, byteOffset: baseOffset + 16, byteLength: 4 },
      ],
    },
    protocol,
    headerEnd: baseOffset + ihl,
    totalLen,
    srcIP,
    dstIP,
  }
}
