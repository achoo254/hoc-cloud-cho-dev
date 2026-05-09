---
phase: 3
status: completed
priority: high
estimated_hours: 3
depends_on: [1, 2]
---

# Phase 03 — Packet Decoder UI (3-panel desktop)

## Goal

Component shared `<PacketDecoder/>` 3-panel: summary list / layer tree / hex view. Click field → highlight bytes ở hex panel.

## Files Created

```
app/src/components/lab/diagrams/shared/
├── packet-decoder.tsx           # main component, < 200 LOC
├── packet-summary-list.tsx      # left panel
├── packet-layer-tree.tsx        # right-top panel
└── packet-hex-view.tsx          # right-bottom panel
```

Modular nếu `packet-decoder.tsx` > 200 LOC.

## API

```ts
type Props = {
  defaultPackets: DecodedPacket[]
  title?: string
  // upload integrated in Phase 04 — không có ở phase này
}
```

## State

```ts
const [packets, setPackets] = useState(defaultPackets)
const [selectedPacketIdx, setSelectedPacketIdx] = useState(0)
const [highlightedField, setHighlightedField] = useState<DecodedField | null>(null)
```

## Layout Desktop (≥ md)

```
┌────────────────────────────────────────────────────────────┐
│ Title + (Phase 04: Upload button)                          │
├──────────────┬─────────────────────────────────────────────┤
│              │ Layer Tree                                  │
│  Summary     │ ▾ Ethernet                                  │
│  List        │   • dst MAC: aa:bb:...   (offset 0, len 6) │
│  (1/3 width) │   • src MAC: cc:dd:...                      │
│  click=      │ ▾ IPv4                                      │
│  select      │   • Source IP: 192.168.1.10                 │
│              │   ...                                       │
│              ├─────────────────────────────────────────────┤
│              │ Hex View                                    │
│              │ 0000  ff ff ff ff ff ff ...  ......         │
│              │ 0010  ...                                   │
└──────────────┴─────────────────────────────────────────────┘
```

## Components

### `packet-summary-list.tsx`
- `<ul>` với `<li>` mỗi packet, render `summary`
- Selected: bg muted; hover: bg muted/50
- Scrollable, max-height 400px desktop

### `packet-layer-tree.tsx`
- Loop `selected.layers` → `<details open>` mỗi layer
- Loop `layer.fields` → `<button onClick={setHighlightedField}>{name}: {value}</button>`
- Selected field: ring + bg primary/10

### `packet-hex-view.tsx`
- Render mỗi 16 byte/dòng: offset (4 chars hex) + 16 hex pairs + ASCII (printable ≥ 0x20 < 0x7f, else `.`)
- Khi `highlightedField`: wrap byte trong range `[byteOffset, byteOffset+byteLength)` bằng `<span class="bg-yellow-200">`
- Monospace font (`font-mono text-xs`)

### `packet-decoder.tsx`
- Compose 3 sub-components trong CSS grid: `grid-cols-3 md:grid-cols-3 gap-4`
- Wrap trong `<PlaygroundErrorBoundary>` (đã có trong codebase)

## Styling

- TailwindCSS only
- Border + rounded để phân biệt panel
- Dark mode: tận dụng existing token (xem `playground/styles.ts` hiện có)

## Implementation Steps

1. Tạo 3 sub-component dumb (props in, no state)
2. Tạo `packet-decoder.tsx` orchestrator
3. Wire selection state
4. Wire highlight state, sync hex view
5. Test với `icmpPingCapture` mock import inline (chưa integrate vào lab playground)
6. Validate visual: 1 spike route hoặc tạm import vào page bất kỳ để eyeball

## Success Criteria

- [ ] Click packet trong list → tree update
- [ ] Click field trong tree → bytes highlight đúng range
- [ ] Hex view 16 byte/dòng, offset chính xác
- [ ] Không scroll horizontal trên desktop ≥ 1280px
- [ ] Typecheck pass
- [ ] Mỗi file ≤ 200 LOC

## Risks

- Layer tree dài → set max-height + scroll inside
- Hex highlight span phá monospace alignment → dùng `inline-block w-[1.5ch]` cho mỗi byte cell
