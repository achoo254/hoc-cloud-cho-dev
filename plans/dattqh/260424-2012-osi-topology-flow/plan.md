# OSI flow state — network topology redesign

**Branch:** master | **Status:** in-progress

## Problem

Mô hình 3 (`osi-flow-state.tsx`) hiện là stack đơn + packet chạy lên xuống. User muốn:
- Chuyên nghiệp hơn, chi tiết hơn
- Thêm đường đi kiểu network topology (như Image #5: Client → Router → Internet → Firewall → LB → Server)

## Decision

Thiết kế 3-zone SVG (W=1200, H=820):

```
┌─ Sender stack L7→L1 ┬─ Topology row (7 nodes + dashed arrows) ─┬ Receiver stack L1→L7 ┐
```

**Animation 3 phase:**
1. **Encap Client**: packet spawn top sender, xuống L7→L1, mỗi layer thêm header (AH/PH/SH/TCP/IP/Eth+FCS)
2. **Transit topology**: bits chạy qua 5 hops (Router → ISP → Internet → Firewall → LB), mỗi hop highlight icon + badge layer operate
3. **Decap Server**: packet vào L1 receiver, lên L2→L7, bóc từng header, cuối cùng L7 trao DATA

## Files

- **New** `constants.ts` — thêm `TOPOLOGY_NODES` + `TOPOLOGY_EDGES`
- **Rewrite** `osi-flow-state.tsx` — full redesign (~500-650 lines, match codebase style)

## Steps

1. Thêm TOPOLOGY data vào `constants.ts`
2. Rewrite `osi-flow-state.tsx` (giữ tên + export)
3. Typecheck
4. Manual verify browser

## Risks

- Canvas 1200x820 có thể tràn mobile → giữ viewBox responsive
- Timing phức tạp: encap (~17s) + transit (~10s) + decap (~15s) = cycle ~42s → đủ chậm đọc
- Icons lucide-react cần foreignObject trong SVG (hoặc dùng SVG path trực tiếp)

## Out of scope

- Thay đổi `osi-seven-layer.tsx` hoặc `three-column-mapping.tsx`
- Device-level detail (NAT table, firewall rules)
