# Brainstorm — Interactive THINK/SEE Playground

**Date:** 2026-04-19 23:15 | **Branch:** master | **Pilot lab:** `tcp-ip-packet-journey`

## Problem
THINK (TL;DR) + SEE (Walkthrough) hiện render text thuần → user lười đọc, khó visualize packet flow qua 4 tầng TCP/IP. Cần thay bằng diagram tương tác, chuyên nghiệp, mô phỏng được hành trình packet.

## Requirements (locked)
- Pilot 1 lab: `tcp-ip-packet-journey` (content dày, multi-device, multi-layer).
- Mức tương tác: **full simulation/playground** (không chỉ hover/click).
- Stack: **D3 + Framer Motion + React**.
- Schema: **hybrid** — generic types (`layer-stack`, `sequence`, `bit-mask`) + escape hatch `type: 'custom'`.
- Desktop: **playground thay hoàn toàn text TLDR**. Mobile (<768px): fallback text-only (LabRenderer hiện tại).
- Sandbox cho user nhập IP/port bất kỳ, kèm preset demo.
- Export diagram ra PNG/SVG.

## Approaches evaluated
| | Pros | Cons | Verdict |
|--|------|------|---------|
| Mermaid.js | Rẻ, declarative | Tương tác hạn chế, look generic | ❌ không đủ "chuyên nghiệp" |
| React Flow + Framer | Pro node/edge, dễ maintain | Look node-graph, không hợp stack encap | ❌ |
| Custom SVG + D3 + Framer | Full control, encap demo mượt, data-viz đúng chất | Dev cost cao cho lab đầu | ✅ chọn |
| D3 thuần | Linh hoạt max | Dễ leak, fight React | ❌ |

## Recommended solution

### THINK → 4-Layer Stack Encapsulation Playground (thay text TLDR trên desktop)
- SVG stack 4 tầng (L4 → L1), mỗi layer là card click-expandable.
- **Drag-to-encapsulate**: kéo packet icon từ L4 xuống L1 → Framer Motion animate headers bọc dần: `[HTTP] → [TCP|HTTP] → [IP|TCP|HTTP] → [Eth|IP|TCP|HTTP|FCS]`.
- Hover layer → highlight protocol chips; click chip → drill-down (why / whyBreaks / deployUse từ fixture).
- Reverse mode (decapsulation) phía receiver.
- Không cần text TLDR riêng trên desktop — toàn bộ nội dung TLDR nhúng trong diagram (text-in-diagram). Mobile fallback về text card cũ.

### SEE → Packet Journey Simulator
- Canvas 2 cột (client ↔ routers ↔ server), mỗi device có 4 layer slots.
- **3 modes**:
  - *Story mode*: timeline scrubber đồng bộ với `walkthrough[]`, mỗi step = 1 frame (DNS → ARP → encap → routing hops → reply).
  - *Step-by-step*: Next/Prev + pause.
  - *Sandbox*: user nhập source IP, dest IP/host, port, packet type. Preset dropdown (curl example.com, ping 8.8.8.8, SSH :22). Inject failure: DNS fail, firewall block port, MTU mismatch, default gateway down → animate packet chết đúng layer + highlight matching `failModes`/`fixSteps` panel.
- Click device/layer → side panel: protocol detail + `observeWith` cmd.
- **Export** button: serialize current SVG state → download PNG (via `canvas.toBlob`) hoặc SVG file.

### Schema extension
```ts
// app/src/lib/schema-lab.ts (optional field, backwards-compat)
diagram?:
  | { type: 'layer-stack' | 'sequence' | 'bit-mask'; config: Record<string, unknown> }
  | { type: 'custom'; component: string }
```
Pilot fixture: `diagram: { type: 'custom', component: 'TcpIpJourneyPlayground' }`. Registry `component name → React component` tránh dynamic import phức tạp.

### Tech split
- **D3**: layout only (`d3-scale`, `d3-shape` cho routing paths, layer coords). Modular import ~15kb.
- **Framer Motion**: owns `transform/opacity`, all animation/transition. ~30kb.
- **React**: owns DOM tree (mount/unmount), state qua `useReducer` (frame-index + play state + sandbox config).
- Separation rule: D3 KHÔNG touch DOM, Framer KHÔNG compute layout.

### Responsive strategy
- `useMediaQuery('(min-width: 768px)')`:
  - Desktop → `TcpIpJourneyPlayground` (thay cả THINK + SEE).
  - Mobile → `LabRenderer` hiện tại (text fallback).
- Không animate dưới 768px.

## Implementation considerations

### Risks
| Risk | Mitigation |
|------|------------|
| Animation state máy phình | `useReducer` với explicit frames; không cần XState |
| D3 vs Framer tranh DOM | Strict separation: D3 chỉ return coords/paths; Framer owns motion |
| Bundle bloat | D3 modular, lazy-load playground qua `React.lazy` (chỉ load trên desktop) |
| Sandbox input validation | Zod schema cho IP/port; preset dropdown giảm free-text error |
| PNG export SVG có foreignObject | Dùng `dom-to-image-more` hoặc manual `XMLSerializer` + `Canvas.drawImage`; test trước chọn lib |
| Custom component debt | Chỉ 1 lab; extract primitives SAU lab 2 |
| A11y mất | `aria-live` announce frame; keyboard nav (←/→/Space); `prefers-reduced-motion` disable animation |

### Security
- Sandbox IP/port chỉ client-side render, không gửi server → không có SSRF.
- Validate input bằng Zod (IPv4 regex, port 1-65535).

### Rough phases
1. Schema extension + component registry scaffold + responsive switch.
2. Layer-stack component (THINK) + drag-encapsulation animation.
3. Packet journey story mode (SEE) bound to `walkthrough[]`.
4. Step-by-step mode + scrubber.
5. Sandbox mode (IP/port input + presets + failure injection).
6. PNG/SVG export.
7. Polish: keyboard nav, aria-live, `prefers-reduced-motion`, bundle audit.

## Success metrics
- Quiz trung bình trên `tcp-ip-packet-journey` tăng.
- Time-on-page ≥ 40min (estimated_minutes).
- Scroll-depth reach section SHIP tăng.
- Subjective: user tự đánh giá "đỡ lười đọc hơn".

## Next steps
- Sang `/ck:plan` để tạo plan triển khai chi tiết 7 phase trên.
- Identify reusable diagram primitives sau khi pilot xong (cho lab thứ 2).

## Resolved follow-ups
- **PNG watermark**: KHÔNG — YAGNI, không code watermark generator.
- **Sandbox persist**: CÓ, tối giản — `localStorage` key `sandbox:<lab-slug>` lưu `{ preset, sourceIp, destIp, port, failureFlags }`. KHÔNG persist `currentFrame` / `isPlaying`. Thêm nút "Reset sandbox".
- **Mobile diagram**: KHÔNG (12 tháng tới) — giữ text fallback. Revisit nếu data chứng minh >50% traffic mobile.

## Unresolved questions
(none)
