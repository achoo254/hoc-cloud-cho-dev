---
phase: 3
title: Frontend UI
status: completed
priority: P2
effort: 3h
dependencies:
  - 2
---

# Phase 3: Frontend UI

## Overview
Nav "Bài Tập" (owner-only) + route `/exercises` (catalog) + `/exercise/:slug` (renderer nhẹ: Đề bài → Hướng dẫn → Demo). KHÔNG tái dùng lab-renderer.

## Requirements
- Functional: owner thấy nav "Bài Tập" → catalog list → detail render 3 khối (brief, guide[], demo[]). Non-owner: không thấy nav; vào URL trực tiếp → "không có quyền" (API 401/403).
- Non-functional: lazy-load route (như App.tsx hiện tại); responsive; theme-aware (tái dùng Card/Badge shadcn).

## Architecture
- Owner check FE: `auth-context` cung cấp user; so `user?.email` với `import.meta.env.VITE_OWNER_EMAIL`. Helper `useIsOwner()` (hoặc field trong auth-context).
- API client: thêm `getExercises()` / `getExercise(slug)` + types trong `app/src/lib/api.ts` (mẫu `getLabs`/`getLab`). Xử lý 401/403 → trả lỗi để route hiện empty/forbidden state.
- Renderer riêng: brief (HTML qua dangerouslySetInnerHTML như lab why), guide list (step + instruction + code block command), demo list (step + what + command + output `<pre>` + note). Tái dùng style code block của lab.

## Related Code Files
- Create: `app/src/routes/exercises.tsx` (catalog), `app/src/routes/exercise-viewer.tsx` (detail), `app/src/components/exercise/exercise-renderer.tsx`, `app/src/components/exercise/exercise-catalog-grid.tsx`
- Modify: `app/src/App.tsx` (2 lazy route), `app/src/components/layout/site-header.tsx` (nav owner-only), `app/src/lib/api.ts` (fetchers + types), `app/src/contexts/auth-context.tsx` (expose isOwner — hoặc helper hook riêng)
- Read for context: `app/src/routes/lab-viewer.tsx`, `app/src/components/dashboard/lab-catalog-grid.tsx`, `app/src/components/lab/lab-renderer.tsx` (chỉ tham khảo style code/callout), `app/src/contexts/auth-context.tsx`

## Implementation Steps
1. `api.ts`: type `ExerciseIndexEntry` + `ExerciseContent` (snake_case khớp toExerciseContent); `getExercises()`, `getExercise(slug)` (fetch `/api/exercises*`, credentials include cookie).
2. `auth-context.tsx`: thêm `isOwner` = `!!user && user.email?.toLowerCase() === (import.meta.env.VITE_OWNER_EMAIL||'').toLowerCase()` (expose qua context value hoặc hook `useIsOwner`).
3. `site-header.tsx`: render `<Link to="/exercises">Bài Tập</Link>` chỉ khi `isOwner`.
4. `exercise-catalog-grid.tsx`: grid Card (title, topic, tags, estimated_minutes) → link `/exercise/:slug`. Mirror nhẹ lab-catalog-grid (bỏ progress/status badge).
5. `exercises.tsx`: fetch getExercises; nếu lỗi 401/403 → hiện "Mục này chỉ dành cho owner"; else render grid.
6. `exercise-renderer.tsx`: 3 section — **Đề bài** (brief HTML), **Hướng dẫn thực hiện** (guide steps: instruction + optional command code block), **Demo thực tế** (demo steps: what + command + output `<pre>` + note + optional screenshot). References list cuối.
7. `exercise-viewer.tsx`: fetch getExercise(slug) → ExerciseRenderer; xử lý 404/403.
8. `App.tsx`: thêm `{ path: 'exercises', element: <ExercisesPage /> }` + `{ path: 'exercise/:slug', element: <ExerciseViewerPage /> }` (lazy import).

## Success Criteria
- [ ] `pnpm --dir app run typecheck` pass.
- [ ] Owner (VITE_OWNER_EMAIL khớp) thấy nav "Bài Tập"; non-owner không thấy.
- [ ] `/exercises` render catalog; `/exercise/:slug` render brief + guide + demo.
- [ ] Non-owner vào `/exercise/:slug` → forbidden state (API 403), không crash.

## Risk Assessment
- `VITE_OWNER_EMAIL` build-time, lộ trong bundle — chấp nhận (chỉ email, bảo mật thật do API). Note ở Phase 5.
- FE check chỉ ẩn UI — KHÔNG phải bảo mật; đảm bảo Phase 2 API enforce (defense-in-depth).
- Tránh import lab-renderer (coupling) — renderer riêng tối giản.
