# Project Roadmap

Last updated: 2026-04-21 · Production: https://hoc-cloud.inetdev.io.vn/

## Vision

Workspace tự học Cloud/DevOps với trải nghiệm interactive thay vì đọc lý thuyết — mỗi protocol có playground bước-từng-bước, animated diagrams, quiz + flashcards (SM-2 spaced repetition), progress tracking cá nhân và leaderboard cộng đồng.

## Status Overview

| Phase | Status | Summary |
|-------|--------|---------|
| P0 · Content pipeline & schema | ✅ Done | Lab JSON v3 schema, Zod validation, fixtures → MongoDB + Meilisearch sync |
| P1 · Vite + React SPA migration | ✅ Done | Legacy static site → Vite+React SPA (commit `7e5e859`) |
| P2 · Interactive playgrounds (8 labs) | ✅ Done | THINK/SEE/SHIP renderer + lazy-loaded diagram registry |
| P3 · Dashboard & progress | ✅ Done | Stats, heatmap, due-queue, roadmap, catalog |
| P4 · Search (Meilisearch) | ✅ Done | `/api/search` — typo-tolerant, `<mark>` highlight |
| P5 · Auth & leaderboard | ✅ Done | Firebase Auth (Google) + leaderboard (commit `7efd833`) |
| P6 · Deploy automation | ✅ Done | GitHub Actions + PM2 + Nginx trên VPS |
| P7 · Self-hosted web terminal | 📋 Planned | Plan tại `plans/...web-terminal` (commit `3a4b67f`) |

## Completed Milestones

### Content & Schema (P0)
- Lab schema v3 (Zod) — `app/src/lib/schema-lab.ts`
- 8 labs: `arp`, `dhcp`, `dns`, `http`, `icmp-ping`, `subnet-cidr`, `tcp-ip-packet-journey`, `tcp-udp`
- Sync pipeline: `server/scripts/sync-labs-to-db.js` → MongoDB (labs collection) + Meilisearch (search index). FE đọc qua `/api/labs` — không còn bundled TS modules.

### Interactive Playgrounds (P2)
- Diagram registry pattern (lazy-loaded components)
- D3 (math) vs Framer Motion (DOM) separation rule
- SVG export với DOMPurify sanitization
- `PlaygroundErrorBoundary` fallback text mode
- Feature flag `VITE_ENABLE_DIAGRAM_PLAYGROUND` + `?textMode=1` runtime

### Dashboard (P3)
- Stats section + heatmap (GitHub-style activity grid)
- Due section (spaced-repetition queue, SM-2)
- Roadmap section + lab catalog grid
- Guest vs authed layout switching
- Progress preview cards

### Search (P4)
- Meilisearch index (typo-tolerant, ranking tuỳ biến)
- `<mark>` highlight trong snippet
- Command palette (`cmdk`) trong UI; banner cảnh báo khi service unavailable

### Auth (P5)
- Firebase Auth (Google provider) thay thế GitHub OAuth cũ
- HttpOnly session cookie (signed, SameSite=Lax)
- firebase-admin server-side verification
- Migration `003-firebase-auth.sql`
- Leaderboard API (`/api/leaderboard`)

### Deploy (P6)
- esbuild bundle BE → single `server.bundle.js`
- GitHub Actions: build + smoke test + SCP + `pm2 restart`
- Nginx proxy `/api/*`, `/auth/*`, `/sse/*`
- PM2 `ecosystem.config.cjs` (cluster mode, NODE_ENV=production)
- CI fail-fast khi thiếu Firebase config fields

## In Flight / Planned

### P7 · Self-hosted Web Terminal
- Plan file: `plans/...web-terminal/`
- Mục tiêu: try-at-home commands chạy trực tiếp trong browser (Linux sandbox, không cần VPS riêng)
- Trạng thái: plan đã viết (commit `3a4b67f`), chưa implement

### Potential future
- Thêm labs: TLS handshake, BGP, Kubernetes networking, load balancing
- Multi-language content (EN alongside VI)
- Social features: share progress, study groups
- AI tutor (giải thích concept khi user click vào diagram element)

## Non-goals

- ❌ Server-side rendering — SPA là đủ (SEO không phải ưu tiên)
- ❌ Mobile app native — responsive web đủ dùng
- ❌ User-generated content — content do maintainer curate
- ❌ Offline mode — cần API cho progress + leaderboard

## Open Questions

- MongoDB replica set / managed cluster khi user base scale lên?
- Web terminal dùng WebContainer (StackBlitz) hay tự host Docker sandbox?
- Có cần rate-limit API khi user base scale lên không?
