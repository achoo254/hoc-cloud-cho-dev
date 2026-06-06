/**
 * Low-level byte-reading helpers shared by all PCAP layer decoders.
 * Pure functions — no side effects, no imports.
 */

export function u8(bytes: Uint8Array, offset: number): number {
  return bytes[offset] ?? 0
}

export function u16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
}

export function u32be(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  )
}

export function hex2(n: number): string {
  return n.toString(16).padStart(2, '0')
}

export function macStr(bytes: Uint8Array, offset: number): string {
  return Array.from({ length: 6 }, (_, i) => hex2(bytes[offset + i] ?? 0)).join(':')
}

export function ipStr(bytes: Uint8Array, offset: number): string {
  return `${bytes[offset] ?? 0}.${bytes[offset + 1] ?? 0}.${bytes[offset + 2] ?? 0}.${bytes[offset + 3] ?? 0}`
}

export function hexWord(n: number, nibbles = 4): string {
  return '0x' + n.toString(16).padStart(nibbles, '0').toUpperCase()
}
