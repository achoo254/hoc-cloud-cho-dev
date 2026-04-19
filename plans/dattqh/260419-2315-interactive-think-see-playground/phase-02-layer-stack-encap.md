# Phase 02 — Layer-stack encapsulation demo (THINK)

**Priority:** P1 | **Effort:** 1d | **Status:** pending | **Depends:** phase-01

## Goal
Render 4-layer TCP/IP stack dạng SVG tương tác, kèm drag-to-encapsulate animation. Text TLDR nhúng trong layer cards.

## Related files
- `app/src/components/lab/diagrams/tcp-ip-journey-playground.tsx` — main playground container
- `app/src/components/lab/diagrams/layer-stack-encap.tsx` — NEW, layer-stack subcomponent
- `app/src/components/lab/diagrams/packet-chip.tsx` — NEW, reusable packet/header chip
- `app/src/components/lab/diagrams/styles.ts` — NEW, shared D3 scales + color tokens

## Implementation steps
1. Read `lab.tldr` (4 items: L4/L3/L2/L1). Layout 4 horizontal rows top-to-bottom, D3 `scaleBand` chia heights.
2. Each layer card hiển thị: layer label (L4-L1), name, pdu, device, protocol chips (split từ `item.protocol` theo `,`), why snippet. Click → expand full detail (whyBreaks + deploymentUse).
3. Drag source: packet icon ở đỉnh L4 (HTTP message). `framer-motion` `useDragControls` + `onDragEnd` → snap vào layer bên dưới, animate header chip prepend.
4. At each layer snap: show current encapsulation formula update (`[HTTP] → [TCP|HTTP] → ...`). Reset button bỏ về L4.
5. Reverse toggle (top-right) — start từ L1 với đầy đủ frame, kéo lên L4 → remove headers dần.
6. Hover protocol chip → highlight same protocol ở các layer khác + trong packet formula.
7. Use Tailwind + shadcn theme colors; không hardcode hex.

## Acceptance criteria
- 4 layers render đúng thứ tự L4 trên → L1 dưới.
- Drag packet → header chips animate prepend, khớp từng layer.
- Reverse mode hoạt động ngược.
- Click layer expand/collapse mượt.
- `prefers-reduced-motion` disable drag animation (snap instant).

## Risks
- Framer drag + D3 scale conflict → D3 chỉ cung cấp số, Framer handle transform.
- Content TLDR hiện tại `protocol` là string comma-separated → simple split, không schema change.

## [RED TEAM] Required changes

### #15 — Enforce D3×Framer separation
`styles.ts` chỉ export **pure functions** arithmetic hoặc D3 scale output:
```ts
// NO d3-selection, NO d3-transition imports allowed
export const getLayerY = (idx: number, h: number) => scaleBand().domain([...]).range([0, h])(String(idx))
export const getDeviceX = (idx: number, w: number) => (w / (DEVICES.length - 1)) * idx
```
ESLint rule trong phase-07 bảo vệ import. Alt đơn giản hơn: bỏ D3 hoàn toàn, thay bằng arithmetic 4 dòng — "D3 vs Framer tranh DOM" risk tự động biến mất.

### #7 (preview) — Drag state machine (spec trước khi code)
Quyết định interaction trước:
- **Sequential-only:** drag L4 → chỉ snap L3, không cho skip xuống L1 trực tiếp. Visual affordance: dashed outline layer kế tiếp.
- **Drop ngoài zone:** packet return về source.
- **Reverse toggle mid-drag:** cancel drag, reset state.
Document state machine `idle → dragging(fromLayer) → snapped(toLayer)` trong file comment.
