# hoc-cloud-cho-dev

Personal workspace để tự học Cloud/DevOps. Vite+React SPA + Hono API server + SM-2 flashcard.

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `app/` | Vite+React SPA (TypeScript, Tailwind, shadcn/ui) |
| `server/` | Hono.js: `/api/search` (FTS5) + `/api/progress` + `/sse` reload |
| `content/` | Lab TypeScript modules (generated từ `fixtures/labs/*.json`) |
| `fixtures/` | Lab fixture JSON — source of truth cho lab content |
| `docs/` | Tài liệu dự án (architecture, guidelines, roadmap) |
| `plans/` | Plan triển khai các thay đổi |
| `deploy/` | Nginx config + remote deploy script |
| `data/` | `hoccloud.db` — SQLite (labs + FTS + progress) |

## Development

```bash
npm install          # install root + server deps
```

```bash
# Terminal 1
npm run dev:server   # Hono API on :3000
# Terminal 2
npm run dev:app      # Vite dev server on :5173 (proxy → :3000)
```

Open http://localhost:5173

## Building for production

```bash
npm run build --prefix app
# outputs to app/dist/
# also regenerates content/ (gen:content runs automatically before vite build)
```

## Deploy

```bash
bash deploy/remote-deploy.sh [user@host]
```

Script sẽ: build SPA locally → rsync `app/dist/` + `server/` → reload nginx → restart pm2.
Xem `deploy/remote-deploy.sh` để cấu hình `REMOTE_HOST`, `REMOTE_BASE`, `PM2_APP`.

## Thêm lab mới

Lab content sống trong `fixtures/labs/*.json` (schema v3). Quy trình:

1. Thêm fixture JSON vào `fixtures/labs/` (copy từ lab hiện có, sửa `slug` + `title` + content)
2. Validate schema: `npm run validate:schema`
3. Regenerate content modules: `npm run gen:content`
4. Kiểm tra trong app: `npm run dev:app`
5. Sync vào DB: `node server/scripts/sync-labs-to-db.js`

Xem `docs/content-guidelines.md` (tone, ngôi xưng, cite nguồn).

## API (server)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=<q>` | FTS5 full-text search qua labs |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` cho cookie |
| POST | `/api/progress` | Upsert `{ lab_slug, opened_at?, completed_at?, quiz_score? }` |
| GET | `/sse` | Server-Sent Events (hot reload dev) |

## Cheat-sheet

```bash
# Reset progress (browser)
DevTools → Application → Local Storage → xoá key lab:*

# Sync fixtures → DB
node server/scripts/sync-labs-to-db.js

# DB migration
node server/db/migrate.js

# Rollback nginx (MODE A — fast)
bash deploy/rollback.sh nginx

# Full code rollback
bash deploy/rollback.sh [<sha>]
```
