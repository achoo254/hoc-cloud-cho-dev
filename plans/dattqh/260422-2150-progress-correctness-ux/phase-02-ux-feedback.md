---
phase: 2
name: Sprint 2 — UX feedback (hướng A)
status: done
priority: P1
effort: 2-3 ngày (giảm từ 3-4 sau codebase audit)
---

# Phase 02 — UX feedback (hướng A)

User đang không thấy hệ thống phản hồi. Thêm 4 chỉ báo: stepper có nhãn, sync badge, completion banner, toast.

## Context Links

- [plan.md](./plan.md) · [phase-01](./phase-01-p0-bug-bundle.md)
- Files mới/sửa: `app/src/components/lab/progress-stepper.tsx` (new, thay `progress-bar.tsx`), `app/src/components/lab/sync-badge.tsx` (new), `app/src/components/lab/completion-banner.tsx` (new), `app/src/components/lab/lab-renderer.tsx`, `app/src/lib/hooks/use-progress.ts`
- **Sonner đã cài + mount** (`app/package.json` + `root-layout.tsx:69`) — không cần touch dep/layout

## Tasks

### F3 — ProgressStepper 3 mốc có nhãn

- **Replace:** `progress-bar.tsx` (single bar 33/66/100) → `progress-stepper.tsx`
- **Design:**
  - 3 node: `Đã mở` · `Đã làm quiz` · `Hoàn thành`
  - Mỗi node có icon + text label + timestamp tooltip (`opened_at`, `quiz_score`, `completed_at`)
  - Connector line giữa node: filled khi đạt
  - Responsive: mobile stack dọc, desktop ngang
- **Aesthetic:** không card/shadow thừa — dùng spacing + divider. Màu primary cho filled, muted cho pending. Dot filled: 8px; connector: 1px.
- **Acceptance:**
  - Lab chưa mở: 3 node muted
  - Quiz 100%, completed_at null: node 1+2 filled, node 3 pending
  - Hover timestamp hiện tooltip dạng `"2026-04-22 21:50"`

### F4 — SyncBadge cạnh header

- **New:** `app/src/components/lab/sync-badge.tsx`
- **Props:** `{ status: 'idle' | 'saving' | 'saved' | 'error' }`
- **Wire:** `use-progress.ts` expose `syncStatus` derived từ `mutation.isPending | mutation.isSuccess | mutation.isError` + debounce 500ms cho "saved" trước khi fade về idle
- **Render:** dot + text nhỏ `Đang lưu…` / `Đã lưu` / `Lỗi` · vị trí cạnh `<h1>` hoặc phải của stepper
- **Acceptance:**
  - Click quiz → badge flash `Đang lưu` ~200ms → `Đã lưu` 1s → idle
  - Tắt mạng → badge `Lỗi` + aria-live polite

### F5 — CompletionBanner sticky-bottom

- **New:** `app/src/components/lab/completion-banner.tsx`
- **Trigger:** `completed_at` chuyển từ null → value trong cùng session (dùng `useRef` lưu prev value)
- **UI:** sticky bottom, slide-up 200ms, dismiss btn, auto-hide sau 8s
- **Copy:** "Bạn đã hoàn thành lab **{labTitle}** — tiếp tục lab kế tiếp?" + CTA link sang recent activity hoặc lab list
- **KHÔNG modal:** brainstorm chốt no-modal. Sticky-bottom non-blocking.
- **Acceptance:**
  - Complete quiz full lần đầu → banner hiện
  - Reload trang đã completed → KHÔNG hiện banner (vì prev=value, curr=value)

### F6 — Toast sonner cho progress mutation error

- **Scope giảm (so bản cũ):** sonner đã install (`^1.7.4`) + Toaster đã mount tại `root-layout.tsx:69`. Chỉ wire `toast()` ở hook.
- **Wire trong `use-progress.ts`:**
  - `onError`: `toast.error('Không lưu được tiến độ — thử lại?')`
  - Special-case status 429 nếu sau này có rate-limit (hiện không có, skip)
- **Migrate success/fail toast:** chuyển sang B6 phase-04 — hiện FE KHÔNG có caller `/api/progress/migrate`, phải wire vào AuthContext sau login mới có trigger
- **Acceptance:**
  - Mutation fail → toast đỏ ở góc bottom-right
  - Multi-fail cùng slug → React Query retry 1 lần (default), toast 1 lần

## Implementation order

1. F6 wire (10 min) — chỉ `toast.error` trong `onError` của mutation
2. F4 (SyncBadge) — 1h, refactor `use-progress.ts` expose `syncStatus`
3. F3 (ProgressStepper) — 2-3h, replace progress-bar
4. F5 (CompletionBanner) — 1-2h

**Effort giảm:** 3-4 ngày → 2-3 ngày (bỏ install + mount + migrate caller chuyển sang phase-04)

## Todo

- [x] `use-progress.ts` expose `syncStatus` + wire `toast.error` ở `onError` (sonner + Toaster đã có sẵn)
- [x] Create `sync-badge.tsx`
- [x] Create `progress-stepper.tsx` (ref Magic UI stepper patterns, no Lucide-only icons)
- [x] Replace `<ProgressBar>` → `<ProgressStepper>` in `lab-renderer.tsx:248`
- [x] Delete `progress-bar.tsx` (grep callers first)
- [x] Create `completion-banner.tsx` with prev-value ref
- [x] Mount banner in `lab-renderer.tsx`
- [x] QA manual: mount/quiz/flashcard/offline toast path

## Design notes (anti-slop)

- **Font:** dùng font project hiện tại (check `app/src/styles`); không thay chỉ cho phase này
- **Color:** primary accent cho "done state", muted cho pending — KHÔNG gradient purple/blue
- **Motion:** Framer Motion `layoutId` cho stepper node filling; banner slide-up spring `{ stiffness: 260, damping: 24 }`
- **Typography:** stepper label dùng body font, tooltip timestamp dùng monospace
- **Density (dial=4):** giữ whitespace, label không khuất

## Risk

- Replace `progress-bar.tsx`: grep đã verify chỉ 3 callsite (`lab-renderer.tsx`, `progress-bar.tsx` chính nó, `use-progress.ts`). Không có test/Storybook ref → safe delete
- Lưu ý: WebTerminal render qua PlaygroundSection khi `lab.diagram.component === 'WebTerminal'`, CompletionBanner sticky-bottom ngoài scroll container của terminal để xterm.js FitAddon không bị reflow

## Success criteria

- User vào lab thấy rõ đang ở mốc nào
- Mọi action quiz/flashcard có feedback visual ≤ 1s
- Hoàn thành lab → banner celebration không chặn UI
- Mọi error sync có toast, không im lặng

## Next

Phase 03 — Recent activity + prefetch.
