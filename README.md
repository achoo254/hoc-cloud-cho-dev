# hoc-cloud-cho-dev

Personal workspace để tự học Cloud/DevOps. Lab HTML tự chứa + SM-2 flashcard.

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `labs/` | Lab HTML tự chứa (schema v2) + `_shared/` runtime |
| `server/` | Hono.js: static + `/api/search` (FTS5) + `/api/progress` + SSE reload |
| `docs/` | Tài liệu dự án (guidelines, roadmap, architecture) |
| `plans/` | Plan triển khai các thay đổi |
| `deploy/` | Nginx config + remote deploy script |
| `data/` | `hoccloud.db` — SQLite (labs + FTS + progress) |

## Chạy local

```bash
npm install && npm run dev    # Node ≥20, http://localhost:3000
# fallback không cần Node:
cd labs && python -m http.server 8000
```

## Convention viết lab mới

- Schema v2 (4 chân kiềng): `why` · `whyBreaks` · `observeWith` · `deploymentUse`
- Copy 1 lab existing → sửa `<title>` + block `<script id="lab-data">`
- Thêm entry vào `CATALOG` trong `labs/index.html`
- Sync DB: `node server/scripts/sync-labs-to-db.js`
- Tuân `docs/content-guidelines.md` (tone, ngôi xưng, cite nguồn)

## Cheat-sheet

- Reset progress: DevTools → Local Storage → xoá key `lab:*`
- Sync labs → DB: `node server/scripts/sync-labs-to-db.js`
- Migrate DB: `node server/db/migrate.js`
- Deploy: `bash deploy/remote-deploy.sh`

## API (server)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=<q>` | FTS5 full-text qua labs |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` cho cookie |
| POST | `/api/progress` | Upsert `{ lab_slug, opened_at?, completed_at?, quiz_score? }` |
