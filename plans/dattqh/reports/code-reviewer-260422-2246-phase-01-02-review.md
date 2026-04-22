---
date: 2026-04-22
phase: 01+02
reviewer: code-reviewer
---

# Code Review — Phase 01 + 02 (Progress correctness + UX feedback)

**STATUS: DONE_WITH_CONCERNS**

---

## Critical Issues (Blocking)

### C1 — `/touch` silently no-ops for guest users (security + correctness)

`POST /api/progress/touch` có `requireAuth` → guest nhận 401. Lab-renderer gọi `touch()` mù quáng sau mount; `touchMutation.onError` không có handler (không toast, không log). Kết quả: guest mount lab → 401 bị nuốt im lặng, `openedAt` không bao giờ được set cho guest.

**Quan trọng hơn:** `/api/progress` GET dùng `userUuid` cho guest, nhưng `/touch` bị chặn 401 → inconsistency: guest có thể có quiz progress nhưng không bao giờ có `openedAt`. Stepper node 1 luôn muted với guest.

**Fix:** Hoặc (a) cho `/touch` fallback sang `userUuid` khi không authed (giống POST `/api/progress/migrate` pattern), hoặc (b) trong `touchMutation` thêm `onError` bỏ qua 401 (acceptable nếu guest-write intentionally blocked).

---

## High Priority (Non-blocking nhưng cần fix)

### H1 — `syncStatus` không reflect `touchMutation` state

`syncStatus` chỉ derived từ `mutation` (upsert). `touchMutation` pending/error không ảnh hưởng badge. Nếu `/touch` fail (network lỗi), user thấy idle — không biết `openedAt` chưa được lưu. Acceptable nếu touch-failure là silent-best-effort, nhưng cần document ý định rõ.

### H2 — `POST /api/progress` không cập nhật `lastOpenedAt`

Khi user authed gọi `POST /api/progress` (quiz/flashcard), `lastOpenedAt` không được `$set`. Chỉ `/touch` mới bump. Nếu user làm quiz mà tab cũ đã mount `/touch` thành công thì OK, nhưng nếu session fresh chỉ có quiz call (ví dụ API test, hay component mount lỗi không fire touch), `lastOpenedAt` sẽ bị stale. Plan B1 nói "POST cũng `$set: lastOpenedAt`" nhưng code hiện tại không có.

---

## Suggestions (Non-blocking)

### S1 — CompletionBanner: prev-ref logic đúng, có 1 edge case nhỏ

Logic `prevCompletedRef.current === undefined` để skip lần settle đầu là đúng. Edge case: nếu `isLoading` lâu (SSR hydration, network chậm) và `entry` vẫn `null` sau nhiều re-renders → `curr` = null → ref được set = null. Sau đó khi data về với `completed_at` đã có sẵn → `prevCompletedRef = null, curr = value` → banner sai fire. Xác suất thấp (query staleTime 5 phút che phần lớn) nhưng cold-cache + slow network có thể trigger. **Fix:** chỉ ghi ref sau khi `!isLoading`.

### S2 — `handleQuizScore` so sánh `score === lab.quiz.length` nhưng không guard `lab.quiz` empty

Nếu `lab.quiz = []` (fixture thiếu) → `score === 0` → `update({ completed_at, quiz_score: 0 })` — lab instantly "completed" với quiz_score 0. Không crash nhưng data misleading. Guard: `if (lab.quiz.length > 0 && score === lab.quiz.length)`.

### S3 — `migrate` endpoint dùng `$min` cho `openedAt` nhưng `/touch` dùng `$setOnInsert`

Inconsistency giữa hai path: migrate giữ earliest `openedAt`, nhưng nếu sau này `touch` được gọi trước migrate, `$setOnInsert` giữ touch timestamp (là after-migration). Không bug hiện tại vì migrate chỉ chạy một lần sau login, nhưng nên ghi chú trong code.

### S4 — `useEffect([], [])` trong `lab-renderer.tsx` disable exhaustive-deps

`touch` từ `useProgress` là stable ref (wrapped `mutationFn`), nhưng `// eslint-disable-next-line` che potential bug nếu future refactor làm `touch` unstable. Low risk, nên thêm comment giải thích tại sao deps intentionally empty.

---

## Correctness Verification

| Check | Result |
|---|---|
| `$setOnInsert openedAt` — set-once | OK |
| `$set lastOpenedAt` trên `/touch` | OK |
| `$min completedAt` — earliest wins | OK |
| F2 race fix — chỉ gửi field có value | OK, cả hook lẫn callsite đều đúng |
| Banner không replay on reload | OK — `prevCompletedRef = undefined` guard đúng, trừ edge case S1 |
| StrictMode double-mount guard | OK — `openedRef.current` ref |
| Input validation `SLUG_RE` trên `/touch` | OK |
| No PII leak trong GET response | OK |

---

## Unresolved Questions

1. **Guest write intent** cho `/touch`: intentionally blocked hay oversight? Nếu blocked → cần document; nếu oversight → cần fix (C1).
2. **`lastOpenedAt` trên main POST**: plan B1 có ghi "bổ sung `$set: lastOpenedAt`" nhưng code bỏ qua — intentional hay missed?
