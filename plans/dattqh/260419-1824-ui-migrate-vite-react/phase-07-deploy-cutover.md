# Phase 07 — Deploy + Cutover

**Status:** ✅ completed (2026-04-20) · **Effort:** 0.5d · **Priority:** P1 · **Depends on:** phase-01..06

## Completion notes (local prep)

- `vite.config.ts` thêm `preview.proxy` mirror `server.proxy`
- `deploy/nginx.conf.example` rewrite: SPA root, `/api/` + `/sse/` (buffering off), `/legacy/` alias, immutable cache cho hashed + no-cache cho index.html
- `deploy/remote-deploy.sh` rewrite: build local → rsync app/dist + server → nginx reload → pm2 restart
- `deploy/rollback.sh` MODE A (nginx revert ~30s) + MODE B (git reset)
- `README.md` rewrite, `docs/migration-260419-vite-react.md` runbook

## User action required (cutover day)

- [x] Confirm `pm2` process name → `hoccloud-server` ✓
- [x] Confirm VPS base path → `/var/www/hoccloud` ✓
- [x] Verify `server/ecosystem.config.cjs` → replaced by CLI args in deploy.yml ✓
- [x] `labs/` purged completely (commit `e90e7cc`) ✓
- [x] Deploy via GitHub Actions CI/CD ✓
- [x] Smoke test: healthz OK, search API OK, main page 200 ✓
- [ ] Sau 2 tuần prod ổn: drop labs/labs_fts tables (if any remain)

## Goal

Build production SPA, update nginx, cutover traffic từ `labs/` cũ sang `app/`, archive legacy.

## Steps

### Build

1. `cd app && npm run build` → `app/dist/` static assets
2. Verify Zod validate pass, no console errors trong preview (`npm run preview`)
3. Bundle analyze check target < 200KB gzip main

### Nginx config

4. Update `deploy/nginx.conf`:
   ```nginx
   server {
     root /var/www/hoccloud/app/dist;
     index index.html;

     location /api/ {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       # SSE
       proxy_buffering off;
       proxy_cache off;
     }
     location /healthz { proxy_pass http://127.0.0.1:3000; }

     # SPA fallback
     location / {
       try_files $uri $uri/ /index.html;
     }

     # Legacy archive (read-only, 30 days)
     location /legacy/ {
       alias /var/www/hoccloud/legacy/;
       autoindex on;
     }
   }
   ```

5. Test nginx config: `nginx -t` + reload

### Deploy script

6. Update `deploy/remote-deploy.sh`:
   - rsync `app/dist/` → remote `/var/www/hoccloud/app/dist/`
   - rsync `server/` → (giữ logic hiện tại)
   - Reload nginx, restart Hono via pm2

### Cutover

7. Deploy lên staging domain hoặc path, smoke test:
   - Dashboard load
   - Search "vpc" works
   - Lab render 3 labs representative
   - Progress POST thành công
   - Dark mode persist

8. Move `labs/` → `legacy/labs/` (git mv, commit riêng)
9. Deploy production

### Rollback plan

10. Nếu lỗi: nginx revert, serve `legacy/labs/` làm root tạm 1 ngày
11. Sau 2 tuần prod ổn: xoá `legacy/labs/` + related DB tables (labs, labs_fts)

## Docs update

12. Update `README.md`:
    - Bỏ fallback `python -m http.server` (không còn work)
    - Thêm section `app/` dev: `npm run dev:app` + `npm run dev:server`
    - Update "Convention viết lab mới" → tạo MDX trong `content/labs/`
13. Update `docs/system-architecture.md` (nếu có)
14. Thêm `docs/migration-260419-vite-react.md` ghi chú cutover

## Files đụng

- `deploy/nginx.conf`, `deploy/remote-deploy.sh`
- `README.md`, `docs/*.md`
- `labs/` → `legacy/labs/`

## Success criteria

- Production serve app/dist, /api/* proxy OK
- SSL, cache headers (immutable cho hashed assets) đúng
- Rollback plan test trên staging
- Docs reflect kiến trúc mới
- Git log clean: commit riêng "feat(app): launch Vite+React UI" + "chore: archive legacy labs"

## Risks

- SSE qua nginx cần `proxy_buffering off` — test kỹ
- SPA deep link reload 404 → `try_files` fallback bắt buộc
- Cache stale: dùng content-hash filename (Vite mặc định), HTML no-cache
- DB vẫn còn labs table — không xoá vội, chờ 2 tuần

## Post-cutover todo (follow-up plan)

- Xoá labs/labs_fts table khỏi `data/hoccloud.db` + migration
- i18n (nếu cần) — plan mới
- PWA/offline support — plan mới
