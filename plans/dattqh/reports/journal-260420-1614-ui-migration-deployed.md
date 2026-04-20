# Journal: UI Migration Deployed

**Date:** 2026-04-20 16:14
**Plan:** `260419-1824-ui-migrate-vite-react`
**Status:** Completed

## Summary

UI migration from vanilla HTML/JS to Vite + React + shadcn/ui is now live at `https://hoc-cloud.inetdev.io.vn`.

## Verification Results

| Endpoint | Status |
|----------|--------|
| `/healthz` | `{"status":"ok","db":"connected","uptime":59465}` |
| `/api/search?q=tcp` | FTS5 + BM25 ranking + `<mark>` highlight ✓ |
| Main page | 200 OK via Cloudflare |

## Key Metrics

- **Main bundle:** ~42KB gzip (target <200KB)
- **Server uptime:** 16.5h since last deploy
- **All 8 phases:** Completed

## Scope Changes from Original Plan

1. `labs/` purged completely (not archived to `legacy/`)
2. Deploy scripts → GitHub Actions CI/CD
3. Server bundled with esbuild → `server.bundle.js`

## Follow-up Items

1. **Docs update needed (major):**
   - Create `system-architecture.md`
   - Create `deployment-guide.md`
   - Fix stale `labs/` references in `lab-schema-v3.md`, `content-guidelines.md`

2. **Post-cutover cleanup:**
   - Drop `labs`/`labs_fts` tables after 2 weeks (if unused)
