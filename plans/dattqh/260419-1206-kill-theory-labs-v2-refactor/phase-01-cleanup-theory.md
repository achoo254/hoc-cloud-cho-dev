---
phase: 01
title: Cleanup Theory CMS
status: pending
effort: 0.5d
depends_on: []
---

## Goal

Xóa hẳn toàn bộ code theory CMS, OAuth, admin. Server chạy được với chỉ static + SSE reload + healthz.

## Context

Theory CMS được dựng ở plan `260419-1034-theory-cms-lms`. User chốt **KILL hẳn** (xem brainstorm `260419-1159-kill-theory-labs-v2-refactor`). Code ~8 module, sunk cost chấp nhận.

## Files to DELETE

```
server/admin/                        # routes.js + views/{dashboard,editor,login}.html
server/auth/                         # github-oauth.js + session-middleware.js + admin-guard.js
server/content/                      # markdown-renderer.js + callout-plugin.js + section-service.js
server/public/theory-routes.js
server/scripts/migrate-labs-to-md.js
server/scripts/verify-migration.js
labs/_shared/theory-reader.js
```

## Files to MODIFY

### `server/server.js`
Xóa các dòng:
- `import('./auth/session-middleware.js')`
- `import('./auth/github-oauth.js')`
- `import('./admin/routes.js')`
- `import('./public/theory-routes.js')`
- `import('./content/markdown-renderer.js').then((m) => m.ready())`
- `app.use('*', sessionMiddleware)`
- `app.route('/', oauthRoutes)`
- `app.route('/', adminRoutes)`
- `app.route('/', theoryRoutes)`
- Block `LAB_PHASE_TO_TOPIC` + handler redirect `/theory/*` (xóa hẳn, không giữ 301)

### `server/lib/csp-middleware.js`
Bớt directive liên quan theory render (ví dụ `script-src` cho Alpine CDN nếu có, `style-src` cho Shiki CSS, `form-action` cho GitHub OAuth callback).

### `package.json`
Remove deps chỉ dùng cho theory:
- `markdown-it`, `@shikijs/*`, `better-sqlite3` **GIỮ LẠI** (vẫn cần cho phase 02+)
- `cookie`, `nanoid` → check xem dùng ở đâu khác, nếu không thì remove

### `.env.example`
Xóa: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_WHITELIST`, `SESSION_SECRET`, `COOKIE_DOMAIN`, tất cả biến chỉ dùng cho OAuth/admin.

## Steps

1. Backup DB hiện tại: `sqlite3 data/app.db .dump > backup-pre-kill-theory-$(date +%Y%m%d).sql`
2. `git rm -r server/admin server/auth server/content server/public/theory-routes.js server/scripts/migrate-labs-to-md.js server/scripts/verify-migration.js labs/_shared/theory-reader.js`
3. Edit `server/server.js` — xóa import + route mount + legacy redirect block
4. Edit `server/lib/csp-middleware.js` — bớt directive
5. Edit `.env.example` + `package.json` dependencies
6. `npm install` để regenerate lock file
7. `npm run dev` — check server start OK, `/healthz` trả OK, không có import error
8. `curl http://localhost:8387/theory/networking/dns` → 404 (hoặc Not Found)
9. `curl http://localhost:8387/admin` → 404
10. `curl http://localhost:8387/labs/01-networking/01-tcp-ip-packet-journey.html` → 200 (labs vẫn sống)

## Acceptance Criteria

- [ ] `git grep -rE "theoryRoutes|adminRoutes|oauthRoutes|sessionMiddleware|markdown-renderer|admin-guard|theory-reader"` = 0 match
- [ ] `npm run dev` không lỗi import, log chỉ còn: listen + live-reload watching
- [ ] `/theory/*` và `/admin/*` trả 404
- [ ] `/healthz` trả `{status:"ok"}`
- [ ] Labs HTML cũ vẫn mở được, dashboard `/` vẫn show CATALOG

## Risks

| Risk | Mitigation |
|------|------------|
| Còn sót reference tới module đã xóa | Dry-run `npm run dev`, node báo lỗi import → fix từng cái |
| CSP break vì xóa directive cần thiết | Test mở lab trong browser, DevTools Console check CSP violation |
| DB data cũ (topics/sections) vẫn còn → chiếm disk | Phase 02 sẽ DROP, tạm chấp nhận |

## Out-of-scope

- Xóa bảng DB theory (để phase 02)
- Dọn `data/app.db` → phase 02 migrate sẽ xử lý
