---
phase: 08
title: Docs Update — README + labs/README
status: pending
effort: 0.5d
depends_on: [01, 02, 03, 04, 05, 06, 07]
---

## Goal

Cập nhật 2 file README + `docs/` reflect kiến trúc mới. Xóa mọi reference tới theory CMS. Thêm 4 chân kiềng Deploy-Ready + hướng dẫn schema v2.

## Files to MODIFY

### `README.md` (top-level)

**Thay đổi:**
- Mục 4 "Triết lý WHY-first" → đổi title **"Triết lý Deploy-Ready"** với 4 chân kiềng (bảng WHY/BREAKS/OBSERVE/DEPLOY)
- Mục 6 Cấu trúc repo → cập nhật server/ mới (bỏ admin/auth/content, thêm api/)
- Thêm mục mới "🔍 Search + Progress" giải thích tính năng search global + progress sync
- Thêm mục "🎯 Positioning" ngắn: "dev deploy-ready — không phải hiểu để đọc, mà hiểu để deploy"
- Bỏ mọi mention theory/CMS/OAuth/admin

### `labs/README.md`

**Thay đổi:**
- Mục "Viết 1 lab mới" → cập nhật schema v2 đầy đủ với `whyBreaks` / `observeWith` / `deploymentUse` / `misconceptions` / `dependsOn` / `enables` / `vpsExercise`
- Schema JSON reference → copy từ `plans/dattqh/260419-1048-why-schema-v2/schema-v2-design.md` §1
- Mục "Nguyên tắc WHY-first" → **"Nguyên tắc Deploy-Ready (4 chân kiềng)"** với bảng 4 trường bắt buộc
- Thêm mục "Toggle 4 lớp WHY" — giải thích 4 nút ẩn WHY/BREAKS/OBSERVE/DEPLOY độc lập
- Thêm mục "Search" — `/` focus, keyboard shortcut
- Thêm mục "Progress sync" — anonymous UUID cookie, multi-device

### `docs/project-overview-pdr.md`

Nếu file này chứa reference theory → xóa các section đó. Thêm section mô tả positioning deploy-ready + 4 chân kiềng.

## Files to ADD (optional)

### `docs/labs-schema-v2-reference.md`

Quick reference 1 trang cho schema v2 — dùng khi viết lab mới. Copy + rút gọn từ `plans/dattqh/260419-1048-why-schema-v2/schema-v2-design.md`.

**Chỉ làm nếu user thấy cần.** Mặc định skip — labs/README đủ rồi (YAGNI).

## Steps

1. Mở README top-level → edit mục 4 (triết lý), mục 6 (cấu trúc), bỏ theory
2. Mở `labs/README.md` → rewrite mục "Viết 1 lab mới" + "Nguyên tắc"
3. Check `docs/project-overview-pdr.md` có mention theory không → xóa
4. Grep `git grep -iE "theory|admin|oauth"` trong tất cả docs/*.md + README — 0 match
5. Render preview: mở README trên GitHub preview hoặc VS Code markdown preview → check render OK
6. Link check: tất cả link trong README trỏ đúng file còn tồn tại

## Acceptance Criteria

- [ ] `git grep -iE "theory|admin-guard|github-oauth|admin/routes|adminRoutes"` trong `README.md` + `labs/README.md` + `docs/*.md` = 0 match
- [ ] README top-level mục "Triết lý" nói về 4 chân kiềng với bảng
- [ ] `labs/README.md` có schema v2 đầy đủ (whyBreaks/observeWith/deploymentUse/misconceptions)
- [ ] Link trong README không có broken (file references đúng)
- [ ] Dev mới đọc README + labs/README → hiểu được cách viết 1 lab v2 từ zero

## Risks

| Risk | Mitigation |
|------|------------|
| Xóa quá tay, mất context lịch sử | Git history giữ — không cần archive |
| README quá dài sau khi thêm mục | Rút gọn mục khác (ví dụ "Lộ trình học" gộp) |
| Schema doc drift giữa labs/README và plan files | Labs/README là single source of truth; plan files là ghi chú lịch sử |

## Out-of-scope

- Viết blog post / tutorial external
- Translate README sang tiếng Anh
- Diagram kiến trúc mới (mermaid) — nếu cần, user tự request
- Screenshot UI
