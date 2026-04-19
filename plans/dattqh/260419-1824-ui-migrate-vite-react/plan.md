---
title: UI Migration — Vite + React + shadcn/ui + Framer Motion
slug: ui-migrate-vite-react
date: 2026-04-19
status: pending
priority: P1
effort: 10-15d (realistic after red-team)
branch: master
tags: [frontend, react, vite, shadcn, framer-motion, rewrite]
blockedBy: []
blocks: []
phases:
  - phase-00-spike-fixtures.md
  - phase-01-scaffold.md
  - phase-02-core-components.md
  - phase-03-content-pipeline.md
  - phase-04-dashboard.md
  - phase-05-search-progress.md
  - phase-06-polish.md
  - phase-07-deploy-cutover.md
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1824-ui-migrate-vite-react.md
relatedPlans:
  - 260419-1329-index-page-redesign       # completed — logic dashboard sections port sang React
  - 260419-1737-schema-v3-think-see-ship  # completed — schema v3 nguồn cho Zod types
---

# UI Migration — Vite + React + shadcn/ui

## Goal

**Explicitly a learning project** — mục đích chính: học React stack hiện đại, không phải refactor thuần tuý cần thiết. Scope giảm sau reality check (Phase 00 phát hiện DB chỉ có 8 labs networking, không phải 50+).

Rewrite UI từ vanilla HTML/JS (~3150 LOC, 8 lab HTMLs) sang **Vite + React 18 + TS + shadcn/ui + Framer Motion + React Router + React Query + Zod**. API Hono.js giữ nguyên. Clean rewrite trong `app/`.

## Reality check (Phase 00 findings)

- **8 labs** trong `labs/01-networking/` (không phải 50+)
- DB columns: `tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json` (v2 naming, content migrated sang v3 THINK/SEE/SHIP)
- Modules `02-linux`..`05-ansible` = raw scripts/configs, không rewrite
- Content pipeline → **đơn giản hoá**: 8 labs fit in 1 static bundle, không cần tooling nặng

## Non-goals

- Không migrate nội dung từng lab HTML (rewrite từ content DB/schema v3)
- Không viết lại Hono.js server
- Không i18n lần này (tiếng Việt hardcoded)

## Defaults chốt (unresolved từ brainstorm)

| Item | Quyết định | Lý do |
|---|---|---|
| Content model | **`.ts` files** trong `content/labs/*.ts` (`export default satisfies LabContent`) | Type-safe, không cần MDX runtime, bỏ frontmatter gymnastics |
| Dashboard data | **Build-time static JSON export** từ `content/labs/*.ts` → `app/src/generated/labs.json` (hoặc re-export index.ts) | Không coupling Hono DB cho list/metadata |
| Client-side search fallback | **Có** (Fuse.js hoặc minisearch index từ content) | User thường Ctrl+F xuyên labs — server FTS5 không thay thế được hoàn toàn |
| Dark mode | **Có** | shadcn/ui ship free, trivial cost |
| i18n | **Không** trong scope lần này | YAGNI, add sau nếu cần |
| `labs/` cũ | **Move → `legacy/labs/`** sau cutover, xoá sau 2 tuần prod ổn | An toàn rollback |

## Phase summary

| # | Phase | File | Effort |
|---|---|---|---|
| 0 | **Spike + Fixtures** ✅ reality-check DONE | phase-00 | — |
| 1 | Scaffold (Vite+React+TS+Tailwind+shadcn) ✅ | phase-01 | — |
| 2 | Core components (LabRenderer, Quiz, Flashcard) ✅ | phase-02 | — |
| 3 | Content pipeline (dump 8 labs → `content/labs/*.ts`) — simplified ✅ | phase-03 | — |
| 4 | Dashboard (stats, due, roadmap, toolbar) | phase-04 | — |
| 5 | Search (Command palette + client fallback) + Progress | phase-05 | — |
| 6 | Polish (animations, dark mode, responsive, a11y) | phase-06 | — |
| 7 | Deploy + cutover (nginx, dual-run, archive labs/) | phase-07 | — |

**Phase 00 là gate:** Không pass go-criteria → abort plan, fall back vanilla refactor.

## Success criteria (toàn plan)

- Feature parity: search FTS5, progress sync, SM-2 flashcard, quiz scoring, catalog
- 3-5 labs representative chạy ngon
- Lighthouse Performance ≥ 85
- 60fps animation desktop
- `npm run build` trong `app/` pass Zod validate mọi lab content

## Risks

Xem chi tiết trong từng phase. Tổng quát: rewrite tốn công → chia nhỏ phase deploy-able; giữ `labs/` cũ làm fallback đến hết Phase 7.
