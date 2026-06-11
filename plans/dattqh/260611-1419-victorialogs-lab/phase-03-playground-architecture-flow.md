---
phase: 3
title: Playground Architecture Flow
status: completed
priority: P2
effort: ''
dependencies:
  - 1
---

# Phase 3: Playground Architecture Flow (Mode 1)

## Overview
Mode 1 của playground — gộp **animated data-flow** + **clickable component explorer** thành 1 sơ đồ SVG duy nhất (DRY). Box vừa chạy animation luồng log, vừa click được để bung chi tiết vai trò/port/config. Có toggle single-node ⟷ cluster.

## Requirements
- Functional: sơ đồ luồng `rsyslog → collector → vlinsert → vlstorage → vlselect → vmui`; chấm sáng chạy dọc luồng; click box → panel chi tiết (role, port, config mẫu); toggle single-node/cluster đổi tập box.
- Non-functional: D3 chỉ tính scale/layout, Framer Motion sở hữu mọi animation DOM/SVG (không `d3.select`); tôn trọng `useReducedMotionPreference` (tắt animation khi user prefers-reduced-motion); file <200 dòng; ít chữ, panel bung khi cần.

## Architecture
- Component `vlogs-architecture-flow.tsx` đọc `VLOGS_COMPONENTS` từ `vlogs-mock-data.ts`.
- Layout: D3 `scalePoint`/thủ công tính toạ độ box theo luồng; Framer Motion `motion.circle` cho chấm chạy, `motion.div`/`motion.path` cho highlight.
- State: `selectedNode` (panel), `topology` ('single'|'cluster'). Panel render `dangerouslySetInnerHTML` cho config mẫu (theo pattern concept-cards hiện có → link tự `target=_blank` nhờ MutationObserver của lab-renderer).
- Citation: port/role cite docs trong text panel (HTML inline `<a>`).

## Related Code Files
- Modify (fill stub): `app/src/components/lab/diagrams/vlogs-architecture-flow.tsx`
- Read: `app/src/components/lab/diagrams/vlogs-mock-data.ts` (Phase 1), `tcp-ip-journey-playground.tsx` + `layer-stack-encap.tsx` (tham chiếu pattern D3+Framer flow đã có)

## Implementation Steps
1. Đọc 1 diagram flow hiện có (vd `layer-stack-encap.tsx` hoặc `dns-visualizer.tsx`) để theo pattern D3-math + Framer-anim.
2. Dựng layout box từ `VLOGS_COMPONENTS` (single-node: victoria-logs đơn + collector + vmui; cluster: vlinsert/vlstorage/vlselect).
3. Thêm chấm sáng chạy luồng (Framer Motion keyframes), tôn trọng reduced-motion.
4. Click box → panel bên cạnh: role + port + config mẫu (cite docs).
5. Toggle single/cluster → đổi danh sách box + path, animate chuyển.
6. Typecheck + kiểm tra trong shell Phase 1.

## Success Criteria
- [ ] Sơ đồ render đúng luồng; chấm sáng chạy (hoặc tĩnh khi reduced-motion).
- [ ] Click mỗi box hiện panel role/port/config có citation.
- [ ] Toggle single ⟷ cluster hoạt động.
- [ ] Không dùng `d3.select`/DOM mutation trực tiếp.
- [ ] File <200 dòng; typecheck pass.

## Risk Assessment
- **D3 đụng React reconciler** → tuyệt đối D3 chỉ trả số, Framer render. Tuân CLAUDE.md "D3 vs Framer separation".
- **Sơ đồ rối khi cluster** → giới hạn số box, layout gọn; cluster chỉ minh hoạ, không cần đầy đủ mọi flag.
