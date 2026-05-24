# Phase 5 — Playground Integration

**Status**: pending
**Effort**: 1.5h
**Blocker**: Phase 2 (cần pcap files); có thể parallel với Phase 4

## Goal

Tích hợp `<PcapUploadZone />` + 2 sample button (Case A, Case B) vào `DhcpPlayground`, copy 2 sample pcap vào `app/public/sample-pcaps/`. Đạt parity với pattern http/icmp-ping playground (đã ship Phase 6 tcpdump enhancement).

## Files to Modify / Create

```
app/public/sample-pcaps/
├── dhcp-case-a.pcap                       # NEW — copy từ source/pcaps/case-A.pcap
└── dhcp-case-b.pcap                       # NEW — copy từ source/pcaps/case-B.pcap

app/src/components/lab/diagrams/
└── dhcp-playground.tsx                    # MODIFY — thêm PcapUploadZone + 2 sample button
```

## Pre-flight: Scout existing pattern

Đọc cách `http-playground.tsx` và `icmp-ping-playground.tsx` integrate PcapUploadZone:
```bash
grep -nE "PcapUploadZone|sample.*pcap|Load.*sample" \
  app/src/components/lab/diagrams/http-playground.tsx \
  app/src/components/lab/diagrams/icmp-ping-playground.tsx
```

Key points cần xác định:
- PcapUploadZone props: `onParsed`, `samples`, etc?
- Sample button: `<button onClick={loadSample('/sample-pcaps/foo.pcap')}>` hay prop của PcapUploadZone?
- Path convention: `/sample-pcaps/` (absolute) hay `import.meta.env.BASE_URL + 'sample-pcaps/...'`?
- Verify icmp-ping/http đã có sample pcap trong `app/public/sample-pcaps/` chưa (nếu chưa → có pattern khác như base64 inline)

## Implementation Steps

### 1. Verify existing sample pcaps path
```bash
ls -la app/public/sample-pcaps/ 2>/dev/null || ls -la app/public/ | grep -i sample
```

Nếu **không có** `app/public/sample-pcaps/`:
- Check icmp-ping/http playground xem dùng cách khác (inline base64? fetch từ CDN? generate synthetic?)
- Theo journal `docs/journals/2026-05-09-tcpdump-lab-enhancement.md`, icmp-ping/http dùng "synthetic sample captures generated in-browser" — KHÔNG có file pcap thực sự
- **Decision**: cho dhcp, dùng **file thực** (case-A.pcap + case-B.pcap) vì capture chứa ICMP ping-check + ARP flap không thể generate trong browser

→ Tạo dir mới:
```bash
mkdir -p app/public/sample-pcaps
cp plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/case-A.pcap app/public/sample-pcaps/dhcp-case-a.pcap
cp plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/case-B.pcap app/public/sample-pcaps/dhcp-case-b.pcap
```

### 2. Modify `dhcp-playground.tsx`

Pattern dự kiến (verify theo scout step 1):

```tsx
import { PcapUploadZone } from './shared/pcap-upload-zone'
import { PacketDecoder } from './shared/packet-decoder'  // hoặc tên thực tế
import { useState } from 'react'
// ... existing imports

export function DhcpPlayground() {
  const [parsedPackets, setParsedPackets] = useState(null)
  const [sampleSource, setSampleSource] = useState<string | null>(null)

  const loadSample = async (path: string, label: string) => {
    const res = await fetch(path)
    const buf = await res.arrayBuffer()
    setSampleSource(label)
    // Trigger PcapUploadZone parse via callback hoặc shared state
    // (verify cách icmp-ping/http làm)
  }

  return (
    <PlaygroundErrorBoundary>
      {/* Existing DHCP DORA visualizer */}
      <DhcpDoraVisualizer />

      {/* NEW — Pcap upload + samples section */}
      <section className="mt-8">
        <h3 className="text-lg font-semibold">Phân tích pcap — 2 case conflict</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => loadSample('/sample-pcaps/dhcp-case-a.pcap', 'Case A — ping-check')}
            className="btn-secondary">
            Case A — ping-check abandons IP
          </button>
          <button
            onClick={() => loadSample('/sample-pcaps/dhcp-case-b.pcap', 'Case B — ARP flap')}
            className="btn-secondary">
            Case B — ARP flap (2 MAC cùng IP)
          </button>
        </div>
        <PcapUploadZone
          onParsed={setParsedPackets}
          source={sampleSource}
        />
        {parsedPackets && <PacketDecoder packets={parsedPackets} />}
      </section>
    </PlaygroundErrorBoundary>
  )
}
```

(API thực tế của PcapUploadZone/PacketDecoder phải verify từ scout step 1)

### 3. Typecheck
```bash
pnpm --dir app run typecheck
```

### 4. Dev test
```bash
# Terminal 1
pnpm run dev:server

# Terminal 2
pnpm --dir app run dev

# Browser: http://localhost:5173/labs/dhcp
# Click "Case A" → verify packet list show DISCOVER, ICMP echo/reply, OFFER for different IP
# Click "Case B" → verify ARP reply with 2 different source MAC for same IP
# Drag-drop pcap from source/pcaps/ → verify parse works
```

## Acceptance Criteria

- [ ] `app/public/sample-pcaps/dhcp-case-a.pcap` + `dhcp-case-b.pcap` exist
- [ ] `dhcp-playground.tsx` import `PcapUploadZone` + `PacketDecoder` từ `shared/`
- [ ] 2 sample button render, click load pcap qua `fetch('/sample-pcaps/...')`
- [ ] `pnpm --dir app run typecheck` pass (no new errors)
- [ ] Browser test: case-A render ≥1 ICMP echo + ≥4 BOOTP frames
- [ ] Browser test: case-B render ≥2 ARP reply với khác MAC
- [ ] Drag-drop manual pcap vẫn work (không regression)
- [ ] `PlaygroundErrorBoundary` wrap mọi child component mới (không để lỗi pcap break lab)

## Notes

- Pcap mới nằm trong `app/public/sample-pcaps/`. Vite serve static từ `public/` → URL `/sample-pcaps/foo.pcap` (absolute path từ FE root).
- Nếu icmp-ping/http dùng cách khác (synthetic in-browser) → có thể cần build helper `fetch-pcap-as-buffer.ts` riêng cho DHCP. Verify pattern trước khi code.
- Nếu pcap-parser.ts cap 5 MB → đảm bảo cả 2 file < 5 MB (verify Phase 2 đã pass).
- KHÔNG bypass `PlaygroundErrorBoundary` (xem `CLAUDE.md` line 78).
- KHÔNG dùng `d3.select()` hoặc DOM mutation trong component mới — chỉ React/Framer Motion (xem `CLAUDE.md` D3 vs Framer Motion section).
