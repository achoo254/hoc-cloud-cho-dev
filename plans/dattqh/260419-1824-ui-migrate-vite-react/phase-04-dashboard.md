# Phase 04 — Dashboard

**Status:** completed (2026-04-19) · **Effort:** 1.5-2d · **Priority:** P1 · **Depends on:** phase-01, phase-02, phase-03

## Completion notes

- 9 components `app/src/components/dashboard/*` + `lib/stats.ts`
- Heatmap custom CSS grid (13×7=91 days), shadcn Tooltip + Select added
- Ctrl+K toolbar button stub (wire thực ở phase 05)
- `tsc --noEmit` sạch, `npm run build` pass

## Goal

Port `labs/index.html` + `labs/_shared/index-sections-*.js` (8 sections) sang React với shadcn/ui + Framer Motion.

## Sections map

| Vanilla file | React component |
|---|---|
| `index-sections-toolbar.js` (131) | `<DashboardToolbar>` — search trigger, filter, theme toggle |
| `index-sections-stats.js` (190) | `<StatsSection>` — progress heatmap, streak, completed count |
| `index-sections-due.js` (58) | `<DueSection>` — flashcards/labs due today |
| `index-sections-roadmap.js` (64) | `<RoadmapSection>` — timeline milestone |
| `index-sections-footer.js` (73) | `<DashboardFooter>` |
| `index-stats.js` (123) | `lib/stats.ts` — compute helpers |
| `index-sections.js` (201) | `<DashboardLayout>` orchestrator |

## Steps

1. Route `/` render `<DashboardLayout>` với các sections stacked
2. Fetch catalog: import `labs-index.json` build-time từ Phase 03 (no API call) — metadata eager, chi tiết lazy khi vào `/lab/:slug`
3. `<StatsSection>`: heatmap 90-day grid, shadcn Card + Tooltip, stagger fade-in
4. `<DueSection>`: list labs/cards due today từ SM-2 state, shadcn Badge cho priority
5. `<RoadmapSection>`: timeline vertical, Framer Motion scroll-linked reveal
6. `<DashboardToolbar>`: sticky top, shadcn Input + Command trigger (Ctrl+K), filter dropdown (shadcn Select)
7. Lab catalog grid: Card với hover lift, click → navigate `/lab/:slug` với layoutId transition
8. Mobile-first responsive (Tailwind breakpoints sm/md/lg)

## Files tạo mới

- `app/src/routes/index.tsx`
- `app/src/components/dashboard/*.tsx`
- `app/src/lib/stats.ts`

## Files tham khảo

- `labs/index.html`, `labs/_shared/index-*.js`, `labs/_shared/index-page.css` (522 LOC — token design rút ra, không port CSS thẳng)

## Success criteria

- Dashboard load < 1s trên dev
- Heatmap render đúng data từ `/api/progress`
- Stagger animation mượt khi mount
- Mobile 375px layout không vỡ
- Keyboard: Ctrl+K mở Command palette (Phase 05 sẽ wire search)

## Risks

- Dùng `labs-index.json` từ Phase 03 → không cần thêm Hono endpoint, tránh DB coupling
- Heatmap library: tự viết với CSS grid thay vì cal-heatmap (giảm deps)
