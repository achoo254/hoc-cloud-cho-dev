---
phase: 1
name: Sprint 1 — P0 bug bundle
status: not-started
priority: P0
effort: 1-2 ngày
---

# Phase 01 — P0 bug bundle

Đóng bug nền móng của state Progress trước khi thêm UX.

## Context Links

- [plan.md](./plan.md)
- Files chính: `server/api/progress-routes.js`, `server/db/models/progress-model.js`, `app/src/components/lab/lab-renderer.tsx`, `app/src/lib/hooks/use-progress.ts`, `app/src/lib/api.ts`

## Tasks

### T1 (verify) — opened_at type alignment

- **Status:** contract đã khớp (BE `progress-routes.js:36` trả Unix seconds; FE `api.ts:86` khai `number | null`)
- **Action:** chỉ cần thêm JSDoc ghi chú đơn vị ở `ProgressEntry` fields (đã có) + grep `opened_at` toàn app xem có chỗ nào parse sai (`new Date(opened_at)` thiếu `* 1000`)
- **Acceptance:** không còn caller nào đối xử opened_at như ISO string

### B1 — Tách firstOpenedAt ($setOnInsert) vs lastOpenedAt ($set)

- **File:** `server/db/models/progress-model.js`, `server/api/progress-routes.js:67-77`
- **Status hiện tại:** `openedAt` đã dùng `$setOnInsert` (đúng "first opened"). Thiếu `lastOpenedAt`.
- **Change:**
  - `progress-model.js`: thêm field `lastOpenedAt: Date`
  - `progress-routes.js` POST: bổ sung `$set: { lastOpenedAt: new Date() }` (luôn update)
  - GET route: trả thêm `last_opened_at` (seconds)
  - `api.ts` `ProgressEntry`: thêm `last_opened_at?: number | null`
- **Invariant:** `openedAt` set-once; `lastOpenedAt` = mỗi lần mount lab
- **Acceptance:** mở 1 lab 3 lần → `openedAt` giữ nguyên, `lastOpenedAt` tăng

### F1 — Chỉ fire opened-mark khi chưa có entry.opened_at

- **File:** `app/src/components/lab/lab-renderer.tsx:216-227`
- **Hiện tại:** `openedRef` guard StrictMode (OK), nhưng vẫn fire `update({...})` mỗi lần user vào lab khác rồi quay lại (vì mỗi mount = ref mới).
- **Change:** chỉ `update({ completed_at: null, quiz_score: null })` nếu `entry?.opened_at == null`. Với B1 thêm `lastOpenedAt`, vẫn cần ping 1 call/mount nhưng payload đổi thành `{ touch: true }` hoặc call riêng endpoint `/api/progress/touch`.
- **Chọn hướng:** **touch endpoint** — POST `/api/progress/touch` body `{ lab_slug }`, BE chỉ update `lastOpenedAt + $setOnInsert openedAt`. Tách khỏi upsert chính để tránh confuse payload.
- **Acceptance:** Network tab → mỗi mount có 1 call `/touch`, không call `/api/progress` khi chưa có quiz/flashcard action

### F2 — Fix race quiz + flashcard mutation

- **File:** `app/src/components/lab/lab-renderer.tsx:229-234, 301-306`, `app/src/lib/hooks/use-progress.ts:59-70`
- **Hiện tại:** 2 call `update()` riêng biệt cùng `mutationKey ['progress', labSlug]` → React Query dedupe cái sau, nhưng patch sau override field (nếu user hoàn thành flashcard rồi làm quiz full điểm, call flashcard `{ quiz_score: null }` có thể overwrite).
- **Change (3 bước):**
  1. `use-progress.ts`: trong `mutationFn`, merge patch với `entry` hiện tại trước khi gửi — nếu `patch.quiz_score === null` và `entry.quiz_score != null`, giữ `entry.quiz_score`. Tương tự cho `completed_at`.
  2. Hoặc simpler: đổi API semantics → null = "không đổi" (không gửi field), chỉ gửi field có giá trị. `upsertProgress` đã check `!= null`.
  3. Sửa callsite `onAllMastered` không gửi `quiz_score: null`, chỉ gửi `{ completed_at }`. Tương tự `handleQuizScore` khi score < full chỉ gửi `{ quiz_score }`.
- **Chọn:** bước 2+3 — sạch hơn, không cần client-side merge phức tạp.
- **Acceptance:**
  - Quiz full → flashcard mastered: entry có cả `quiz_score` và `completed_at`, không mất field nào
  - Flashcard mastered trước → quiz partial: `completed_at` giữ (vì `$min`), `quiz_score` được set

## Implementation order

1. T1 verify (5 min grep)
2. B1 BE + api.ts type (30 min)
3. F1 thêm `/touch` endpoint + sửa lab-renderer (30 min)
4. F2 sửa API semantics + callsites (45 min)

## Todo

- [ ] Grep codebase cho `opened_at` usage sai đơn vị
- [ ] Add `lastOpenedAt` field + index in `progress-model.js`
- [ ] Update POST `/api/progress` to `$set: lastOpenedAt`
- [ ] Add GET response `last_opened_at`
- [ ] Add `POST /api/progress/touch` route
- [ ] Update `api.ts`: `ProgressEntry.last_opened_at`, `touchProgress()` helper
- [ ] Update `use-progress.ts`: remove null-override bug (chỉ gửi field có giá trị)
- [ ] Update `lab-renderer.tsx`: gọi `/touch` mount, sửa 2 call `update()` không gửi null
- [ ] Smoke test: mở lab → quiz full → refresh → stepper 100%

## Risk

- Thêm field `lastOpenedAt` = schema change; không cần migration vì mongoose auto-cast null cho doc cũ
- Endpoint `/touch` mới phải qua `requireAuth` hoặc dùng `userUuid` — giữ nhất quán với POST `/api/progress` (hiện requireAuth). Guest không có progress write → OK, `/touch` cũng chỉ cho authed user

## Success criteria

- Mount lab 3 lần: `openedAt` không đổi, `lastOpenedAt` luôn tăng
- Race quiz/flashcard không drop field
- Không còn caller nào xử `opened_at` như string

## Next

Phase 02 — UX feedback (F3-F6).
