# Brainstorm — Migrate UI sang Vite + React + shadcn/ui

**Date:** 2026-04-19 18:24 · **Branch:** master · **Status:** Approved design

## Problem statement

UI hiện tại vanilla HTML/JS/CSS (~3150 LOC, 50+ lab HTML tự chứa). Pain point:
- Component reusability thấp — logic quiz/flashcard/progress lặp giữa các lab
- UI "thô", thiếu polish
- Khó làm animation phức tạp với vanilla

Mục tiêu: viết lại UI sạch, component-based, UI đẹp, animation tốt. Chấp nhận bỏ constraint "self-contained HTML + fallback không-Node".

## Decisions chốt

| Khoản | Chọn |
|---|---|
| Framework | **Vite + React 18 + TypeScript** (SPA) |
| UI library | **shadcn/ui** (Radix + Tailwind CSS) |
| Animation | **Framer Motion** (page transitions + micro-interactions) |
| Routing | **React Router v6** (file-based không cần thiết ở SPA) |
| Content model | Lab data → **MDX** hoặc **JSON schema v3** load từ DB qua API |
| API backend | **Giữ Hono.js tách riêng** (search FTS5, progress, SSE reload) |
| Strategy | **Clean rewrite** — không cố migrate từng lab HTML, viết lại từ đầu |
| State | React Query (server state) + Zustand (UI state nếu cần) |
| Build output | SPA static → nginx serve, API proxy `/api/*` → Hono |

## Approaches evaluated

### A. Astro + islands ❌
- Ưu: zero-JS default, migrate nhẹ
- Loại: user ưu tiên animation phức tạp + clean rewrite, không cần tận dụng lab HTML cũ

### B. Vite + React SPA ✅ **CHỌN**
- Ưu: DX đơn giản, pure React, page transitions mượt, shadcn/ui + Framer Motion first-class
- Nhược: bundle lớn hơn, SEO kém hơn (không vấn đề với personal workspace)

### C. Next.js App Router ❌
- Loại: overkill, API đã có Hono, không cần RSC/SSR cho personal workspace

## Architecture

```
hoc-cloud-cho-dev/
├── app/                         # Vite + React SPA (NEW)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── routes/              # React Router routes
│   │   │   ├── index.tsx        # Dashboard (replace labs/index.html)
│   │   │   ├── lab/[slug].tsx   # Lab viewer
│   │   │   └── search.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   ├── lab/             # LabRenderer, QuizBlock, FlashcardSM2
│   │   │   ├── dashboard/       # StatsSection, DueSection, RoadmapSection
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── api.ts           # fetch client → Hono
│   │   │   ├── schema.ts        # lab schema v3 types (Zod)
│   │   │   └── sm2.ts           # SRS algorithm
│   │   └── styles/globals.css
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── server/                      # Hono.js — GIỮ NGUYÊN
│   ├── index.ts
│   ├── routes/ (search, progress)
│   └── db/
├── content/                     # NEW — lab content tách khỏi DB
│   └── labs/*.mdx               # hoặc JSON schema v3
├── data/hoccloud.db             # giữ nguyên
└── deploy/nginx.conf            # proxy /api → :3000, static → /app/dist
```

## Key component map

| Vanilla hiện tại | React component mới |
|---|---|
| `labs/_shared/lab-template.js` (868 LOC) | `<LabRenderer>` + subcomponents |
| `labs/_shared/index-sections-*.js` | `<Dashboard>` + `<StatsSection>`, `<DueSection>`, `<RoadmapSection>` |
| `labs/_shared/search-widget.js` | `<SearchCommand>` (shadcn/ui `<Command>` palette) |
| `labs/_shared/progress-sync.js` | `useProgress()` hook + React Query |
| Inline `<script id="lab-data">` | MDX frontmatter + Zod-validated types |
| `quiz-bank/*.json` | Giữ format, load runtime |

## Content migration

- **Clean rewrite = viết lại cấu trúc**, không migrate từng file HTML
- Lab content (schema v3 JSON đang lưu trong `<script>` mỗi HTML) → tách ra:
  - **Option A:** dump DB → generate `content/labs/*.mdx` (MDX với frontmatter = schema v3)
  - **Option B:** content ở lại DB, React fetch qua `/api/labs/:slug`
- Khuyến nghị Option A — content dưới dạng file dễ version, dễ edit, build-time validate Zod

## Animation scope

- **Page transitions**: Framer Motion `<AnimatePresence>` giữa routes
- **Reveal/stagger**: dashboard sections fade-in
- **Micro-interactions**: hover cards, flashcard flip, quiz reveal, progress bar
- **Layout animations**: `layoutId` khi click lab card → expand sang trang lab

## Implementation phases (high-level)

1. **Phase 1 — Scaffold**: Vite+React+TS+Tailwind+shadcn/ui setup, routing, API client, proxy dev server → Hono
2. **Phase 2 — Core components**: `<LabRenderer>` + Zod schema v3 types + quiz/flashcard/progress primitives
3. **Phase 3 — Dashboard**: replicate `labs/index.html` sections với shadcn/ui + Framer Motion
4. **Phase 4 — Content pipeline**: DB → MDX export script, Zod validate at build
5. **Phase 5 — Search + Progress**: Command palette, React Query integration với Hono API
6. **Phase 6 — Polish**: animations, dark mode, responsive, accessibility
7. **Phase 7 — Deploy**: nginx config update, build pipeline, cutover plan

## Risks

| Risk | Mitigation |
|---|---|
| Rewrite to, mất momentum học | Phase nhỏ, mỗi phase deploy được |
| Mất content hiện tại | Migration script DB → MDX chạy trước, giữ labs/ cũ làm backup cho đến khi app/ ổn |
| Schema v3 types phức tạp | Zod làm single source of truth, generate TS types |
| SSE reload dev server | Hono dev giữ nguyên port 3000, Vite dev 5173 proxy |
| Bundle size | Code-split per route, lazy load Framer Motion |

## Success criteria

- Dashboard + 3-5 lab representative chạy ngon trên app/
- Feature parity: search, progress, SM-2 flashcard, quiz scoring
- Lighthouse Performance ≥ 85 (SPA cold load)
- Animation smooth 60fps trên desktop
- Content pipeline: 1 lệnh export DB → MDX, build-time validate

## Next steps

User quyết định:
1. Tạo plan chi tiết qua `/ck:plan` (khuyến nghị) — break thành 7 phases với TODO file-level
2. Hay làm scaffold (Phase 1) trước rồi mới plan phần sau

## Unresolved questions

- Content model cuối cùng: **MDX file** vs **DB + API**? (design doc nghiêng MDX, cần user xác nhận)
- `labs/` cũ giữ lại dưới dạng archive hay xoá sau cutover?
- Dark mode có phải hard requirement không?
- i18n (vi/en) có nằm trong scope rewrite lần này?
