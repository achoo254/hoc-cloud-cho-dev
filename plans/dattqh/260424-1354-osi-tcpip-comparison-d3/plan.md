# Plan — OSI ↔ TCP/IP Comparison D3 Diagram (SEE phase)

## Context
Lab: `tcp-ip-packet-journey` (slug).
Yêu cầu thầy: vẽ lại 2 mô hình chuẩn OSI/TCP/IP trong tab SEE.
- **Mô hình 1** (3-column): TCP/IP | Protocols & Services | OSI — đầy đủ 7 OSI blocks + 4 TCP/IP blocks + protocol list đối chiếu.
- **Mô hình 2** (OSI detail + TCP/IP): 7 OSI layers với `Data unit` (Data×3, Segments, Packets, Frames, Bits) + mô tả ngắn + nhóm **Host Layers** / **Media Layers** + TCP/IP 4 tầng (Application/Transport/Internet/Network Access) kèm label **Application Layer** / **Data Flow Layer**.

Constraints user confirmed:
1. Dùng **D3.js animation** (style `network-topology/network-topology.tsx`).
2. Đủ 7 OSI + 4 TCP/IP, không thiếu bước.
3. **Bỏ `PacketJourney`** (4 circles Client/DNS/Router/Server, 8 steps) khỏi tab SEE.
4. Giữ `NetworkTopology`.

## Deliverables

### 1. New diagram module (D3-based)
Path: `app/src/components/lab/diagrams/osi-tcpip-comparison/`

Theo pattern `network-topology/` (folder-based module):
- `osi-tcpip-comparison.tsx` (~80L) — container, render 2 diagrams stack dọc + shared play/pause/reset.
- `three-column-mapping.tsx` (~180L) — Diagram 1 (D3 SVG, animated highlight theo 4 TCP/IP groups).
- `osi-seven-layer.tsx` (~200L) — Diagram 2 (D3 SVG, animated reveal bottom-up Physical→Application, brackets Host/Media + App/Data Flow).
- `constants.ts` (~80L) — OSI 7 data, TCP/IP 4 data, protocol groups, color tokens.
- `index.ts` — barrel.

Animation specs:
- **Diagram 1**: pulse-glow 1 TCP/IP block → fade-in liên kết bracket với OSI block(s) tương ứng → fade-in chip protocols ở cột giữa. Loop 4 groups. Có Play/Pause/Reset.
- **Diagram 2**: reveal từ Physical (bits) lên Application (theo encapsulation physical→logical). Mỗi layer: slide-in từ trái + glow PDU badge bên trái. Sau khi 7 OSI layers xong, fade-in TCP/IP 4 blocks bên phải + 2 dashed brackets (Host/Media, App/Data Flow). Có Play/Pause/Reset.

Colors: reuse `LAYER_COLORS` trong `app/src/components/lab/diagrams/styles.ts` + thêm token cho L5/L6/L7 OSI (chưa có).

### 2. Integrate vào tab SEE
File: `app/src/components/lab/diagrams/tcp-ip-journey-playground.tsx`

- Remove import + render `PacketJourney`.
- Add import + render `OsiTcpipComparison` (đứng **đầu tab SEE**, trước `NetworkTopology`).
- Giữ `seeExtraContent` (walkthrough markdown) ở cuối như cũ.

### 3. (Optional) Xóa file không dùng
`packet-journey.tsx` — check xem còn component khác reference không; nếu không, xóa để tránh dead code.

## File changes summary
| File | Action | Lines est. |
|---|---|---|
| `osi-tcpip-comparison/osi-tcpip-comparison.tsx` | create | ~80 |
| `osi-tcpip-comparison/three-column-mapping.tsx` | create | ~180 |
| `osi-tcpip-comparison/osi-seven-layer.tsx` | create | ~200 |
| `osi-tcpip-comparison/constants.ts` | create | ~80 |
| `osi-tcpip-comparison/index.ts` | create | ~5 |
| `tcp-ip-journey-playground.tsx` | edit (swap PacketJourney → OsiTcpipComparison) | -3 / +3 |
| `packet-journey.tsx` | delete (nếu không ref nơi khác) | - |

## Todo
- [ ] Grep check `PacketJourney` / `packet-journey` usage ngoài `tcp-ip-journey-playground.tsx`
- [ ] Build `constants.ts`: OSI 7 data (num, name, pdu, desc), TCP/IP 4 data (name, osiRange), protocol groups (per TCP/IP tier)
- [ ] Implement `three-column-mapping.tsx` (Diagram 1)
- [ ] Implement `osi-seven-layer.tsx` (Diagram 2)
- [ ] Implement container `osi-tcpip-comparison.tsx`
- [ ] Add `index.ts` barrel
- [ ] Edit `tcp-ip-journey-playground.tsx` — remove PacketJourney, add OsiTcpipComparison
- [ ] Delete `packet-journey.tsx` nếu không còn ref
- [ ] `pnpm --dir app run typecheck` — must pass
- [ ] Dev server test: mở lab OSI, tab SEE, xem 2 diagrams animate đúng, PacketJourney biến mất

## Success criteria
- Tab SEE của lab `tcp-ip-packet-journey` render 2 diagrams mới ở trên `NetworkTopology`.
- Diagram 1 thể hiện đủ 4 TCP/IP ↔ 7 OSI mapping + 4 protocol groups khớp Image #3.
- Diagram 2 thể hiện đủ 7 OSI layers (tên + PDU + mô tả ngắn) + nhóm Host/Media + TCP/IP 4 tầng + label App/Data Flow khớp Image #4.
- Animation D3 chạy mượt, có Play/Pause/Reset.
- `PacketJourney` không còn trong UI.
- Typecheck pass.
- Không đụng DB content (walkthrough/tldr giữ nguyên).

## Risks
- Layout 2 diagrams dọc dài → có thể cần responsive (mobile: stack, desktop: stack nhưng width 100%). Xử lý bằng viewBox + max-width.
- Text OSI Vietnamese dài (vd "End-to-End Connections and Reliability" dịch ra) → giữ English mô tả giống Image #4 cho chính xác, có thể thêm subtitle tiếng Việt dưới nếu cần.

## Out of scope
- Không sửa content tldr/walkthrough MongoDB.
- Không touch `LayerStackEncap` (THINK).
- Không touch `NetworkTopology`.
