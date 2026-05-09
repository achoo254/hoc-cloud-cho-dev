/**
 * Core types for PCAP packet parsing and visualization.
 * Pure type definitions — no runtime dependencies.
 */

/** A single decoded field within a protocol layer */
export type DecodedField = {
  name: string
  value: string
  byteOffset: number
  byteLength: number
}

/** A decoded protocol layer (Ethernet, IPv4, TCP, etc.) */
export type DecodedLayer = {
  name: string
  fields: DecodedField[]
}

/** A fully decoded network packet */
export type DecodedPacket = {
  index: number
  timestamp: string
  summary: string
  layers: DecodedLayer[]
  rawBytes: Uint8Array
}

/** Error codes returned when PCAP parsing fails */
export type PcapParseError =
  | 'INVALID_MAGIC'
  | 'PCAPNG_UNSUPPORTED'
  | 'TOO_LARGE'
  | 'MALFORMED'
  | 'UNKNOWN_LINK_TYPE'

/** Result of parsing a PCAP file buffer */
export type PcapParseResult =
  | { ok: true; packets: DecodedPacket[]; truncated: boolean }
  | { ok: false; error: PcapParseError; message: string }
