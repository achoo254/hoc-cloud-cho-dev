---
phase: 8
title: Integration Verification
status: completed
priority: P1
effort: ''
dependencies:
  - 3
  - 4
  - 5
  - 6
  - 7
---

# Phase 8: Integration Verification

## Overview
Kiểm thử tích hợp toàn bộ: lab render với playground 3 mode, text-mode fallback, schema parse, Meili sync, catalog, build. Đảm bảo nhất quán lệnh giữa stepper/try_at_home/report. Cổng cuối trước khi user review.

## Requirements
- Functional: lab `victorialogs` mở được trên FE; 3 mode playground chạy; `?textMode=1` đầy đủ; catalog + search ra lab; build pass.
- Non-functional: không lỗi console; error boundary không bị kích hoạt; consistency lệnh/số liệu giữa các artifact.

## Related Code Files
- Read/verify only (không tạo mới): toàn bộ artifact Phase 1–7.

## Implementation Steps
1. `pnpm --dir app run typecheck` + `pnpm --dir app run build` → pass.
2. `pnpm run build:server` → bundle pass.
3. Chạy dev (`dev:server` + app), mở `/lab/victorialogs` (hoặc route lab tương ứng):
   - Mode 1: click box + animation + toggle topology.
   - Mode 2: chạy ≥5 preset LogsQL + 1 query sai → message lỗi.
   - Mode 3: nav 5 bước.
   - SEE (walkthrough) + TRY IT (quiz/flashcards/try-at-home) render trong shell.
4. `?textMode=1` → nội dung text đầy đủ, không phụ thuộc playground.
5. `/api/search?q=LogsQL` + `q=VictoriaLogs` → ra lab (Meili sync OK).
6. Consistency sweep: lệnh/port/version khớp nhau giữa walkthrough, try_at_home, pipeline stepper, report.
7. Reduced-motion: bật prefers-reduced-motion → animation tắt, vẫn dùng được.

## Success Criteria
- [ ] typecheck + build FE + bundle BE đều pass.
- [ ] 3 mode playground hoạt động đúng; SEE/TRY slot render.
- [ ] `?textMode=1` đầy đủ nội dung.
- [ ] Catalog + Meili search ra lab.
- [ ] Không lỗi console; error boundary không kích hoạt.
- [ ] Lệnh/số liệu nhất quán across playground + content + report.
- [ ] Reduced-motion OK.

## Risk Assessment
- **Lệch số liệu giữa artifact** → sweep bước 6 bắt buộc, sửa tại nguồn.
- **Meili down** → post-save hook fire-and-forget, không crash; verify riêng, không block lab render.
- **Playground crash** → error boundary đã có fallback text; xác nhận fallback đúng.
