# Brainstorm — Index Page Redesign

**Date:** 2026-04-19 13:29 · **Branch:** master · **Target:** `labs/index.html`

## Problem

Trang `labs/index.html` hiện có hero sơ sài (1 tiêu đề + 1 câu mô tả + npm command), thiếu hướng dẫn, thiếu stats cá nhân, không giới thiệu phương pháp học. Returning user ok (due-banner + bookmark), nhưng first-time/occasional visitor không hiểu app làm gì, học theo thứ tự nào.

## Requirements (từ user)

- **Audience:** Dev/SysAdmin đã quen (không cần giáo điều).
- **Features bổ sung:** How it works + Features, Learning roadmap, Stats cá nhân (có heatmap).
- **Style:** Hybrid split — hero + resume/stats phía trên, how-it-works + catalog phía dưới.
- **Constraints:** Mobile-first responsive, giữ design tokens, giữ due-banner + bookmark.
- **Hero CTA chính:** "Xem roadmap" (scroll to roadmap section).
- **Footer:** hiển thị tất cả (GitHub, production URL, docs, keyboard shortcuts).

## Approaches evaluated

### A. Single-file inline (KISS tối đa)
Thêm tất cả section vào `labs/index.html`, CSS inline trong `<style>`, JS inline trong `<script type="module">`.
- **Pros:** 1 file, dễ ship, không cần build.
- **Cons:** File >600 dòng, vi phạm rule "≤200 dòng", khó maintain.

### B. Modular split (chọn)
Tách CSS + section renderers sang `_shared/`. HTML chỉ chứa mount points + CATALOG data.
- **Pros:** Tuân modularization, tái dùng được cho trang khác, diff nhỏ khi sửa 1 section.
- **Cons:** +3 file mới, cần import thứ tự đúng.

### C. SPA framework (React/Vue)
- **Pros:** Reactive stats, routing.
- **Cons:** Phá vỡ kiến trúc vanilla hiện tại, over-engineering cho 1 trang landing. **Reject.**

**Chọn B** — balance giữa KISS và maintainability.

## Final design

### Section layout

| # | Section | Mobile | Desktop | Điều kiện |
|---|---------|--------|---------|-----------|
| 1 | Hero | Stack | 2-col (text \| metric chip) | Always |
| 2 | Resume strip | Stack 3 card | 3-col | Có progress |
| 3 | Your stats + heatmap | Tiles 2×2, heatmap scroll-x | 4×1 + heatmap full | Có progress |
| 4 | How it works (4 steps) | Vertical | Horizontal numbered | Always |
| 5 | Feature highlights | 2×2 | 4×1 | Always |
| 6 | Learning roadmap | Vertical timeline | Horizontal timeline with deps | Always |
| 7 | Lab catalog | 1-col, toolbar sticky | 3-col + toolbar | Always (giữ hiện tại) |
| 8 | Footer | Stack | 3-col (links, shortcuts, meta) | Always |

### Hero

```
┌───────────────────────────────────┬─────────────────┐
│ Learning Labs · Cloud/DevOps      │  NN labs        │
│ H1: Học DevOps kiểu WHY-first     │  MM flashcards  │
│ Sub: 1 lab = 1 buổi · quiz + SM-2 │  KK users       │
│                                   │  ─────────────  │
│ [Xem roadmap ↓]  [Bắt đầu ngay]  │  npm install    │
└───────────────────────────────────┴─────────────────┘
```
CTA primary → `#roadmap`. CTA secondary → lab đầu tiên.

### Resume strip (returning user)

3 card: **Tiếp tục đọc** (bookmark mới nhất), **Cần ôn hôm nay** (total due), **Streak** (ngày liên tục).

Thay thế `due-banner` đơn lẻ hiện tại.

### Stats + heatmap

- 4 tiles: Labs completed · Cards mastered · Quiz avg % · Total time (phút).
- Heatmap 12 tuần × 7 ngày, GitHub-style, vanilla SVG, cell click → tooltip ngày+count.
- Data source: aggregate `localStorage` (SRS state, quiz scores, `pos.ts`) + `ProgressSync.fetchAll()` nếu online.

### How it works

4 step cards numbered 01–04: **Đọc WHY-first → Làm Quiz → Ôn Flashcard SM-2 → Revisit**. Mỗi card: icon (emoji hoặc SVG), 1 câu mô tả ≤15 từ.

### Feature highlights

Grid 4 tile: **WHY-first explanations · Spaced repetition (SM-2) · Offline-first · Multi-device sync**. Mỗi tile: icon + title + 1 dòng mô tả.

### Learning roadmap

Timeline 8 phase (01 Networking → 08 CI/CD). Mỗi node: tên phase, số lab ready/total, thời lượng ước tính, prereq arrow.
- Desktop: horizontal timeline, scroll-snap mobile.
- Click node → `scrollIntoView` phase group ở section 7.
- Thêm field `duration`, `prereq` vào CATALOG.

### Catalog

Giữ nguyên logic render hiện tại. Thêm toolbar:
- Search box (reuse `search-widget.js` nếu có thể)
- Filter chips: All / In Progress / Done / New / Todo
- Sort: Default / A-Z / Progress

### Footer

3 cột (desktop) / stack (mobile):
- **Links:** GitHub repo, Production URL, Docs index, Discord/contact
- **Keyboard shortcuts:** `/` search, `g+h` home, `j/k` nav labs
- **Meta:** version, license, "Built with …"

## File plan

```
labs/
├── index.html                       # giữ CATALOG data, mount points, ≤150 dòng
├── _shared/
│   ├── index-page.css               # NEW — styles cho section 1-6, 8
│   ├── index-sections.js            # NEW — renderHero, renderResume, renderStats,
│   │                                  renderHeatmap, renderHowItWorks, renderFeatures,
│   │                                  renderRoadmap, renderFooter
│   ├── index-stats.js               # NEW — computeUserStats(), aggregateHeatmap()
│   └── lab-template.css             # giữ nguyên, chỉ bổ sung nếu thiếu token
```

Mỗi file mục tiêu ≤200 dòng. Nếu `index-sections.js` vượt, tách tiếp theo section.

## Responsive breakpoints

- `<640px` mobile — 1 col, touch target ≥44px, no horizontal scroll (trừ heatmap + roadmap có scroll-snap).
- `640–1024px` tablet — 2 col catalog, stats 4×1, roadmap horizontal.
- `>1024px` desktop — 3 col catalog, full timeline, heatmap full-width.

## Implementation considerations

- **Heatmap data:** cần track `opened_at` / `reviewed_at` theo ngày. `progress-sync` đã có `opened_at`; bổ sung client-side aggregation từ SRS review timestamps (đã có trong SM-2 state).
- **Stats khi chưa login:** compute từ localStorage. Khi có ProgressSync → merge server data, ưu tiên server.
- **No-progress state:** section 2 + 3 ẩn hoàn toàn, hero CTA đổi thành "Bắt đầu ngay".
- **Skeleton loader:** stats section có skeleton trong khi fetch `ProgressSync` (~100ms).
- **A11y:** heading order H1→H2→H3, ARIA cho timeline và heatmap, keyboard nav cho filter chips.

## Risks

| Risk | Mitigation |
|------|-----------|
| Heatmap + timeline tăng bundle ~10KB | Vanilla SVG inline, không thư viện |
| Roadmap scroll-snap kém trên mobile cũ | Fallback vertical stack <640px |
| Footer nhiều link = lộn xộn mobile | Accordion collapse <640px |
| Stats sai khi user lần đầu | Kiểm `progress.length === 0` → ẩn section |

## Success metrics

- First-time visitor hiểu flow học trong <30s (kiểm bằng self-review).
- Returning user thấy "Tiếp tục đọc" within viewport khi load (no scroll).
- Lighthouse mobile ≥90 (Performance + Accessibility).
- Không horizontal scroll trên 360px viewport.
- Tổng DOM nodes <800 (hiện tại ~200 + ~500 thêm).

## Next steps

1. Tạo plan chi tiết với phases: (1) modularize CSS/JS, (2) hero + how-it-works + features, (3) resume + stats + heatmap, (4) roadmap, (5) catalog toolbar, (6) footer + responsive polish.
2. Review mobile layout bằng DevTools trước khi ship.
3. Update `docs/codebase-summary.md` sau khi modularize.

## Unresolved questions

- **Metric chip data** (NN labs · MM flashcards · KK users): có endpoint lấy global stats chưa, hay hardcode từ CATALOG aggregate?
- **Heatmap granularity:** 12 tuần hay 6 tháng?
- **Keyboard shortcuts:** đã implement chưa, hay chỉ hiển thị như roadmap feature?
- **Discord/contact link:** có kênh chính thức chưa?
