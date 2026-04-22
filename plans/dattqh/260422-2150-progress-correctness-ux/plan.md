---
name: Progress correctness + UX hardening
slug: progress-correctness-ux
created: 2026-04-22
owner: dattqh
status: in-progress
priority: P0
blockedBy: []
blocks: []
---

# Progress correctness + UX hardening

Đóng P0 bug của state `Progress` (firstOpenedAt, quiz race), rebuild UX feedback (stepper, sync badge, completion banner, toast), thêm recent activity + prefetch, và hardening cuối (rate-limit, migrate tx, tests, docs).

## Audit đầu vào

Bảng brainstorm có 2 item đã xong trong code hiện tại:

| Item | Brainstorm đề xuất | Trạng thái thực tế |
|------|--------------------|--------------------|
| B2   | `$min` cho `completedAt` | **DONE** ở `progress-routes.js:70` — skip |
| T1   | Thống nhất `opened_at` type | **DONE** — BE trả `number` seconds (line 36), FE type `number \| null` (api.ts:86). Chỉ cần verify thêm Zod parse ở T2 |

Các task còn lại vẫn áp dụng.

## Phases

| # | Sprint | File | Scope | Status |
|---|--------|------|-------|--------|
| 1 | Sprint 1 — P0 bug bundle | [phase-01-p0-bug-bundle.md](phase-01-p0-bug-bundle.md) | B1, F1, F2 (+T1 verify) | not-started |
| 2 | Sprint 2 — UX feedback (hướng A) | [phase-02-ux-feedback.md](phase-02-ux-feedback.md) | F3, F4, F5, F6 | not-started |
| 3 | Sprint 3 — Recent activity + prefetch | [phase-03-recent-activity-prefetch.md](phase-03-recent-activity-prefetch.md) | F7, F10, B4 | not-started |
| 4 | Sprint 4 — Hardening | [phase-04-hardening.md](phase-04-hardening.md) | B6, X1-X3, D1 | not-started |

## Backlog (P2, out of scope cho 4 sprint trên)

| ID | Mô tả | Lý do defer |
|----|-------|-------------|
| B3 | Validate `quiz_score` theo `lab.quiz.length` | Hiện clamp 0-100 đủ an toàn; cần lookup lab, phức tạp hoá POST |
| B5 | Rate-limit POST progress | **Dropped** theo quyết định user (không cần). Revisit nếu phát hiện abuse. |
| B7 | TTL / cleanup guest progress > 90 ngày | Chưa đo traffic, chưa thấy pressure |
| B8 | Log/metric writes/user/day | Depends on observability stack chưa quyết |
| F8 | Skeleton stepper + recent activity | Phụ thuộc F3/F7 ship trước |
| F9 | Retry button khi mutation error | React Query default + sonner toast ở F6 đã đủ ban đầu |
| T2 | Zod schema `ProgressEntry` FE parse | Low ROI khi BE đã có schema cứng |
| T3 | Shared type BE/FE | Cần setup build pipeline cho shared package |
| X4 | BE test concurrent POST → 1 doc | Unique index đã có, ưu tiên X1-X3 |
| D2 | Migration policy note | Merge vào D1 nếu có chỗ |

## Success criteria

- `openedAt` chỉ set 1 lần; stepper thể hiện đúng 3 mốc Opened / Quiz / Completed kèm nhãn
- User thấy phản hồi đồng bộ (SyncBadge, toast, banner) thay vì im lặng
- Dashboard có "Việc tiếp theo" (recent activity) deeplink tới section dở dang
- Migrate guest→user chạy trong transaction, idempotent
- Unit + integration + e2e smoke cover các path P0

## Risk

- F2 merge client-side dễ viết sai → dùng chung 1 `update()` call nhiều field thay vì 2 call riêng biệt
- B6: Mongo **standalone** (không replica) → KHÔNG dùng transactions, thay bằng 2-phase batch record + idempotent batchId. Xem phase-04.
- F7 recent activity cần API mới `/api/progress/recent?limit=5` — xem phase-03

## Next steps

Bắt đầu phase-01. Sau mỗi phase, cập nhật `status` ở bảng trên.
