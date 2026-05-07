---
type: brainstorm-report
date: 2026-05-07
slug: tcpdump-lab-enhancement
status: approved
related_labs: [icmp-ping, http]
---

# Brainstorm — Bổ sung tcpdump cho lab `icmp-ping` & `http`

## 1. Problem Statement

Giáo viên giao bài: (a) tìm hiểu giao thức ping, (b) học `tcpdump` Linux & dùng bắt gói ping + http. Repo đã có `icmp-ping-playground` + `http-playground` (THINK/SEE/TRY IT). Cần mở rộng 2 lab này để dạy `tcpdump` mà KHÔNG tạo lab độc lập, KHÔNG đổi schema v3.

## 2. Constraints

- Lab content: MongoDB single source of truth, sync Meilisearch tự động qua post-save hook
- Schema v3 cố định: `try_at_home: { cmd, why, observeWith }` đã đủ chỗ chứa lệnh tcpdump
- FE: Vite + React + Framer Motion (D3 chỉ math); component <200 LOC
- Mongo standalone — không transactions
- Pattern THINK/SEE/TRY IT bắt buộc giữ
- Không hardcode lab content trong FE

## 3. Approaches Evaluated

| # | Approach | Pros | Cons | Verdict |
|---|----------|------|------|---------|
| A | Lab tcpdump độc lập | Tách khái niệm, search-friendly | Trùng concept ping/http, tốn content viết mới | Reject |
| B | Bổ sung tcpdump vào ping & http lab | Tận dụng context có sẵn, học tcpdump gắn protocol | Playground 2 lab phình to, phải responsive cẩn thận | **Chọn** |
| C | Chỉ update content (try_at_home + tldr) | Nhanh nhất | Không đủ visual, mất giá trị "see-through" | Reject |
| D | B + cross-link nhau | Đầy đủ | Over-scope cho task hiện tại | Defer |

## 4. Final Solution

### 4.1 Frontend — Shared Packet Decoder (FULL: list + tree + hex + upload .pcap)

**File mới:**
```
app/src/components/lab/diagrams/shared/
├── packet-decoder.tsx           # main 3-panel UI
├── pcap-parser.ts               # PCAP file format parser (client-side, vanilla)
├── packet-types.ts              # DecodedPacket, Layer, Field types
└── sample-captures/
    ├── icmp-ping-capture.ts     # 2 packets: echo request + reply
    └── http-capture.ts          # 5–7 packets: handshake + GET + 200 + FIN
```

**`packet-decoder.tsx` API:**
```ts
type DecodedPacket = {
  timestamp: string         // "12:30:45.123456"
  summary: string           // tcpdump-style 1-liner
  layers: Layer[]           // Ethernet → IP → ICMP/TCP → HTTP
  rawBytes: Uint8Array
}
type Layer = { name: string; fields: Field[] }
type Field = { name: string; value: string; byteOffset: number; byteLength: number }

<PacketDecoder
  defaultPackets={icmpPingCapture}
  allowUpload={true}
  uploadMaxBytes={5 * 1024 * 1024}  // 5 MB hard cap
/>
```

**UI layout (desktop):**
- Trái (1/3): tcpdump-style summary list, click = chọn packet
- Phải-trên (2/3 trên): Layer tree, click field = highlight bytes
- Phải-dưới (2/3 dưới): Hex+ASCII viewer, scroll-sync với highlight
- Header: tab "Sample" / "Upload" + drag-drop zone

**Mobile (< md):** stack vertical: list → tree → hex (collapsible).

### 4.2 PCAP Parser (vanilla, no dep)

PCAP format đơn giản, tự parse:
- Global header 24 bytes (magic `0xa1b2c3d4` BE / `0xd4c3b2a1` LE → detect endianness)
- Per-packet: 16-byte header (ts_sec, ts_usec, incl_len, orig_len) + raw bytes
- Link types: support **DLT_EN10MB (1)** + **DLT_LINUX_SLL (113)** (Linux `-i any` dùng SLL)
- Decoders: Ethernet/SLL → IPv4 → ICMP / TCP → HTTP (text payload)
- Limit: parse tối đa 200 packets đầu (UX guard)
- File size: 5 MB hard cap (browser memory + UX)
- Error handling: invalid magic → toast "Không phải file PCAP hợp lệ"; unknown link type → fallback hex-only

**KHÔNG support:** PCAPNG (định dạng mới phức tạp hơn), encrypted, IPv6 (Phase 2 nếu cần).

### 4.3 Tích hợp vào playground hiện có

```tsx
// icmp-ping-playground.tsx — thêm vào seeContent
<section>
  <h3>tcpdump capture</h3>
  <PacketDecoder defaultPackets={icmpPingCapture} allowUpload />
</section>

// http-playground.tsx — tương tự với httpCapture
```

KHÔNG sửa `registry.ts`, KHÔNG sửa `lab-model.js`, KHÔNG sửa schema.

### 4.4 Content MongoDB Update

**Script 1 lần:** `server/scripts/update-lab-tcpdump.js` — đọc lab `icmp-ping` & `http`, merge thêm fields, `lab.save()` (post-save tự sync Meilisearch).

**Per lab thêm:**

`try_at_home` (3 entries):
- ICMP: `tcpdump -i any -n icmp` / `tcpdump -i any -n -X icmp` / `tcpdump -i any -n 'icmp and host 8.8.8.8'`
- HTTP: `tcpdump -i any -n -A 'tcp port 80'` / `tcpdump -i any -n -s0 -w /tmp/http.pcap 'tcp port 80'` / `tcpdump -i any -n 'tcp[tcpflags] & tcp-syn != 0'`

`misconceptions` (2 item):
- "tcpdump tự bắt mọi interface" → mặc định 1; cần `-i any`
- "tcpdump không bắt được loopback" → cần `-i lo`

`tldr` (1 item): "tcpdump = packet sniffer CLI, dùng BPF filter (`icmp`, `tcp port 80`), output format đọc theo cột timestamp/proto/src→dst/flags"

`walkthrough` (1 step): "Đọc 1 dòng tcpdump ICMP echo request — mapping từng cột với field IP/ICMP header"

`quiz` (1 câu): "Filter BPF nào bắt cả request + reply HTTP?" → `tcp port 80`

`flashcards` (1 card): front "Cờ `-X` trong tcpdump?" → back "in hex+ASCII payload"

## 5. Implementation Phases

| Phase | Scope | Est |
|-------|-------|-----|
| 1 | `packet-types.ts` + `pcap-parser.ts` + unit test parser | 1.5h |
| 2 | `sample-captures/icmp-ping-capture.ts` + `http-capture.ts` (verify với Wireshark) | 1h |
| 3 | `packet-decoder.tsx` — list + tree + hex (3-panel desktop) | 3h |
| 4 | Upload .pcap UI + integrate parser + error states | 1.5h |
| 5 | Mobile responsive (stack + collapsible) | 1h |
| 6 | Integrate vào `icmp-ping-playground` + `http-playground` | 0.5h |
| 7 | `server/scripts/update-lab-tcpdump.js` + chạy update Mongo | 1h |
| 8 | Typecheck + build + manual smoke test (desktop + mobile) | 0.5h |

**Total est: ~10h**

## 6. Success Criteria

- [ ] `pnpm --dir app run typecheck` xanh
- [ ] `pnpm --dir app run build` xanh
- [ ] Lab `icmp-ping` & `http` SEE section render PacketDecoder, sample capture click expand đúng layer/byte
- [ ] Upload .pcap test thật (capture từ `tcpdump -i any -w x.pcap icmp` Linux) → render OK
- [ ] Invalid .pcap → toast lỗi không crash
- [ ] Mobile: 3 panel stack vertical, không overflow horizontal
- [ ] `try_at_home` Mongo có 3 entries tcpdump cho mỗi lab; Meilisearch search "tcpdump" trả 2 lab

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Sample capture sai bytes (đặc biệt checksum, length) | Generate từ tcpdump thật rồi hardcode bytes vào TS const |
| PCAPNG file user upload (định dạng mới) | Detect magic `0x0a0d0d0a` → toast "Repo chỉ support PCAP cũ, không hỗ trợ PCAPNG" |
| Linux SLL link type lạ | Implement song song với Ethernet, fallback hex-only nếu unknown |
| Hex view + sync highlight phức tạp | MVP: highlight by background-color trên span; không zoom/scroll-into-view phase 1 |
| File .pcap quá lớn freeze browser | Hard cap 5 MB + parse max 200 packets |
| Mobile UX 3 panel chật | Stack vertical < md, hex view collapse default mobile |
| Lab cũ đã có user progress | Update script chỉ MERGE, không replace; content hash sẽ thay đổi tự nhiên |

## 8. Security Considerations

- PCAP parser: validate magic + bounded loop + cap incl_len ≤ remaining bytes (chống DoS qua malformed file)
- KHÔNG eval/dynamic import, parse vanilla
- HTTP payload có thể chứa text bất kỳ → render dưới `<pre>` với escape, KHÔNG `dangerouslySetInnerHTML`
- File upload client-side only, không gửi server

## 9. Out of Scope

- PCAPNG format
- IPv6
- TLS decryption
- Lab tcpdump độc lập
- Tự động generate capture trên server
- Editor cho lab user-generated tcpdump content

## 10. Next Steps

1. Chạy `/ck:plan` với context report này → tạo plan dir `260507-2215-tcpdump-lab-enhancement/` với 8 phase files
2. Implement theo phase order
3. Smoke test: upload file `.pcap` thật từ Linux → verify render

## Unresolved Questions

- Có cần thêm flashcard về flag `-i any` vs `-i eth0` không, hay 1 card đủ? (Defer — quyết khi implement Phase 7)
- IPv6 ICMP (ICMPv6) có phổ biến trong bài tập sinh viên không? (Defer — out of scope phase này, ghi nhận cho future)
