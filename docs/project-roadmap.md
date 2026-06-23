# Project Roadmap

Last updated: 2026-06-02 · Production: https://hoc-cloud.inetdev.io.vn/

## Vision

Workspace tự học Cloud/DevOps với trải nghiệm interactive thay vì đọc lý thuyết — mỗi protocol có playground bước-từng-bước, animated diagrams, quiz + flashcards (SM-2 spaced repetition), progress tracking cá nhân và leaderboard cộng đồng.

## Status Overview

| Phase | Status | Summary |
|-------|--------|---------|
| P0 · Content + schema | ✅ Done | Lab v3 schema, Zod, MongoDB + Meilisearch sync, Exercises system (public, 3 Linux) |
| P1 · Vite + React SPA | ✅ Done | Vite 6 + React 18 migration (commit `7e5e859`) |
| P2 · Playgrounds (9 labs) | ✅ Done | THINK/SEE/TRY IT + 9 diagram components (new: VictoriaLogs 3-mode) |
| P3 · Dashboard + progress | ✅ Done | Stats, heatmap, due-queue, roadmap, catalog, SM-2 spaced-rep |
| P4 · Search (Meili) | ✅ Done | `/api/search` typo-tolerant, labs + exercises, `<mark>` highlight |
| P5 · Auth + leaderboard | ✅ Done | Firebase Auth (Google) + HttpOnly session + leaderboard |
| P6 · Deploy automation | ✅ Done | GitHub Actions + esbuild bundle + PM2 + Nginx on VPS |
| P7 · Self-hosted terminal | 📋 Planned | Browser-based Linux sandbox for try-at-home commands |

## Completed Milestones

### Content & Schema (P0)
- Lab schema v3 (Zod) — `app/src/lib/schema-lab.ts`
- **9 labs total**: 8 networking (`arp`, `dhcp`, `dns`, `http`, `icmp-ping`, `subnet-cidr`, `tcp-ip-packet-journey`, `tcp-udp`) + 1 observability (`victorialogs`, 2026-06-11)
- **3 exercises** (public, independent): `syslog`, `linux-boot-process`, `linux-swap` (moved from labs 2026-06-02/03)
- MongoDB labs + exercises auto-sync to Meilisearch via post-save hooks. FE runtime fetch via `/api/labs`, `/api/exercises`. Bulk re-sync: `server/scripts/sync-meili-index.js`.

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
- Guest→authed progress migration (MongoDB-based, idempotent via `migration-batch-model.js`)
- Leaderboard API (`/api/leaderboard`)

### Deploy (P6)
- esbuild bundle BE → single `server.bundle.js`
- GitHub Actions: build + smoke test + SCP + `pm2 restart`
- Nginx proxy `/api/*`, `/auth/*`, `/sse/*`
- PM2 `ecosystem.config.cjs` (cluster mode, NODE_ENV=production)
- CI fail-fast khi thiếu Firebase config fields

## In Flight / Planned

### P2b · VictoriaLogs observability lab — completed 2026-06-11

- **Lab**: `victorialogs` (module `02-observability`), 45 phút, playground 3 mode
- **Playground modes** (SEE tab): Kiến trúc & luồng animated (SVG + toggle single/cluster), LogsQL mini-evaluator (parser tập con + sample queries), pipeline stepper (5 bước ingest → stored → queried)
- Components: `VictoriaLogsPlayground` (root), `vlogs-architecture-flow` (SVG), `vlogs-logsql-playground` (evaluator), `vlogs-pipeline-stepper` (5-step), `vlogs-logsql-parser` (parser), `vlogs-mock-data` (fixtures)
- Content: 5 misconceptions, 6 TL;DR, 6 walkthrough, 5 quiz, 8 flashcards, 4 tryAtHome. Seed qua `server/scripts/seed-victorialogs-lab.js` (idempotent).
- Tổng labs: 8 → 9. Meilisearch auto-sync.

### P7b · DHCP Lab Codify (VMware 2-client conflict) — completed 2026-05-24

- Plan: `plans/dattqh/260524-1055-dhcp-lab-codify/plan.md`
- Codify session lab thực tế (3 VM Ubuntu 24.04 VMware Workstation, isc-dhcp-server, range .200-.201) vào lab `dhcp` content
- +4 `tryAtHome`, +2 `walkthrough` steps (full snippet ~30 dòng/step), +4 `misconceptions`
- 2 sample pcap captures (Case A `ping-check` abandon + Case B ARP flap) hard-coded vào `DhcpPlayground` qua `PacketDecoder`
- Mongo update idempotent (sentinel: `walkthrough[].step === 8`)
- Source archive (STEP-BY-STEP.md, REPORT.md, case-{A,B}.pcap thật) lưu trong plan dir

### P7a · tcpdump Lab Enhancement (icmp-ping + http)

- Plan: `plans/dattqh/260507-2215-tcpdump-lab-enhancement/plan.md`
- Thêm `PacketDecoder` shared component (3-panel: summary / layer tree / hex view) + client-side PCAP parser (vanilla, max 5 MB / 200 packets)
- Tích hợp vào `icmp-ping-playground` và `http-playground` — SEE section có thêm tcpdump capture viewer + upload .pcap
- MongoDB content update (idempotent script) bổ sung `tryAtHome`, `misconceptions`, `tldr`, `walkthrough`, `quiz`, `flashcards` về tcpdump cho 2 lab
- Hook `useMediaQuery` / `useIsDesktop` tại `app/src/lib/hooks/use-media-query.ts`
- Trạng thái: plan đã viết (2026-05-07), chưa implement

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
