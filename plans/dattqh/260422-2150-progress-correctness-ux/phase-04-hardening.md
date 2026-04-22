---
phase: 4
name: Sprint 4 — Hardening
status: not-started
priority: P1
effort: tuần sau (~4 ngày)
---

# Phase 04 — Hardening

Migrate idempotent, test coverage, docs. **B5 rate-limit đã drop theo quyết định user.**

## Context Links

- [plan.md](./plan.md) · [phase-03](./phase-03-recent-activity-prefetch.md)
- Files: `server/api/progress-routes.js`, `server/db/models/migration-batch-model.js` (new), `app/src/lib/hooks/use-progress.test.ts` (new), `server/api/progress-routes.test.js` (new), `tests/e2e/progress-happy-path.spec.ts` (new), `docs/system-architecture.md`

## Tasks

### ~~B5 — Rate-limit~~ (DROPPED)

Không làm theo quyết định user. Lý do: scale hiện tại chưa có vector abuse, trust authed user, giữ code sạch. Nếu sau có dấu hiệu spam → xem [Backlog] trong `plan.md`.

### B6 — Migrate idempotent + 2-phase batch record

- **File:** `server/api/progress-routes.js:82-135`, new `server/db/models/migration-batch-model.js`
- **Problem:** `bulkWrite` không atomic; crash giữa chừng → imported 1 phần, user không biết
- **Constraint:** Mongo standalone — KHÔNG dùng transactions. Dùng idempotent key + 2-phase batch record thay thế.
- **Change (2-phase pattern):**
  1. **Body schema:** `{ "batchId": "uuid-v4", "items": [...] }`
  2. **MigrationBatch model:** `{ userId, batchId, status: 'pending'|'completed', itemCount, startedAt, completedAt }`, unique index `(userId, batchId)`
  3. **Flow:**
     - Insert batch record với `status: 'pending'` — nếu duplicate key → đọc existing: `status === 'completed'` trả `already_applied`, `status === 'pending'` (in-flight hoặc crashed) trả `in_progress` + khuyên FE retry sau 5s
     - Chạy `bulkWrite` (unordered để tiếp tục khi lẻ tẻ fail)
     - Update batch `status: 'completed'`, lưu `completedAt` và số `imported`
     - Nếu bulkWrite throw: giữ batch `pending` + log — retry cùng batchId sẽ thấy `in_progress`
  4. **Self-heal job** (optional, backlog): cron scan batch `pending` > 10 phút → retry hoặc mark `failed`
- **Response:** `{ ok, imported, batchId, status: 'completed' | 'already_applied' | 'in_progress' }`
- **FE:** generate `crypto.randomUUID()` cho batchId, cache ở localStorage `progress_migration_batch` → replay safe; nhận `in_progress` → retry sau 5s với cùng batchId
- **Acceptance:**
  - Call `/migrate` 2 lần cùng batchId thành công → lần 2 trả `already_applied`, không insert dup trong `progresses`
  - Kill server giữa bulkWrite → restart, retry cùng batchId → resume (lần retry re-run bulkWrite; `$min` + `$setOnInsert` idempotent nên an toàn ghi lại)
  - Validate `batchId` regex UUID v4 trước khi dùng làm key

### X1 — Unit test use-progress.ts optimistic merge + rollback

- **File:** `app/src/lib/hooks/use-progress.test.ts` (Vitest + `@testing-library/react`)
- **Cover:**
  - Optimistic set đúng payload, rollback khi error
  - Concurrent mutation quiz + flashcard không drop field (validate F2 fix)
  - `syncStatus` transitions idle → saving → saved → idle (F4)
- **Setup:** mock `upsertProgress` với timers

### X2 — Integration test /api/progress/migrate

- **File:** `server/api/progress-routes.test.js` (Vitest với supertest hoặc hono's test util)
- **Setup:** mongo-memory-server (check existing dev deps; CI đã có ephemeral mongo theo git log `f0fa160d`)
- **Cases:**
  - Guest create progress → login → migrate → doc gộp đúng
  - Conflict: slug có cả 2 bên → `$min` giữ earliest `openedAt`, earliest `completedAt`
  - Replay cùng batchId → `already_applied`
  - Mỗi lab tối đa 1 doc per user sau migrate

### X3 — E2E smoke: happy path

- **File:** `tests/e2e/progress-happy-path.spec.ts` (Playwright — check `package.json` có chưa; nếu chưa, defer hoặc dùng `vitest` browser mode)
- **Scenario:**
  1. Login user
  2. Vào lab X
  3. Làm quiz full điểm
  4. Refresh
  5. Assert stepper = 100%, banner hiện, recent activity có X
- **Assertion timing:** wait for `[data-testid="sync-badge"]` = "Đã lưu" rồi refresh

### D1 — Document progress state-machine

- **File:** `docs/system-architecture.md` — add section "Progress state machine"
- **Content:**
  - Diagram: state → transitions (`unopened → opened → quiz_attempted → completed`)
  - Invariants:
    - `openedAt` set once (`$setOnInsert`)
    - `completedAt` = min(quiz_full_time, flashcard_mastered_time) (`$min`)
    - `lastUpdated` = mongoose auto
    - `completed_at = quiz-full OR flashcard-mastered` (rule định nghĩa "hoàn thành")
  - Table fields vs source of truth (FE vs BE)
  - Migration flow: guest (userUuid) → authed (userId) qua batchId idempotent
- **Length cap:** ~150 lines (docs.maxLoc = 800 tổng file)

## Implementation order

1. D1 (30 min, không block ai) — ship đầu để team đọc khi review code
2. B6 (3-4h) — batch model 2-phase + FE wire
3. X2 (2-3h) — integration test migrate (check B6 đúng)
4. X1 (2h) — unit test hook
5. X3 (2h) — e2e smoke

## Todo

- [ ] Viết section "Progress state machine" trong `docs/system-architecture.md`
- [ ] Tạo `server/db/models/migration-batch-model.js`
- [ ] Refactor `/api/progress/migrate` dùng batchId 2-phase (pending → completed), KHÔNG transaction vì Mongo standalone
- [ ] FE generate UUID batchId, lưu localStorage
- [ ] Viết X1 unit test
- [ ] Viết X2 integration test
- [ ] Viết X3 e2e smoke (check stack Playwright có chưa)
- [ ] Chạy `npm test` hoặc tương đương, pass 100%

## Risk

- Mongo standalone (không replica) → buộc dùng idempotent 2-phase, không transaction; phải đảm bảo bulkWrite re-run an toàn (đang OK nhờ `$setOnInsert` + `$min`)
- Rate-limit in-memory mất state khi restart — OK vì TTL 1 phút
- Playwright setup lớn — nếu chưa có trong repo, defer X3 sang sprint kế tiếp, giữ X1+X2

## Security considerations

- Idempotent batchId ngăn replay attack trên migrate
- Validate `batchId` là UUID v4 format trước khi dùng làm key
- Không có rate-limit → dựa vào `requireAuth` làm choke point; monitor DB metrics nếu thấy bất thường thì revisit

## Success criteria

- Migrate fail giữa chừng → retry thành công, không dup
- Test coverage P0 path đủ cho regression
- Docs đủ cho dev mới hiểu state machine trong <10 phút đọc

## Next

Đóng plan. Archive sang `/ck:plan archive` sau khi tất cả phase DONE. Xem backlog ở plan.md cho các item P2.
