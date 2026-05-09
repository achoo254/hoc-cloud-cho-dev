/**
 * Transport layer decoders: ICMP, TCP, HTTP text.
 * Byte offsets in DecodedField are relative to the packet's rawBytes.
 */

import type { DecodedLayer } from './packet-types'
import { u8, u16be, u32be, hexWord } from './pcap-decoder-utils'

const HTTP_METHODS = ['GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'HTTP/']

// Cap line length to avoid pathological inputs blowing memory or stack.
const MAX_HTTP_LINE_BYTES = 4096
const MAX_HTTP_HEADERS = 64

// TextDecoder is safe for arbitrary byte length (no spread → no stack overflow).
// 'latin1' maps every byte 1:1 to U+0000..U+00FF, ideal for HTTP header bytes.
const HTTP_TEXT_DECODER = new TextDecoder('latin1')

function decodeBytesToString(bytes: Uint8Array, start: number, end: number): string {
  const safeEnd = Math.min(end, start + MAX_HTTP_LINE_BYTES)
  return HTTP_TEXT_DECODER.decode(bytes.subarray(start, safeEnd))
}

// ---------------------------------------------------------------------------
// HTTP text decoder
// ---------------------------------------------------------------------------

export function decodeHTTPText(bytes: Uint8Array, baseOffset: number): DecodedLayer {
  const fields: DecodedLayer['fields'] = []
  if (bytes.length - baseOffset <= 0) return { name: 'HTTP', fields }

  // Find first CRLF — that delimits the request/status line. Bounded scan.
  const scanLimit = Math.min(bytes.length - 1, baseOffset + MAX_HTTP_LINE_BYTES)
  let lineEnd = -1
  for (let i = baseOffset; i < scanLimit; i++) {
    if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a) { lineEnd = i; break }
  }
  if (lineEnd === -1) return { name: 'HTTP', fields }

  const firstLine = decodeBytesToString(bytes, baseOffset, lineEnd)
  const isResponse = firstLine.startsWith('HTTP/')

  fields.push({
    name: isResponse ? 'Status Line' : 'Request Line',
    value: firstLine,
    byteOffset: baseOffset,
    byteLength: lineEnd - baseOffset,
  })

  let pos = lineEnd + 2 // skip CRLF
  let headerCount = 0

  while (pos < bytes.length - 1 && headerCount < MAX_HTTP_HEADERS) {
    if (bytes[pos] === 0x0d && bytes[pos + 1] === 0x0a) break
    const headerScanLimit = Math.min(bytes.length - 1, pos + MAX_HTTP_LINE_BYTES)
    let hEnd = pos
    while (hEnd < headerScanLimit && !(bytes[hEnd] === 0x0d && bytes[hEnd + 1] === 0x0a)) hEnd++
    if (hEnd === pos) break // no progress, avoid infinite loop on malformed input
    const headerStr = decodeBytesToString(bytes, pos, hEnd)
    const colonIdx = headerStr.indexOf(':')
    const headerName = colonIdx >= 0 ? headerStr.slice(0, colonIdx).trim() : headerStr
    fields.push({ name: headerName, value: headerStr, byteOffset: pos, byteLength: hEnd - pos })
    pos = hEnd + 2
    headerCount++
  }

  return { name: 'HTTP', fields }
}

// ---------------------------------------------------------------------------
// ICMP decoder
// ---------------------------------------------------------------------------

export function decodeICMP(bytes: Uint8Array, baseOffset: number): DecodedLayer {
  const fields: DecodedLayer['fields'] = []
  if (bytes.length - baseOffset < 8) return { name: 'ICMP', fields }

  const type = u8(bytes, baseOffset)
  const code = u8(bytes, baseOffset + 1)
  const checksum = u16be(bytes, baseOffset + 2)
  const id = u16be(bytes, baseOffset + 4)
  const seq = u16be(bytes, baseOffset + 6)
  const typeStr = type === 8 ? `${type} (Echo Request)` : type === 0 ? `${type} (Echo Reply)` : `${type}`

  fields.push({ name: 'Type', value: typeStr, byteOffset: baseOffset, byteLength: 1 })
  fields.push({ name: 'Code', value: String(code), byteOffset: baseOffset + 1, byteLength: 1 })
  fields.push({ name: 'Checksum', value: hexWord(checksum), byteOffset: baseOffset + 2, byteLength: 2 })
  fields.push({ name: 'Identifier', value: hexWord(id), byteOffset: baseOffset + 4, byteLength: 2 })
  fields.push({ name: 'Sequence', value: String(seq), byteOffset: baseOffset + 6, byteLength: 2 })

  const payloadLen = bytes.length - baseOffset - 8
  if (payloadLen > 0) {
    fields.push({ name: 'Data', value: `${payloadLen} bytes`, byteOffset: baseOffset + 8, byteLength: payloadLen })
  }

  return { name: 'ICMP', fields }
}

// ---------------------------------------------------------------------------
// TCP decoder
// ---------------------------------------------------------------------------

export type TCPDecodeResult = {
  layer: DecodedLayer
  httpLayer: DecodedLayer | null
}

export function decodeTCP(bytes: Uint8Array, baseOffset: number): TCPDecodeResult {
  const fields: DecodedLayer['fields'] = []

  if (bytes.length - baseOffset < 20) {
    return { layer: { name: 'TCP', fields }, httpLayer: null }
  }

  const srcPort = u16be(bytes, baseOffset)
  const dstPort = u16be(bytes, baseOffset + 2)
  const seq = u32be(bytes, baseOffset + 4)
  const ack = u32be(bytes, baseOffset + 8)
  const dataOffsetFlags = u16be(bytes, baseOffset + 12)
  const window = u16be(bytes, baseOffset + 14)
  const checksum = u16be(bytes, baseOffset + 16)
  const urgentPtr = u16be(bytes, baseOffset + 18)

  const dataOffset = ((dataOffsetFlags >> 12) & 0x0f) * 4
  const flagByte = dataOffsetFlags & 0xff

  // Build flag string — SYN+ACK takes priority
  let flagStr: string
  if ((flagByte & 0x12) === 0x12) {
    flagStr = '[S.]'
  } else {
    const parts: string[] = []
    if (flagByte & 0x02) parts.push('S')
    if (flagByte & 0x10) parts.push('.')
    if (flagByte & 0x08) parts.push('P')
    if (flagByte & 0x04) parts.push('R')
    if (flagByte & 0x01) parts.push('F')
    if (flagByte & 0x20) parts.push('U')
    flagStr = parts.length === 0 ? '[.]' : `[${parts.join('')}]`
  }

  fields.push({ name: 'Source Port', value: String(srcPort), byteOffset: baseOffset, byteLength: 2 })
  fields.push({ name: 'Dest Port', value: String(dstPort), byteOffset: baseOffset + 2, byteLength: 2 })
  fields.push({ name: 'Sequence', value: String(seq), byteOffset: baseOffset + 4, byteLength: 4 })
  fields.push({ name: 'Acknowledgment', value: String(ack), byteOffset: baseOffset + 8, byteLength: 4 })
  fields.push({ name: 'Data Offset+Flags', value: `${flagStr} (${hexWord(dataOffsetFlags)})`, byteOffset: baseOffset + 12, byteLength: 2 })
  fields.push({ name: 'Window', value: String(window), byteOffset: baseOffset + 14, byteLength: 2 })
  fields.push({ name: 'Checksum', value: hexWord(checksum), byteOffset: baseOffset + 16, byteLength: 2 })
  fields.push({ name: 'Urgent Ptr', value: String(urgentPtr), byteOffset: baseOffset + 18, byteLength: 2 })

  const tcpPayloadOffset = baseOffset + dataOffset
  let httpLayer: DecodedLayer | null = null

  if (bytes.length - tcpPayloadOffset > 0) {
    const preview = decodeBytesToString(bytes, tcpPayloadOffset, tcpPayloadOffset + 8)
    if (HTTP_METHODS.some((m) => preview.startsWith(m))) {
      httpLayer = decodeHTTPText(bytes, tcpPayloadOffset)
    }
  }

  return { layer: { name: 'TCP', fields }, httpLayer }
}
