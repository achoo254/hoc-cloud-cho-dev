---
phase: 4
status: completed
priority: medium
estimated_hours: 1.5
depends_on: [1, 3]
---

# Phase 04 — Upload .pcap UI + Integrate Parser

## Goal

Cho phép user upload file `.pcap` thật → parse client-side → render trong cùng `<PacketDecoder/>`. Thêm tab "Sample" / "Upload" + drag-drop zone.

## Files Modified

- `app/src/components/lab/diagrams/shared/packet-decoder.tsx`

## Files Created

- `app/src/components/lab/diagrams/shared/pcap-upload-zone.tsx`

## State Updates `packet-decoder.tsx`

```ts
type Mode = 'sample' | 'upload'
const [mode, setMode] = useState<Mode>('sample')
const [uploadedPackets, setUploadedPackets] = useState<DecodedPacket[]>([])
const [uploadError, setUploadError] = useState<string | null>(null)
const [truncatedNotice, setTruncatedNotice] = useState(false)

const displayPackets = mode === 'sample' ? defaultPackets : uploadedPackets
```

## `pcap-upload-zone.tsx`

```ts
type Props = {
  onParsed: (packets: DecodedPacket[], truncated: boolean) => void
  onError: (message: string) => void
}
```

UI:
- `<input type="file" accept=".pcap,.cap" hidden ref={inputRef}/>`
- Drop zone div: dashed border, `onDragOver/onDrop/onClick` mở dialog
- Khi có file: gọi `file.arrayBuffer()` → `parsePcap(buf)` → onParsed/onError

Error message map:
- `INVALID_MAGIC` → "Không phải file PCAP hợp lệ"
- `PCAPNG_UNSUPPORTED` → "File PCAPNG (.pcapng) chưa được hỗ trợ. Dùng `tcpdump -w file.pcap` (không thêm flag --pcapng)"
- `TOO_LARGE` → "File quá lớn (max 5 MB). Dùng `tcpdump -c 100` để giới hạn số packet"
- `MALFORMED` → "File hỏng hoặc không đúng format PCAP classic"
- `UNKNOWN_LINK_TYPE` → "Link type không hỗ trợ. Hỗ trợ: Ethernet (-i eth0) hoặc Linux SLL (-i any)"

## Tab UI trong `packet-decoder.tsx`

```tsx
<div className="flex gap-2 border-b">
  <button onClick={() => setMode('sample')} className={tab(mode === 'sample')}>
    Sample
  </button>
  <button onClick={() => setMode('upload')} className={tab(mode === 'upload')}>
    Upload .pcap
  </button>
</div>
{mode === 'upload' && (
  <PcapUploadZone onParsed={...} onError={...} />
)}
{uploadError && <Alert variant="destructive">{uploadError}</Alert>}
{truncatedNotice && <Alert>Hiển thị 200 packet đầu tiên (file lớn hơn).</Alert>}
{displayPackets.length > 0 && /* 3-panel layout */}
```

## Implementation Steps

1. Thêm `pcap-upload-zone.tsx` (drop + file input)
2. Update `packet-decoder.tsx` thêm state `mode` + `uploadedPackets`
3. Wire onParsed → set state + reset error
4. Wire onError → toast/alert
5. Test với file pcap thật (Linux capture) trong browser
6. Test edge: drag .txt → INVALID_MAGIC; drag pcapng → PCAPNG_UNSUPPORTED

## Security

- KHÔNG đọc file > 5 MB (check trước khi `arrayBuffer()`)
- HTTP payload render trong `<pre>` escape, không `dangerouslySetInnerHTML`
- KHÔNG send file lên server

## Success Criteria

- [ ] Upload pcap thật từ Linux → render đúng
- [ ] Upload .txt → toast "Không phải file PCAP hợp lệ"
- [ ] Upload pcapng → toast hướng dẫn fix
- [ ] Upload > 5 MB → reject ngay không freeze
- [ ] Drag-drop + click chọn file đều work
- [ ] Switch tab Sample ↔ Upload không mất state mỗi tab

## Out of Scope

- Multi-file upload
- Save/restore upload qua localStorage
- PCAPNG parser
