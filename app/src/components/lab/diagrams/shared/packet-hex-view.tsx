/**
 * Right-bottom panel: hex dump of raw packet bytes.
 * Highlights byte range of the selected field in yellow.
 * 16 bytes per row with offset, hex pairs, and ASCII column.
 */

import type { DecodedField, DecodedPacket } from './packet-types'

const BYTES_PER_ROW = 16

interface PacketHexViewProps {
  packet: DecodedPacket | null
  highlightedField: DecodedField | null
}

function isHighlighted(byteIdx: number, field: DecodedField | null): boolean {
  if (!field) return false
  return byteIdx >= field.byteOffset && byteIdx < field.byteOffset + field.byteLength
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

function toPrintable(byte: number): string {
  return byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.'
}

interface HexRowProps {
  offset: number
  bytes: Uint8Array
  startIdx: number
  field: DecodedField | null
}

function HexRow({ offset, bytes, startIdx, field }: HexRowProps) {
  const rowBytes = Array.from(bytes)

  const hexCells: React.ReactNode[] = []
  for (let i = 0; i < rowBytes.length; i++) {
    const globalIdx = startIdx + i
    const hl = isHighlighted(globalIdx, field)
    // Extra space at byte 8 for readability
    if (i === 8) {
      hexCells.push(<span key="mid-space">{' '}</span>)
    }
    hexCells.push(
      <span
        key={i}
        className={hl ? 'bg-yellow-200 dark:bg-yellow-900/40' : undefined}
      >
        {toHex(rowBytes[i])}
      </span>,
    )
    if (i < rowBytes.length - 1) {
      hexCells.push(<span key={`sp-${i}`}>{' '}</span>)
    }
  }

  // Pad hex section when row has fewer than 16 bytes
  if (rowBytes.length < BYTES_PER_ROW) {
    const missing = BYTES_PER_ROW - rowBytes.length
    // each missing byte: 2 chars + 1 space; also mid-space if < 8
    const extraSpaces = missing * 3 + (rowBytes.length < 8 ? 1 : 0)
    hexCells.push(<span key="pad">{' '.repeat(extraSpaces)}</span>)
  }

  const asciiCells: React.ReactNode[] = rowBytes.map((b, i) => {
    const globalIdx = startIdx + i
    const hl = isHighlighted(globalIdx, field)
    return (
      <span
        key={i}
        className={hl ? 'bg-yellow-200 dark:bg-yellow-900/40' : undefined}
      >
        {toPrintable(b)}
      </span>
    )
  })

  return (
    <div className="flex gap-3 leading-tight">
      {/* Offset */}
      <span className="select-none text-muted-foreground">
        {offset.toString(16).padStart(4, '0')}
      </span>
      {/* Hex pairs */}
      <span className="flex-1">{hexCells}</span>
      {/* ASCII */}
      <span className="select-none border-l border-muted pl-3 text-muted-foreground">
        {asciiCells}
      </span>
    </div>
  )
}

export function PacketHexView({ packet, highlightedField }: PacketHexViewProps) {
  if (!packet) {
    return (
      <div className="flex items-center justify-center rounded border p-3 text-xs text-muted-foreground">
        —
      </div>
    )
  }

  const bytes = packet.rawBytes
  const rows: React.ReactNode[] = []

  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_ROW) {
    const rowBytes = bytes.slice(offset, offset + BYTES_PER_ROW)
    rows.push(
      <HexRow
        key={offset}
        offset={offset}
        bytes={rowBytes}
        startIdx={offset}
        field={highlightedField}
      />,
    )
  }

  return (
    <div className="overflow-x-auto rounded border p-3">
      <pre className="font-mono text-[11px] leading-tight md:text-xs">{rows}</pre>
    </div>
  )
}
