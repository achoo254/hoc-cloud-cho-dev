# Deployment Guide

Production: **https://hoc-cloud.inetdev.io.vn/**

## Architecture

- **Static FE**: `app/dist/` served bởi Nginx
- **API**: Hono.js bundle (`server.bundle.js`) chạy qua PM2
- **Nginx**: reverse proxy `/api/*`, `/auth/*`, `/sse/*` → Node; serve everything else as static
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) deploy khi push `master`

## Build

```bash
# Frontend
npm run build --prefix app   # → app/dist/

# Backend (esbuild single bundle)
npm run build:server         # → dist-server/server.bundle.js
```

FE build chạy `npm run gen:content` (root) → `tsc --noEmit` → `vite build`.

## Environment Variables

### Frontend (build-time, `VITE_*` prefix)

| Variable | Default | Description |
|---|---|---|
| `VITE_ENABLE_DIAGRAM_PLAYGROUND` | `true` | Set `"false"` để disable playground, fallback text-only. |
| `VITE_FIREBASE_CONFIG` | — | **Required.** Firebase client config (JSON hoặc JS object literal). CI accept cả 2 định dạng; fail-fast nếu thiếu field bắt buộc. |

Runtime override: append `?textMode=1` lên lab URL → ép text mode bất kể build flag.

### Backend (runtime)

| Variable | Description |
|---|---|
| `NODE_ENV` | **Phải là `production`** khi chạy via PM2 (set trong `ecosystem.config.cjs`). |
| `PORT` | Default `8387`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON cho firebase-admin (verify ID token, set session cookie). |
| `SESSION_COOKIE_SECRET` | HMAC secret cho session cookie. |
| `MONGODB_URI` | **Required.** MongoDB connection string (e.g. `mongodb://localhost:27017/hoccloud`). |
| `MEILISEARCH_HOST` | **Required.** Meilisearch base URL (e.g. `http://localhost:7700`). |
| `MEILISEARCH_API_KEY` | Meilisearch master/admin API key. |

## CI/CD Flow (`.github/workflows/deploy.yml`)

1. Checkout + `npm ci` (root + `app/`)
2. Inject `VITE_FIREBASE_CONFIG` từ GitHub Secrets
3. `npm run build --prefix app` + `npm run build:server`
4. Smoke test: spawn node server với bundle, curl `/healthz`
5. Tar: `app/dist/` + `dist-server/server.bundle.js`
6. SCP lên VPS, extract vào release folder
7. `pm2 startOrRestart ecosystem.config.cjs --env production`

VPS **không cần** `package.json` hoặc `npm ci` — chỉ cần `node` + `pm2`. MongoDB và Meilisearch chạy như external services (self-hosted hoặc managed), cần set đủ env vars `MONGODB_URI`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` trước khi start PM2.

## Nginx

Xem `deploy/nginx.conf.example`:

- Static: `root app/dist/; try_files $uri /index.html;` (SPA fallback)
- `location /api/ { proxy_pass http://127.0.0.1:8387; }`
- `location /auth/ { proxy_pass http://127.0.0.1:8387; }` (OAuth callback)
- `location /sse/` cần `proxy_buffering off;` + `proxy_read_timeout 1h;`

## Dev Server

```bash
npm run dev:server   # Hono :8387 (--watch)
npm run dev:app      # Vite :5173 (proxy /api, /auth → :8387)
```

## Typecheck

```bash
npm run typecheck --prefix app   # tsc --noEmit
```

## Troubleshooting

- **Firebase config missing fields**: CI fail-fast với tên field thiếu. Kiểm tra `VITE_FIREBASE_CONFIG` secret.
- **PM2 chạy sai NODE_ENV**: script deploy export `NODE_ENV=production` trước `pm2 start/restart` (commit `b9cdb41`).
- **OAuth redirect lỗi**: Nginx phải proxy `/auth/*` — xem commit `e136584`.
- **MongoDB connection refused**: Đảm bảo `MONGODB_URI` đúng và MongoDB service đang chạy trước khi PM2 start.
- **Meilisearch unavailable**: Search API trả về lỗi; client-side MiniSearch fallback (`search-index.json`) vẫn hoạt động. Kiểm tra `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY`.
