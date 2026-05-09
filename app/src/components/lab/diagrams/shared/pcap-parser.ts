/**
 * PCAP file parser — orchestrates layer decoders to produce DecodedPacket[].
 * Supports classic PCAP (little-endian and big-endian magic).
 * Does NOT support pcapng format.
 *
 * Public API: parsePcap(buf: ArrayBuffer): PcapParseResult
 */

import type { DecodedLayer, DecodedPacket, PcapParseResult } from './packet-types'
import { decodeEthernet, decodeIPv4, decodeLinuxSLL } from './pcap-link-layer-decoders'
import { decodeICMP, decodeTCP } from './pcap-transport-layer-decoders'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_PACKETS = 200

const PCAP_GLOBAL_HEADER_LEN = 24
const PCAP_RECORD_HEADER_LEN = 16

const MAGIC_BE = 0xa1b2c3d4
const MAGIC_LE = 0xd4c3b2a1

// pcapng block type — first 4 bytes
const PCAPNG_BYTE_0 = 0x0a
const PCAPNG_BYTE_1 = 0x0d
const PCAPNG_BYTE_2 = 0x0d
const PCAPNG_BYTE_3 = 0x0a

const DLT_EN10MB = 1
const DLT_LINUX_SLL = 113

// ---------------------------------------------------------------------------
// Timestamp formatter — HH:mm:ss.uuuuuu UTC, no tz conversion
// ---------------------------------------------------------------------------

function formatTimestamp(tsSec: number, tsUsec: number): string {
  const date = new Date(tsSec * 1000)
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  const us = tsUsec.toString().padStart(6, '0')
  return `${hh}:${mm}:${ss}.${us}`
}

// ---------------------------------------------------------------------------
// Summary line builder (tcpdump style)
// ---------------------------------------------------------------------------

function buildSummary(
  timestamp: string,
  layers: DecodedLayer[],
  _rawBytes: Uint8Array,
): string {
  const ip4 = layers.find((l) => l.name === 'IPv4')
  if (!ip4) return `${timestamp} (unknown)`

  const getField = (layer: DecodedLayer, name: string) =>
    layer.fields.find((f) => f.name === name)?.value ?? ''

  const srcIP = getField(ip4, 'Source IP')
  const dstIP = getField(ip4, 'Destination IP')

  const icmp = layers.find((l) => l.name === 'ICMP')
  if (icmp) {
    const typeVal = getField(icmp, 'Type')
    const typeNum = parseInt(typeVal)
    const kind = typeNum === 8 ? 'echo request' : typeNum === 0 ? 'echo reply' : `type ${typeNum}`
    const id = getField(icmp, 'Identifier')
    const seq = getField(icmp, 'Sequence')
    const totalLen = parseInt(getField(ip4, 'Total Length') || '28')
    const icmpPayloadLen = totalLen - 20 - 8
    return `${timestamp} IP ${srcIP} > ${dstIP}: ICMP ${kind}, id ${id}, seq ${seq}, length ${icmpPayloadLen}`
  }

  const tcp = layers.find((l) => l.name === 'TCP')
  if (tcp) {
    const srcPort = getField(tcp, 'Source Port')
    const dstPort = getField(tcp, 'Dest Port')
    const flags = getField(tcp, 'Data Offset+Flags').split(' ')[0] ?? '[.]'
    const seq = getField(tcp, 'Sequence')
    const totalLen = parseInt(getField(ip4, 'Total Length') || '40')
    // data offset from flags field — parse from raw value
    const dataOffsetField = getField(tcp, 'Data Offset+Flags')
    const hexMatch = dataOffsetField.match(/0x([0-9A-Fa-f]+)/)
    const rawDO = hexMatch ? parseInt(hexMatch[1], 16) : 0x5000
    const dataOffset = ((rawDO >> 12) & 0x0f) * 4
    const payloadLen = totalLen - 20 - dataOffset

    const http = layers.find((l) => l.name === 'HTTP')
    const httpLine = http ? http.fields[0]?.value ?? '' : ''

    const base = `${timestamp} IP ${srcIP}.${srcPort} > ${dstIP}.${dstPort}: Flags ${flags}, seq ${seq}, length ${payloadLen}`
    return http && httpLine ? `${base}: ${httpLine}` : base
  }

  return `${timestamp} IP ${srcIP} > ${dstIP}: (unknown protocol)`
}

// ---------------------------------------------------------------------------
// Layer-chain builder for a single packet's rawBytes
// ---------------------------------------------------------------------------

function buildLayers(rawBytes: Uint8Array, linkType: number): DecodedLayer[] {
  const layers: DecodedLayer[] = []

  try {
    if (linkType === DLT_EN10MB) {
      const ethResult = decodeEthernet(rawBytes, 0)
      if (!ethResult) return layers
      layers.push(ethResult.layer)

      if (ethResult.etherType === 0x86dd) {
        layers.push({ name: 'IPv6 (unsupported)', fields: [] })
        return layers
      }
      if (ethResult.etherType !== 0x0800) return layers

      const ip4Result = decodeIPv4(rawBytes, ethResult.payloadOffset)
      if (!ip4Result) return layers
      layers.push(ip4Result.layer)

      buildTransportLayer(layers, rawBytes, ip4Result.protocol, ip4Result.headerEnd)
    } else if (linkType === DLT_LINUX_SLL) {
      const sllResult = decodeLinuxSLL(rawBytes)
      if (!sllResult) return layers
      layers.push(sllResult.layer)

      if (sllResult.protocol !== 0x0800) return layers

      const ip4Result = decodeIPv4(rawBytes, sllResult.payloadOffset)
      if (!ip4Result) return layers
      layers.push(ip4Result.layer)

      buildTransportLayer(layers, rawBytes, ip4Result.protocol, ip4Result.headerEnd)
    }
  } catch {
    // malformed sub-layer: return whatever layers were decoded so far
  }

  return layers
}

function buildTransportLayer(
  layers: DecodedLayer[],
  rawBytes: Uint8Array,
  protocol: number,
  headerEnd: number,
): void {
  if (protocol === 1) {
    const icmpLayer = decodeICMP(rawBytes, headerEnd)
    layers.push(icmpLayer)
  } else if (protocol === 6) {
    const { layer: tcpLayer, httpLayer } = decodeTCP(rawBytes, headerEnd)
    layers.push(tcpLayer)
    if (httpLayer) layers.push(httpLayer)
  }
  // UDP and others: no decoder yet, silently skip
}

// ---------------------------------------------------------------------------
// DataView helpers — endian-aware reads
// ---------------------------------------------------------------------------

function readU32(view: DataView, offset: number, le: boolean): number {
  return view.getUint32(offset, le)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parsePcap(buf: ArrayBuffer): PcapParseResult {
  if (buf.byteLength === 0 || buf.byteLength < PCAP_GLOBAL_HEADER_LEN) {
    return { ok: false, error: 'MALFORMED', message: 'Buffer too small to be a valid PCAP file' }
  }

  if (buf.byteLength > MAX_FILE_BYTES) {
    return { ok: false, error: 'TOO_LARGE', message: `File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB limit` }
  }

  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // Detect pcapng by first 4 bytes
  if (
    bytes[0] === PCAPNG_BYTE_0 &&
    bytes[1] === PCAPNG_BYTE_1 &&
    bytes[2] === PCAPNG_BYTE_2 &&
    bytes[3] === PCAPNG_BYTE_3
  ) {
    return { ok: false, error: 'PCAPNG_UNSUPPORTED', message: 'pcapng format is not supported; convert to classic pcap first' }
  }

  // Detect endianness from magic
  const magic = view.getUint32(0, false) // read as big-endian first
  let littleEndian: boolean

  if (magic === MAGIC_BE) {
    littleEndian = false
  } else if (magic === MAGIC_LE) {
    littleEndian = true
  } else {
    return { ok: false, error: 'INVALID_MAGIC', message: `Unrecognized PCAP magic: 0x${magic.toString(16)}` }
  }

  const linkType = readU32(view, 20, littleEndian)

  if (linkType !== DLT_EN10MB && linkType !== DLT_LINUX_SLL) {
    return {
      ok: false,
      error: 'UNKNOWN_LINK_TYPE',
      message: `Unsupported link type ${linkType}; only Ethernet (1) and Linux SLL (113) are supported`,
    }
  }

  const packets: DecodedPacket[] = []
  let offset = PCAP_GLOBAL_HEADER_LEN
  let truncated = false

  while (offset < buf.byteLength) {
    const remaining = buf.byteLength - offset

    if (remaining < PCAP_RECORD_HEADER_LEN) break

    const tsSec = readU32(view, offset, littleEndian)
    const tsUsec = readU32(view, offset + 4, littleEndian)
    const inclLen = readU32(view, offset + 8, littleEndian)

    if (inclLen === 0) {
      return { ok: false, error: 'MALFORMED', message: `Packet record at offset ${offset} has zero captured length` }
    }
    if (inclLen > remaining - PCAP_RECORD_HEADER_LEN) {
      return { ok: false, error: 'MALFORMED', message: `Packet record at offset ${offset} claims ${inclLen} bytes but only ${remaining - PCAP_RECORD_HEADER_LEN} remain` }
    }

    const packetOffset = offset + PCAP_RECORD_HEADER_LEN
    const rawBytes = new Uint8Array(buf, packetOffset, inclLen)
    const timestamp = formatTimestamp(tsSec, tsUsec)
    const layers = buildLayers(rawBytes, linkType)
    const summary = buildSummary(timestamp, layers, rawBytes)

    packets.push({
      index: packets.length,
      timestamp,
      summary,
      layers,
      rawBytes,
    })

    offset += PCAP_RECORD_HEADER_LEN + inclLen

    if (packets.length >= MAX_PACKETS) {
      truncated = offset < buf.byteLength
      break
    }
  }

  return { ok: true, packets, truncated }
}
