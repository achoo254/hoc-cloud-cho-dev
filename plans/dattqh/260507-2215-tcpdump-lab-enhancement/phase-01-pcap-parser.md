---
phase: 1
status: pending
priority: high
estimated_hours: 1.5
---

# Phase 01 — PCAP Parser (vanilla, client-side)

## Goal

Implement parser PCAP format (libpcap classic, NOT PCAPNG) chạy hoàn toàn client-side, không dependency mới.

## Files Created

- `app/src/components/lab/diagrams/shared/packet-types.ts`
- `app/src/components/lab/diagrams/shared/pcap-parser.ts`

## Type Definitions (`packet-types.ts`)

```ts
export type DecodedField = {
  name: string         // "Source IP"
  value: string        // "192.168.1.10"
  byteOffset: number   // offset in rawBytes
  byteLength: number
}

export type DecodedLayer = {
  name: string         // "Ethernet" | "IPv4" | "ICMP" | "TCP" | "HTTP"
  fields: DecodedField[]
}

export type DecodedPacket = {
  index: number
  timestamp: string    // "12:30:45.123456"
  summary: string      // tcpdump-style 1-liner
  layers: DecodedLayer[]
  rawBytes: Uint8Array
}

export type PcapParseResult =
  | { ok: true; packets: DecodedPacket[]; truncated: boolean }
  | { ok: false; error: 'INVALID_MAGIC' | 'PCAPNG_UNSUPPORTED' | 'TOO_LARGE' | 'MALFORMED' | 'UNKNOWN_LINK_TYPE'; message: string }
```

## Parser API (`pcap-parser.ts`)

```ts
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_PACKETS = 200

export function parsePcap(buf: ArrayBuffer): PcapParseResult
```

## Implementation Steps

1. **Validate size** — `buf.byteLength > MAX_FILE_BYTES` → return `TOO_LARGE`
2. **Read global header (24 bytes)**
   - Bytes 0..3 = magic. Detect:
     - `0xa1b2c3d4` (BE) or `0xd4c3b2a1` (LE) → classic PCAP
     - `0x0a0d0d0a` → PCAPNG → return `PCAPNG_UNSUPPORTED`
     - else → `INVALID_MAGIC`
   - Read `network` (link type) at offset 20 (4 bytes). Support **1 (Ethernet)** + **113 (Linux SLL)**; else `UNKNOWN_LINK_TYPE`
3. **Iterate packet records** until `MAX_PACKETS` or buffer end
   - Record header 16 bytes: `ts_sec`, `ts_usec`, `incl_len`, `orig_len`
   - Bound check: `incl_len ≤ remaining bytes` else `MALFORMED`
   - Read `incl_len` bytes raw → decode layers
   - Format timestamp `HH:mm:ss.uuuuuu` (UTC OK, không cần tz convert)
4. **Layer decoders** (separate functions):
   - `decodeEthernet(bytes)` → next layer = IPv4 (etherType `0x0800`); else stop
   - `decodeLinuxSLL(bytes)` → 16-byte header, protocol field offset 14
   - `decodeIPv4(bytes)` → version, IHL, TotalLen, Protocol (1=ICMP, 6=TCP, 17=UDP), src/dst
   - `decodeICMP(bytes)` → Type (8=echo req, 0=echo reply), Code, Checksum, ID, Seq
   - `decodeTCP(bytes)` → src/dst port, seq, ack, flags (URG/ACK/PSH/RST/SYN/FIN), window, data offset
   - `decodeHTTPText(bytes)` — heuristic: starts with `GET `/`POST `/`HTTP/` → parse first line + headers as text
5. **Summary line** — generate tcpdump-style:
   - ICMP: `12:30:45.123456 IP 192.168.1.10 > 8.8.8.8: ICMP echo request, id 1, seq 1, length 64`
   - TCP: `12:30:45.234567 IP 192.168.1.10.54321 > 1.1.1.1.80: Flags [S], seq 0, length 0`
   - HTTP: append payload first line `: GET / HTTP/1.1`

## Edge Cases

- IPv4 IHL > 5 (options) → skip option bytes correctly
- TCP data offset > 5 → skip TCP options
- TCP payload empty → no HTTP layer
- Truncated packet (incl_len < layer header size) → render layers parsed so far + raw bytes for rest
- IPv6 (etherType `0x86dd`) → render Ethernet only, layer name "IPv6 (unsupported)"

## Validation

- Manual test: parse 1 file PCAP từ `tcpdump -i any -w /tmp/icmp.pcap -c 4 icmp` Linux
- Edge: file 0 byte → `MALFORMED`
- Edge: chỉ global header không có packet → `ok: true, packets: []`

## Success Criteria

- [ ] File ≤ 200 LOC tổng (nếu vượt → split decoder thành `pcap-decoders.ts`)
- [ ] Type-safe với `Uint8Array` + `DataView`
- [ ] No `any` casts
- [ ] Pure functions, no side effects
- [ ] Typecheck pass

## Notes

KHÔNG dùng `Buffer` (Node only). Dùng `DataView` cho endianness, `Uint8Array` cho raw.
