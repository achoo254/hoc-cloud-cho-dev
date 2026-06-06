---
phase: 2
title: API va owner auth
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 2: API va owner auth

## Overview
Middleware `require-owner` (chặn theo `OWNER_EMAIL`) + API `exercises-routes.js` (catalog + detail) owner-gated, mount vào server sau `sessionMiddleware`.

## Requirements
- Functional: `GET /api/exercises` (catalog), `GET /api/exercises/:slug` (detail, map camelCase→snake_case). Cả hai chỉ owner truy cập được.
- Non-functional: anon → 401; user khác (đăng nhập nhưng không phải owner) → 403; owner → 200. Bảo mật enforce ở API (không chỉ ẩn FE).

## Architecture
- `sessionMiddleware` (đã có) set `c.get('user') = { _id, firebaseUid, email, ... }`. `requireAuth` (đã có) → 401 nếu không có user.
- `requireOwner` (mới): đọc `OWNER_EMAIL` env (comma-separated allowlist), so `c.get('user')?.email`. Không match → 403.
- exercises routes là Hono sub-app; áp `.use('*', requireAuth, requireOwner)` ở đầu router → mọi route con owner-only.
- Phải verify thứ tự: `sessionMiddleware` chạy TRƯỚC khi tới exercises router (kiểm trong server.js).

## Related Code Files
- Create: `server/auth/require-owner.js`, `server/api/exercises-routes.js`
- Modify: `server/server.js` (mount exercisesRoutes; đảm bảo sessionMiddleware áp trước)
- Read for context: `server/auth/require-auth.js`, `server/auth/session-middleware.js`, `server/api/labs-routes.js` (mẫu toLabContent + Hono router), `server/server.js` (cách mount + apply middleware hiện tại)

## Implementation Steps
1. `server/auth/require-owner.js`:
   ```js
   const owners = (process.env.OWNER_EMAIL || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
   export const requireOwner = (c, next) => {
     const user = c.get('user');
     if (!user) return c.json({ error: 'unauthorized' }, 401);
     if (!owners.includes((user.email || '').toLowerCase())) return c.json({ error: 'forbidden' }, 403);
     return next();
   };
   ```
2. `server/api/exercises-routes.js` mirror `labs-routes.js`:
   - `toExerciseContent(doc)` map camelCase→snake_case: `estimated_minutes`, `content_hash`, `updated_at` (epoch s), giữ `guide/demo/references/topic/tags/source/brief`.
   - `toIndexEntry(doc)` cho catalog: `slug,title,topic,tags,estimated_minutes,updated_at`.
   - Router: `new Hono().use('*', requireAuth, requireOwner).get('/api/exercises', ...).get('/api/exercises/:slug', ...)` với `SLUG_RE` validate giống labs.
3. `server/server.js`: import + mount `exercisesRoutes` (đọc file xác định: sessionMiddleware đang áp global hay per-route; đảm bảo session chạy trước exercises router). Mount giống cách mount `labsRoutes`/`progressRoutes`.

## Success Criteria
- [ ] anon `curl /api/exercises` → 401.
- [ ] owner (session cookie hợp lệ, email khớp OWNER_EMAIL) → 200 + JSON `{exercises:[...]}`.
- [ ] user đăng nhập khác email → 403.
- [ ] `/api/exercises/:slug` map snake_case đúng (giống labs-routes).

## Risk Assessment
- **Điểm bảo mật chính**: nếu mount sai (requireOwner không áp), data lộ. Verify kỹ ở Phase 5 bằng 3 case 401/403/200.
- `OWNER_EMAIL` chưa set ở env → owners=[] → owner cũng 403. Phase 5 phải set env trước verify.
- Session lấy user qua cookie `sid`; test bằng curl cần cookie thật (hoặc test qua FE đã đăng nhập) — note ở Phase 5.
