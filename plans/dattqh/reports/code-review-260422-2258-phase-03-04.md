# Code Review — Phase 03 + 04 (B4, F7, F10, B6, D1)

**Date:** 2026-04-22 | **Reviewer:** code-reviewer agent  
**Scope:** `progress-model.js`, `migration-batch-model.js`, `progress-routes.js` (migrate), `recent-activity-section.tsx`, `dashboard-layout.tsx`, `query-client.ts`, `App.tsx`, `api.ts`, `auth-context.tsx`

---

## Critical Issues

### C1 — BE trả 202 nhưng `request()` wrapper ném `ApiError` [BLOCKING]

`POST /api/progress/migrate` trả `200 ok:true status:'in_progress'` với **HTTP 202** khi batch đang pending. `request()` chỉ bypass 204; mọi status 202 đều `res.ok === true` (2xx) nên thực ra không ném lỗi — nhưng response body vẫn parse đúng và `runMigrateProgress()` check `res.status === 'in_progress'` hoạt động.

**Tuy nhiên:** FE không có retry schedule khi nhận `in_progress`. Chú thích code nói "caller retries later" nhưng không có setTimeout/retry loop — nếu server crash giữa bulkWrite, FE chỉ giữ batchId trong localStorage và chờ lần login **kế tiếp** mới retry. Đây là hành vi được chấp nhận theo thiết kế (best-effort), nhưng comment trong `runMigrateProgress()` nói "sẽ thử lại" (trong toast.error) mà thực ra chỉ retry khi auth trigger lần sau. **Không block nếu behaviour này đã được chấp nhận**, nhưng cần xác nhận.

**Verdict:** Non-blocking nếu "retry on next login" là spec. Làm rõ comment hoặc toast message.

---

## High Priority

### H1 — `deriveResumeAnchor`: logic không khớp comment [BUG]

Code trong `recent-activity-section.tsx:25-30`:
```ts
if (!entry.opened_at) return '#section-think'
if (entry.quiz_score == null) return '#section-quiz'
if (!entry.completed_at) return '#section-flashcards'
return '#section-commands'
```

Phase-03 spec ghi:
> `!quiz_score` → `#section-quiz`; `quiz_score && !completed_at` → `#section-flashcards`

Code dùng `quiz_score == null` (null/undefined check) thay vì falsy check. Điều này **đúng hơn spec** (score = 0 vẫn coi là "đã làm quiz"). Nhưng comment trên hàm nói `quiz done → #section-flashcards` — **inconsistency nhỏ**: nếu quiz_score = 0 thì đã có quiz nhưng completion chưa set → đúng khi đưa vào flashcards. Logic OK nhưng comment hơi confusing.

**Verdict:** Logic correct, làm rõ comment `quiz_score == null` = "chưa làm quiz lần nào".

### H2 — `bulkWrite` partial failure không được surface rõ

Sau `bulkWrite(..., { ordered: false })`, nếu một số ops fail (e.g., duplicate key ngoài idempotent ops), BE vẫn mark batch `completed` và trả `imported = bulkOps.length` (số *chuẩn bị* ghi, không phải số *thực sự* ghi thành công).

Mongo `bulkWrite` trả `result.nUpserted + result.nModified`; code không check con số này. `imported` count có thể bị inflate so với thực tế.

**Fix:** `const result = await Progress.bulkWrite(...)` → `imported = result.upsertedCount + result.modifiedCount`.

### H3 — `queryKey: ['progress']` hardcoded ở nhiều chỗ, không dùng constant

`auth-context.tsx` dùng `['progress']` literal (lines 87, 113, 129, 148); `dashboard-layout.tsx` line 49 cũng dùng literal. `PROGRESS_QUERY_KEY` đã export từ `use-progress.ts` nhưng không được import ở 2 file trên → drift risk khi key thay đổi.

---

## Medium Priority

### M1 — `openedAt` không được migrate vào $setOnInsert của bulkWrite

Trong migrate bulkWrite (`progress-routes.js:184`):
```js
$setOnInsert: { userId: user._id, labSlug: row.labSlug }
```
`openedAt` từ guest row được đưa vào `$min` (correct). Nhưng nếu user **chưa có doc** cho slug này, `$setOnInsert` không set `openedAt` — `$min` sẽ set nó vì upsert doc mới không có field sẵn. Điều này **đúng về kết quả cuối**, nhưng khác với pattern ở `/touch` và `POST /api/progress` (cả 2 đặt `openedAt` vào `$setOnInsert`). Consistency thấp; minor.

### M2 — `nowSec` tính tại render time, không memo

`recent-activity-section.tsx:94` tính `nowSec = Math.floor(Date.now() / 1000)` ở render body — mỗi re-render có giá trị khác nhau nhưng không trigger re-render theo thời gian. Relative time hiển thị ("2 giờ trước") sẽ stale cho đến khi component re-render vì lý do khác. Chấp nhận được cho MVP nhưng cần ghi chú.

### M3 — `items.slice()` dư thừa

`recent-activity-section.tsx:85`: `.filter(...)` luôn trả array mới, `.slice()` tiếp theo không cần thiết trước `.sort()`. YAGNI.

---

## Low Priority

### L1 — `MigrationBatch` thiếu `failed` status

Schema chỉ có `pending | completed`. Phase-04 plan đề cập `failed` state cho self-heal job (backlog). Nếu triển khai cron sau, sẽ phải migration schema. Minor vì deferred.

### L2 — UUID_V4_RE variant bits chỉ check `[89ab]` — đúng spec nhưng không check `crypto.randomUUID` output

`crypto.randomUUID()` luôn sinh UUID v4 RFC-compliant; regex đủ. OK.

---

## Positive Observations

- 2-phase pattern cho Mongo standalone là lựa chọn đúng và được document rõ trong model comment.
- FE batchId persisted localStorage + retry on next auth trigger là thiết kế thực dụng, đúng YAGNI.
- `bulkWrite` unordered + idempotent ops (`$setOnInsert` + `$min`) đảm bảo re-run an toàn.
- `prefetchProgress` swallow error sạch — không block navigation.
- `deriveResumeAnchor` export riêng, testable độc lập.
- Guard `!uuid` early-return (no guest cookie = no-op) tránh query thừa.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 (C1 non-blocking nếu UX accepted) |
| High | 3 |
| Medium | 3 |
| Low | 2 |

**Recommended fixes trước merge:**
1. **H2** — dùng `result.upsertedCount + result.modifiedCount` thay vì `bulkOps.length` cho `imported`
2. **H3** — import `PROGRESS_QUERY_KEY` constant vào `auth-context.tsx` và `dashboard-layout.tsx`
3. **C1** — làm rõ toast message: "sẽ thử lại lần đăng nhập sau" thay vì "sẽ thử lại" (mơ hồ)

---

**Status:** DONE_WITH_CONCERNS | **Summary:** Implementation solid, 2-phase pattern correct, FE/BE contract match. 3 high-priority issues cần fix trước production: imported count inflate (H2), queryKey literal drift (H3), misleading toast UX (C1). | **Concerns:** H2 (imported count sai khi partial bulkWrite failure) và H3 (queryKey drift) nên fix trước khi ship.
