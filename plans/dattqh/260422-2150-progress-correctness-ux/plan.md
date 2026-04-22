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

## Audit đầu vào (codebase check 2026-04-22 22:30)

| Item | Trạng thái thực tế | Ghi chú |
|------|--------------------|---------|
| B2 `$min` completedAt | **DONE** | `server/api/progress-routes.js:70` — skip |
| T1 opened_at type | **DONE** | BE trả Unix seconds (line 36), FE khai `number \| null` (`api.ts:86`). Chỉ cần grep caller dùng sai đơn vị |
| Sonner install | **DONE** | `app/package.json` có `sonner: ^1.7.4` |
| Toaster mount | **DONE** | `root-layout.tsx:69` `<Toaster richColors closeButton position="bottom-right" />` — F6 chỉ cần wire `toast()` vào mutation callback |
| Router v7 data API | **READY** | `App.tsx` dùng `createBrowserRouter` (react-router-dom ^7.2.0) — F10 `loader` khả thi ngay |
| Terminal code merge | **LANDED** | Commit `7e73c1b`. WebTerminal đăng ký trong `diagrams/registry.ts:56`, render qua PlaygroundSection — KHÔNG chạm header/footer JSX của progress |
| pnpm migration | **ĐANG DỞ** | `package.json` đã có `packageManager: pnpm@10.30.3`, nhưng `.github/workflows/deploy.yml` chưa commit |
| DueSection dashboard | **EXISTS** | `components/dashboard/due-section.tsx` (SM2 due flashcards). RecentActivitySection F7 KHÔNG trùng — đó là "lab đang dở", khác "card SM2 tới hạn" |
| `/api/progress/migrate` caller FE | **KHÔNG CÓ** | Endpoint BE tồn tại nhưng `grep migrate app/src/` = 0 match. Wire trigger phải thêm mới trong AuthContext — chuyển sang B6 phase-04 |

**Scope delta so với bản cũ:**
- Phase-02 F6 giảm: bỏ install + mount, còn wire
- Phase-03 F10 không cần refactor router, thêm loader thuần
- Phase-04 B6 mở rộng: thêm wire FE migrate caller (AuthContext) — trước giờ endpoint dead

## Phases

| # | Sprint | File | Scope | Status |
|---|--------|------|-------|--------|
| 1 | Sprint 1 — P0 bug bundle | [phase-01-p0-bug-bundle.md](phase-01-p0-bug-bundle.md) | B1, F1, F2 (+T1 verify) | done |
| 2 | Sprint 2 — UX feedback (hướng A) | [phase-02-ux-feedback.md](phase-02-ux-feedback.md) | F3, F4, F5, F6 (wire-only) | done |
| 3 | Sprint 3 — Recent activity + prefetch | [phase-03-recent-activity-prefetch.md](phase-03-recent-activity-prefetch.md) | F7, F10, B4 | not-started |
| 4 | Sprint 4 — Hardening | [phase-04-hardening.md](phase-04-hardening.md) | B6 (+FE wire), X1-X3, D1 | not-started |

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
