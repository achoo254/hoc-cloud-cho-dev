---
title: "Theory CMS + LMS-lite — Phase 1: Core CMS"
description: "SQLite+FTS5, GitHub OAuth /admin, Markdown CMS CRUD với Alpine.js, public render pipeline (markdown-it+Shiki+Mermaid+callouts), migrate labs HTML → Markdown."
status: pending
priority: P1
effort: 1.5w
branch: master
tags: [cms, sqlite, fts5, oauth, markdown, hono]
created: 2026-04-19
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1034-theory-cms-lms.md
relatedPlans:
  - plans/dattqh/260419-0932-daily-random-quiz-srs  # sẽ merge ở Phase 4
---

## Goal

Thêm phần **lý thuyết thực chiến** dạng CMS vào site `hoc-cloud.inetdev.io.vn`: admin login GitHub OAuth → viết markdown → public render server-side với code highlight + mermaid + callouts. Đồng thời migrate labs hiện tại (HTML) sang markdown để thống nhất pipeline.

## Success Criteria

- [ ] Admin login qua GitHub OAuth, whitelist hoạt động, non-whitelisted bị 403
- [ ] CRUD topic + section qua admin UI (Alpine.js split-view editor)
- [ ] Public route `/theory/:topic/:section` render markdown server-side (SEO OK)
- [ ] Code blocks highlight (Shiki), mermaid diagram render client-side, callouts (info/warn/tip)
- [ ] Labs HTML → Markdown migration script chạy OK, `/labs/*` render từ DB
- [ ] SQLite FTS5 index tự sync khi CRUD section (trigger-based)
- [ ] Live-reload khi admin save (SSE push đến client đang mở)
- [ ] Backup script `sqlite3 .backup` chạy được bằng cron

## Key Decisions (từ brainstorm)

| Topic | Decision |
|---|---|
| Storage | SQLite only (better-sqlite3), FTS5 cho search |
| Auth | GitHub OAuth + whitelist env var |
| Admin UI | Alpine.js single-page, không build tool |
| Render | Server-side markdown-it + Shiki, Mermaid client-side |
| i18n | KHÔNG — VI only |
| Migration | Labs HTML → MD 1 lần, giữ `_archive/` backup |

## Architecture

### Module Structure
```
server/
├── server.js                    # existing, thêm routing
├── db/
│   ├── sqlite-client.js         # better-sqlite3 singleton
│   ├── schema.sql               # topics, sections, sections_fts, lab_links, media, admin_sessions
│   └── migrations/
│       └── 001-init.sql
├── auth/
│   ├── github-oauth.js          # /auth/github, /auth/github/callback
│   ├── session-middleware.js    # cookie → session lookup → set c.var.user
│   └── admin-guard.js           # whitelist check
├── content/
│   ├── markdown-renderer.js     # markdown-it + shiki + callouts plugin
│   ├── section-service.js       # CRUD topics/sections
│   └── fts-sync.js              # FTS5 rebuild/sync helpers
├── admin/
│   ├── routes.js                # /admin/* routes
│   └── views/
│       ├── dashboard.html       # list topics/sections
│       ├── editor.html          # alpine editor split-view
│       └── login.html
├── public/
│   └── theory-routes.js         # /theory/:topic/:section
├── scripts/
│   └── migrate-labs-to-md.js    # 1-time migration
└── lib/
    └── sse-reload.js            # existing, extend cho admin save event
```

### Data Model (SQLite)
```sql
CREATE TABLE topics (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  order_idx INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE sections (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  order_idx INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(topic_id, slug)
);

CREATE VIRTUAL TABLE sections_fts USING fts5(
  title, body_md,
  content='sections', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- Triggers keep FTS5 in sync
CREATE TRIGGER sections_ai AFTER INSERT ON sections BEGIN
  INSERT INTO sections_fts(rowid, title, body_md) VALUES (new.id, new.title, new.body_md);
END;
CREATE TRIGGER sections_ad AFTER DELETE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, title, body_md) VALUES('delete', old.id, old.title, old.body_md);
END;
CREATE TRIGGER sections_au AFTER UPDATE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, title, body_md) VALUES('delete', old.id, old.title, old.body_md);
  INSERT INTO sections_fts(rowid, title, body_md) VALUES (new.id, new.title, new.body_md);
END;

CREATE TABLE lab_links (
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  lab_slug TEXT NOT NULL,
  PRIMARY KEY (section_id, lab_slug)
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  github_user TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX idx_sections_topic ON sections(topic_id, order_idx);
CREATE INDEX idx_admin_sessions_exp ON admin_sessions(expires_at);
```

## Phase Breakdown

| # | Phase | File | Effort |
|---|-------|------|--------|
| 1 | DB + Schema setup | [phase-01-db-schema.md](phase-01-db-schema.md) | 0.5d |
| 2 | GitHub OAuth + admin guard | [phase-02-oauth-auth.md](phase-02-oauth-auth.md) | 1d |
| 3 | Markdown render pipeline | [phase-03-markdown-render.md](phase-03-markdown-render.md) | 1.5d |
| 4 | Admin CMS UI (Alpine.js) | [phase-04-admin-ui.md](phase-04-admin-ui.md) | 2.5d |
| 5 | Public theory routes + live-reload | [phase-05-public-routes.md](phase-05-public-routes.md) | 1d |
| 6 | Labs HTML → Markdown migration | [phase-06-labs-migration.md](phase-06-labs-migration.md) | 1d |
| 7 | Backup + deploy scripts | [phase-07-backup-deploy.md](phase-07-backup-deploy.md) | 0.5d |

**Total:** ~8 days effective work (~1.5 weeks part-time).

## Environment Variables

```bash
# .env (new additions)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_ADMIN_WHITELIST=achoo254,otheruser
SESSION_SECRET=<random 32 bytes>
SQLITE_DB_PATH=./data/hoccloud.db
UPLOAD_DIR=./data/uploads
PUBLIC_BASE_URL=https://hoc-cloud.inetdev.io.vn
```

## Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^11.x",
    "markdown-it": "^14.x",
    "markdown-it-anchor": "^9.x",
    "shiki": "^1.x",
    "@hono/oauth-providers": "^0.x",
    "hono": "^4.x (existing)",
    "cheerio": "^1.x",
    "turndown": "^7.x"
  }
}
```

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| better-sqlite3 native build fail trên Windows dev | M | Prebuilt binary ưu tiên, fallback `npm install --build-from-source` |
| FTS5 không có trong build | H | Check `PRAGMA compile_options` ở startup, fail fast |
| GitHub OAuth callback URL mismatch prod/dev | M | 2 OAuth apps riêng, env-aware `PUBLIC_BASE_URL` |
| Migration script làm mất format HTML đặc biệt | H | Dry-run mode, diff preview, giữ `labs/_archive/` |
| Shiki bundle size lớn | L | Chọn subset languages (bash, yaml, js, py, sql, dockerfile) |
| SSE reconnect storm khi admin save nhiều | L | Debounce 300ms + client backoff |

## Security

- OAuth state param (CSRF protection cho auth flow)
- Session cookie: httpOnly, Secure (prod), SameSite=Lax, 7 ngày expiry
- CSRF token cho POST/PUT/DELETE admin endpoints
- Admin whitelist check **trên mỗi request** (không cache)
- SQL: chỉ dùng prepared statements (better-sqlite3 default)
- Markdown: sanitize HTML output (markdown-it `html: false`)
- Rate limit: 60 req/min/IP cho `/api/*`

## Out of Scope (Phase sau)

- Ctrl+K search palette UI (Phase 2)
- Dashboard 4-widget refresh (Phase 3)
- Quiz SRS integration (Phase 4 — merge với plan `260419-0932-daily-random-quiz-srs`)
- Image upload drag-drop (Phase 6)
- Analytics, sitemap.xml, OG tags (Phase 5)

## Resolved Decisions

1. **OAuth app:** 1 GitHub App với 2 callback URLs (dev `http://localhost:3000/auth/github/callback` + prod `https://hoc-cloud.inetdev.io.vn/auth/github/callback`)
2. **DB path:** cùng thư mục app → `./data/hoccloud.db` (relative to app root). Backup script dùng path này.
3. **CSP:** Option B — lỏng vừa đủ. Header chuẩn:
   ```
   Content-Security-Policy:
     default-src 'self';
     script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net;
     style-src 'self' 'unsafe-inline';
     img-src 'self' data: https:;
     connect-src 'self';
     frame-ancestors 'none';
   ```
   Add middleware trong Phase 2 (cùng lúc với auth middleware).
