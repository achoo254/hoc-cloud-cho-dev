---
phase: 2
status: completed
priority: high
estimated_hours: 1
depends_on: [1]
---

# Phase 02 — Sample Captures (icmp-ping + http)

## Goal

Hardcode 2 sample capture (TS const `DecodedPacket[]`) cho default view của playground. Bytes phải chuẩn (verified bằng tcpdump/Wireshark thật).

## Files Created

```
app/src/components/lab/diagrams/shared/sample-captures/
├── icmp-ping-capture.ts
└── http-capture.ts
```

## Generation Workflow

1. Trên Linux test machine: `tcpdump -i any -w /tmp/icmp.pcap -c 2 'icmp and host 8.8.8.8'`
2. `ping -c 1 8.8.8.8` để có 1 cặp request/reply
3. `xxd /tmp/icmp.pcap` → copy bytes
4. Decode bằng parser Phase 01 → snapshot output làm `DecodedPacket[]`
5. Tương tự cho HTTP: `tcpdump -i any -w /tmp/http.pcap -c 10 'tcp port 80'` + `curl http://example.com/` (5–7 packets thực tế: SYN, SYN-ACK, ACK, GET, ACK, 200 OK, ACK, FIN, ACK)

## `icmp-ping-capture.ts`

```ts
import type { DecodedPacket } from '../packet-types'

export const icmpPingCapture: DecodedPacket[] = [
  // Packet 0: ICMP echo request 192.168.1.10 → 8.8.8.8
  { index: 0, timestamp: '...', summary: '...', layers: [...], rawBytes: new Uint8Array([...]) },
  // Packet 1: ICMP echo reply 8.8.8.8 → 192.168.1.10
  { index: 1, timestamp: '...', summary: '...', layers: [...], rawBytes: new Uint8Array([...]) },
]
```

Layers per packet:
- Ethernet: src MAC, dst MAC, etherType 0x0800
- IPv4: version 4, IHL 5, TTL, Protocol 1, src, dst
- ICMP: Type (8/0), Code 0, Checksum, ID, Seq, Payload (timestamp pattern)

## `http-capture.ts`

5-packet sequence (KISS, không cần full FIN handshake):
1. SYN (client → server, port 80)
2. SYN-ACK (server → client)
3. ACK (client)
4. PSH+ACK với HTTP `GET / HTTP/1.1\r\nHost: example.com\r\n\r\n`
5. PSH+ACK với HTTP `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>...</html>`

Layers per packet:
- Ethernet → IPv4 → TCP (+ HTTP cho packet 4, 5)

## Implementation Steps

1. Generate 2 file pcap thật trên Linux/WSL
2. Convert sang `Uint8Array` literal (script helper hoặc copy hex bằng tay)
3. Run parser Phase 01 trên bytes → verify decoded layers đúng
4. Snapshot kết quả → ghi `DecodedPacket[]` const
5. Type check ở consume site (import + log length)

## Success Criteria

- [ ] `icmpPingCapture.length === 2`
- [ ] `httpCapture.length === 5`
- [ ] Each packet `rawBytes.length === sum(layer field byteLengths)` (sanity, có thể relax cho HTTP payload)
- [ ] No magic byte mismatch khi tự decode lại
- [ ] Typecheck pass

## Risks

- Bytes sai checksum → Wireshark warn "bad checksum" trong file gốc; không quan trọng cho học, có thể giữ nguyên
- File quá lớn để hardcode → strip về 2 + 5 packets là đủ minh hoạ
