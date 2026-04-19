# hoc-cloud-cho-dev

Personal workspace để tự học Cloud/DevOps. Vite+React SPA + Hono API server + SM-2 flashcard.

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `app/` | Vite+React SPA (TypeScript, Tailwind, shadcn/ui) |
| `server/` | Hono.js: `/api/search` (FTS5) + `/api/progress` + `/sse` reload |
| `content/` | Lab TypeScript modules (generated từ `fixtures/labs/*.json`) |
| `fixtures/` | Lab fixture JSON — source of truth cho lab content |
| `scripts/` | Build scripts (fixtures → TS, server data bundler) |
| `docs/` | Tài liệu dự án |
| `plans/` | Plan triển khai các thay đổi |
| `deploy/` | `nginx.conf.example` tham chiếu |
| `data/` | `hoccloud.db` — SQLite (labs + FTS + progress) |

## Development

```bash
npm install              # root deps
npm install --prefix app # app deps
```

```bash
# Terminal 1 — Hono API (port 8387)
npm run dev:server

# Terminal 2 — Vite dev server (port 5173, proxy /api → :8387)
npm run dev:app
```

Open http://localhost:5173

## Building for production

```bash
npm run build --prefix app   # FE → app/dist/
npm run build:server         # BE → dist-server/server.bundle.js (esbuild)
```

## Deploy

GitHub Actions workflow `.github/workflows/deploy.yml` tự chạy khi push `master`:
1. Build FE (Vite) + BE (esbuild bundle)
2. Smoke test `/healthz`
3. Stage chỉ `app/dist/` + `server.bundle.js` + `node_modules/better-sqlite3`
4. SCP lên VPS, extract, `pm2 restart`

VPS không cần `package.json`, không `npm ci`. Nginx config tham chiếu ở `deploy/nginx.conf.example`.

## Thêm lab mới

1. Tạo fixture JSON trong `fixtures/labs/` (schema v3 — xem `docs/lab-schema-v3.md`)
2. Validate: `node scripts/validate-lab-fixtures.js`
3. Generate content modules + indexes: `npm run gen:content`
4. Xem trong app: `npm run dev:app` (FE tự reload)
5. Sync vào DB server: `node server/scripts/sync-labs-to-db.js`

Xem `docs/content-guidelines.md` (tone, ngôi xưng, cite nguồn).

## API (server)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=<q>` | FTS5 full-text search (bm25 rank + `<mark>` highlight) |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` theo cookie |
| POST | `/api/progress` | Upsert `{ lab_slug, opened_at?, completed_at?, quiz_score? }` |
| GET | `/sse/reload` | Server-Sent Events (dev live-reload) |

## Cheat-sheet

```bash
# Reset progress (browser)
DevTools → Application → Local Storage → xoá key lab:*

# Sync fixtures → DB (chạy ngầm khi server boot, cũng chạy CLI được)
node server/scripts/sync-labs-to-db.js

# Fresh DB (local dev)
rm data/hoccloud.db && npm run dev:server
```
