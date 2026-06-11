---
phase: 1
title: Foundation & Registry
status: completed
priority: P1
effort: ''
dependencies: []
---

# Phase 1: Foundation & Registry

## Overview
Dựng khung playground + đăng ký vào registry để mọi phase sau có chỗ gắn vào, và để Zod `DiagramSchema` chấp nhận key `VictoriaLogsPlayground`. Kết thúc phase: lab có `diagram.component = "VictoriaLogsPlayground"` render được 1 shell trống có 3 sub-tab (chưa có nội dung mode), text-mode vẫn an toàn.

## Requirements
- Functional: registry có key mới; shell playground render 3 sub-tab (Kiến trúc&Luồng / LogsQL / Dựng stack); nhận đúng props `DiagramComponentProps` (`lab`, `seeExtraContent`, `tryItContent`) và render slot SEE + TRY IT vào đúng tab.
- Non-functional: file <200 dòng; lazy-load qua `lazy()`; bọc được bởi `PlaygroundErrorBoundary`; degrade ở `?textMode=1`.

## Architecture
- `lab-renderer.tsx` khi `lab.diagram.type==='custom'` → resolve `diagramRegistry[component]` → render trong `<Suspense>` + `PlaygroundErrorBoundary`, truyền `seeExtraContent` (Walkthrough) + `tryItContent` (Quiz/Flashcards/Try-at-home).
- Shell `VictoriaLogsPlayground` quản state sub-tab nội bộ (dùng `Tabs` shadcn). Tab "Kiến trúc&Luồng" mặc định. SEE slot + TRY IT slot đặt dưới mode hoặc trong tab riêng — mirror cách các playground hiện có (đọc `tcp-ip-journey-playground.tsx` để theo đúng convention bố cục THINK/SEE/TRY của playground).
- Mock data tách riêng `vlogs-mock-data.ts` (dataset log JSON + metadata component) để Phase 3/4 dùng chung (DRY).

## Related Code Files
- Create: `app/src/components/lab/diagrams/victorialogs-playground.tsx` (shell + sub-tab + slot wiring)
- Create: `app/src/components/lab/diagrams/vlogs-mock-data.ts` (mock log dataset + component metadata; ~40-60 log entries có `_time`,`_stream`,`_msg`,`level`,`host`,`app`)
- Create stub (điền ở phase sau): `vlogs-architecture-flow.tsx`, `vlogs-logsql-playground.tsx`, `vlogs-pipeline-stepper.tsx` — Phase 1 chỉ cần placeholder export hợp lệ để shell import không vỡ.
- Modify: `app/src/components/lab/diagrams/registry.ts` — thêm entry `VictoriaLogsPlayground: lazy(() => import('./victorialogs-playground').then(m => ({ default: m.VictoriaLogsPlayground })))`

## Implementation Steps
1. Đọc `tcp-ip-journey-playground.tsx` (playground pilot) để nắm convention: cách nhận props, cách render `seeExtraContent`/`tryItContent`, cách bố cục tab.
2. Tạo `vlogs-mock-data.ts`: export `MOCK_LOGS` (array log entries) + `VLOGS_COMPONENTS` (metadata box: id, label, role, port, configSample) cho cả single-node và cluster.
3. Tạo 3 file con dạng stub (named export trả về placeholder `<div>` nhỏ) để import hợp lệ.
4. Tạo `victorialogs-playground.tsx`: shell `Tabs` 3 mode, import 3 component con; render `seeExtraContent` + `tryItContent` đúng chỗ (theo convention bước 1).
5. Thêm key vào `registry.ts`.
6. `pnpm --dir app run typecheck` — `DIAGRAM_REGISTRY_KEYS` tự cập nhật → `DiagramSchema` enum chấp nhận key mới; không cần sửa `schema-lab.ts`.

## Success Criteria
- [ ] `pnpm --dir app run typecheck` pass.
- [ ] Tạm set 1 lab bất kỳ (hoặc test fixture) `diagram.component='VictoriaLogsPlayground'` → render shell 3 sub-tab, không lỗi console.
- [ ] SEE slot (walkthrough) + TRY IT slot (quiz/flashcards) hiển thị đúng trong shell.
- [ ] `?textMode=1` → fallback text (walkthrough + try-at-home) vẫn đầy đủ.
- [ ] Mọi file mới <200 dòng.

## Risk Assessment
- **Sai convention bố cục slot** → đọc kỹ playground pilot trước khi code (bước 1), không tự chế.
- **Mock data shape lệch** giữa Phase 3 (explorer) và Phase 4 (LogsQL) → định nghĩa shape 1 lần trong `vlogs-mock-data.ts`, cả 2 phase import.
