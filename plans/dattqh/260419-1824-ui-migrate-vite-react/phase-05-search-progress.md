# Phase 05 — Search + Progress

**Status:** completed (2026-04-19) · **Effort:** 1d · **Priority:** P1 · **Depends on:** phase-02, phase-03, phase-04

## Completion notes

- SearchCommand dual-source (server FTS5 + minisearch fallback), Framer stagger
- `useHotkey(mod+k)` toàn app, `SearchContext` ở RootLayout
- `use-progress` cải tiến: staleTime 5m, mutationKey per-lab, optimistic
- LabRenderer mount guard qua `useRef+useEffect` (fix open item phase 02)
- FlashcardSM2 `onAllMastered` → POST completed_at
- SSE dev reload ở `/sse/reload` wired in `import.meta.env.DEV`
- dep: `minisearch`

## Goal

Wire Hono API (`/api/search` FTS5 + `/api/progress`) vào React app qua Command palette + React Query.

## Steps

### Search (Command palette)

1. **`<SearchCommand>`** (`components/search/search-command.tsx`):
   - shadcn `<Command>` + `<CommandDialog>`
   - Trigger: Ctrl+K / Cmd+K (hook `useHotkey`)
   - Debounced input (300ms) → 2 sources chạy song song:
     - **Server FTS5**: React Query `useQuery(['search', q])` → `GET /api/search?q=` (ranked, snippet highlight)
     - **Client-side fallback**: minisearch load `search-index.json` từ phase-03 (lazy load lần đầu) — dùng khi offline hoặc API fail
   - Merge results: server kết quả ưu tiên, fallback client khi server lỗi/timeout 1s
   - Render: lab title, snippet highlight, tags badge, dấu phân biệt source (FTS5 vs local)
   - Keyboard nav, Enter → navigate `/lab/:slug`

   **Lý do fallback:** user Ctrl+F workflow thường xuyên, offline/server-down không được mất khả năng tìm xuyên labs.

2. **Search result types** (`lib/schema-search.ts`): Zod parse response

3. Frame Motion: dialog fade+scale, result stagger

### Progress sync

4. **`useProgress()` hook** (expand từ phase-02):
   - `useQuery(['progress'])` GET `/api/progress` — stale 5min
   - `useMutation` POST `/api/progress` — optimistic update, rollback on error
   - Cookie UUID auto-handled bởi browser (Hono set)

5. **Progress integration points**:
   - `<LabRenderer>` mount → POST `{lab_slug, opened_at}`
   - `<QuizBlock>` complete → POST `{lab_slug, quiz_score}`
   - `<FlashcardSM2>` rating → POST `{lab_slug, completed_at}` nếu all cards mastered
   - Dashboard `<StatsSection>` đọc từ cùng query cache

### SSE dev reload (optional)

6. Nếu Hono dev có SSE `/api/reload` → React dev hook subscribe + `window.location.reload()` (chỉ dev mode)

## Files tạo mới

- `app/src/components/search/search-command.tsx`
- `app/src/lib/schema-search.ts`
- `app/src/lib/search-client.ts` (minisearch wrapper, lazy load `search-index.json`)
- `app/src/lib/hooks/use-hotkey.ts`
- (expand) `app/src/lib/hooks/use-progress.ts`

## Files không đụng

- `server/routes/search.ts`, `server/routes/progress.ts`

## Success criteria

- Ctrl+K mở palette < 100ms
- Search "vpc" trả result trong 500ms (FTS5)
- Progress POST optimistic, UI không flicker
- Offline: React Query cache giữ progress, retry khi online lại
- Heatmap/stats dashboard update ngay sau quiz complete

## Risks

- CORS: Vite dev proxy giải quyết, prod cùng domain (nginx reverse proxy) → OK
- Cookie UUID không gửi khi dev port khác 3000: proxy đảm bảo same-origin
- Race: multiple progress POST cùng lab_slug → Hono upsert handle, mutation key dedupe
