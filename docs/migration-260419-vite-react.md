# Migration: Vite+React SPA — 2026-04-19

Plan dir: `plans/dattqh/260419-1824-ui-migrate-vite-react/`

## What & Why

**What:** Replaced self-contained lab HTML files in `labs/` with a Vite+React SPA in `app/`, served from `app/dist/` via nginx.

**Why:**
- `labs/*.html` were duplicating navigation, styling, and JS across 30+ files — DRY violation
- No search/filter UI; SQLite FTS5 existed server-side but unused on frontend
- Dark mode, progress tracking, and inter-lab linking required copy-paste per lab
- Vite enables proper code-splitting (mermaid/shiki lazy-loaded), TypeScript, and component reuse

## Architecture: Before vs After

```
BEFORE                              AFTER
──────────────────────────────────  ──────────────────────────────────
nginx (port 80/443)                 nginx (port 80/443)
  └─ proxy_pass :8387               ├─ root /var/www/hoccloud/app/dist/
                                    │   try_files → index.html (SPA)
Node/Hono (port 8387)               ├─ /api/*  → proxy :3000
  ├─ serves labs/*.html statically  ├─ /sse    → proxy :3000 (buffering off)
  ├─ /api/search (FTS5)             └─ /legacy/ → alias legacy/labs/ (archive)
  └─ /api/progress
                                    Node/Hono (port 3000)
labs/*.html                           ├─ /api/search (FTS5)
  self-contained, schema v2           ├─ /api/progress
                                      ├─ /sse (hot-reload dev)
                                      └─ /healthz

                                    app/dist/ (Vite SPA)
                                      ├─ index.html (no-cache)
                                      ├─ assets/*.js (immutable, 1yr cache)
                                      └─ assets/*.css

                                    content/labs/*.ts (generated)
                                    fixtures/labs/*.json (source of truth)
```

## Cutover Runbook

Run these commands **in order** on cutover day.

### Local (before deploy)

```bash
# 1. Confirm build passes
cd app && npm run build && cd ..

# 2. Verify dist/ exists
ls app/dist/index.html
```

### Remote — first deploy

```bash
# 3. Deploy SPA + server
bash deploy/remote-deploy.sh

# 4. Smoke test (substitute your domain)
curl -s https://hoc-cloud.inetdev.io.vn/healthz
curl -s "https://hoc-cloud.inetdev.io.vn/api/search?q=vpc" | head -c 200
```

### Remote — nginx cutover

```bash
# 5. Copy nginx config (first time setup)
sudo cp /path/to/repo/deploy/nginx.conf.example /etc/nginx/conf.d/hoc-cloud.conf

# 6. Test and reload
sudo nginx -t && sudo systemctl reload nginx

# 7. Verify SPA loads
curl -si https://hoc-cloud.inetdev.io.vn/ | grep "200\|301\|302"
```

### Remote — archive legacy labs

```bash
# 8. Move labs/ → legacy/labs/ (do this as a separate git commit)
git mv labs/ legacy/labs/
git commit -m "chore: archive legacy labs to legacy/"

# 9. Create legacy dir on VPS
ssh user@host "mkdir -p /var/www/hoccloud/legacy"
rsync -az legacy/ user@host:/var/www/hoccloud/legacy/
```

### Smoke test checklist (manual)

- [ ] Dashboard loads at `/`
- [ ] Search "vpc" returns results
- [ ] Lab detail page renders (3 representative labs)
- [ ] Progress POST: complete a lab, refresh, progress persists
- [ ] Dark mode toggle persists across reload
- [ ] `/legacy/` path shows autoindex of archived labs
- [ ] `/healthz` returns `{"status":"ok"}`

## Rollback Procedure

### Fast rollback (nginx root only — ~30 sec)

```bash
# On VPS:
bash deploy/rollback.sh nginx
# Reverts nginx root from app/dist/ back to legacy/labs/
```

### Full rollback (code + server)

```bash
# On VPS:
bash deploy/rollback.sh          # reverts to HEAD~1
# or:
bash deploy/rollback.sh <sha>    # reverts to specific commit
```

After rollback, re-run `bash deploy/remote-deploy.sh` to push fix.

## Post-Cutover Cleanup Checklist

Run 2 weeks after production is stable:

- [ ] Drop `labs` and `labs_fts` tables from `data/hoccloud.db`:
  ```sql
  DROP TABLE IF EXISTS labs_fts;
  DROP TABLE IF EXISTS labs;
  ```
- [ ] Remove `legacy/` directory from VPS: `rm -rf /var/www/hoccloud/legacy/`
- [ ] Remove `location /legacy/` block from nginx config, reload nginx
- [ ] Remove `server/scripts/sync-labs-to-db.js` (legacy sync script)
- [ ] Delete `legacy/` from git: `git rm -r legacy/ && git commit -m "chore: remove legacy labs archive"`
- [ ] Update `docs/system-architecture.md` to remove legacy references

## Key Chunk Sizes (build 2026-04-19)

| Chunk | Raw | Gzip |
|-------|-----|------|
| react-vendor | 234 kB | 76 kB |
| framer | 115 kB | 38 kB |
| ui-vendor | 106 kB | 35 kB |
| query-vendor | 42 kB | 13 kB |
| index (app entry) | 150 kB | 42 kB |
| mermaid (lazy) | 2,743 kB | 745 kB |
| shiki (lazy) | 837 kB | 299 kB |

mermaid + shiki are lazy-loaded per-lab — not in initial bundle. Initial load (react-vendor + index + css) ≈ **165 kB gzip**.
