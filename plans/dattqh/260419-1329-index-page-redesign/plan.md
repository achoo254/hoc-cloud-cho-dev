---
title: "Index Page Redesign — Hybrid Landing + Dashboard"
description: "Redesign labs/index.html: hero + resume strip + stats/heatmap + how-it-works + features + roadmap timeline + catalog toolbar + footer. Modular vanilla, mobile-first."
status: completed
priority: P1
effort: 2d
branch: master
tags: [frontend, ui, ux, landing, dashboard, responsive]
created: 2026-04-19
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1329-index-page-redesign.md
---

# Index Page Redesign

## Goal

Redesign `labs/index.html` từ hero sơ sài → landing + dashboard hybrid 8 section, mobile-first, modular. Giữ due-banner, bookmark, design tokens, catalog render hiện tại.

## Context

- **Audience:** Dev/SysAdmin đã quen DevOps.
- **Current state:** `labs/index.html` 1 file, 322 dòng inline style + JS. Hero = 1 H1 + 1 câu + npm command.
- **Brainstorm report:** `plans/dattqh/reports/brainstorm-260419-1329-index-page-redesign.md`
- **Data dependency:** `ProgressSync` + SRS localStorage (đã có từ plan `260419-1206` phase-07).

## Architecture

```
labs/
├── index.html                     # ≤150 dòng: CATALOG data + mount points + module bootstrap
├── _shared/
│   ├── index-page.css             # NEW — all section styles + responsive
│   ├── index-sections.js          # NEW — render{Hero,Resume,Stats,Heatmap,HowItWorks,Features,Roadmap,Footer}
│   ├── index-stats.js             # NEW — computeUserStats, aggregateHeatmap, formatters
│   ├── lab-template.css           # existing, chỉ bổ sung token nếu thiếu
│   ├── lab-template.js            # existing
│   ├── progress-sync.js           # existing
│   └── search-widget.js           # existing, reuse cho catalog toolbar
```

## Design tokens

Dùng lại biến trong `lab-template.css`: `--accent`, `--bg`, `--bg-card`, `--bg-input`, `--text`, `--text-dim`, `--text-muted`, `--border`, `--why`, `--why-dim`, `--why-border`, `--green`, `--red`, `--red-dim`, `--mono`, `--sans`. Nếu cần token mới (vd `--heatmap-0..4`) → bổ sung vào `lab-template.css`.

## Breakpoints

| Range | Layout |
|-------|--------|
| `<640px` | 1-col, heatmap + roadmap scroll-x snap, footer accordion |
| `640–1024px` | 2-col catalog, stats 4×1, roadmap horizontal |
| `>1024px` | 3-col catalog, full timeline, heatmap full-width |

## Phases

| # | Phase | File | Effort | Status |
|---|-------|------|--------|--------|
| 01 | Scaffold modular CSS/JS, move existing styles | phase-01-scaffold.md | 2h | ✅ done |
| 02 | Hero + How-it-works + Features | phase-02-hero-how-features.md | 3h | ✅ done |
| 03 | Resume strip + Stats tiles + Heatmap SVG | phase-03-resume-stats-heatmap.md | 4h | ✅ done |
| 04 | Learning roadmap timeline | phase-04-roadmap.md | 3h | ✅ done |
| 05 | Catalog toolbar (search/filter/sort) | phase-05-catalog-toolbar.md | 2h | ✅ done |
| 06 | Footer + responsive polish + a11y | phase-06-footer-responsive.md | 3h | ✅ done |

## Success criteria

- First-time user hiểu flow <30s (self-review).
- Returning user: resume strip trong viewport khi load (no scroll).
- Lighthouse mobile ≥90 (Perf + A11y).
- Zero horizontal scroll ở 360px viewport.
- `index.html` ≤150 dòng; mỗi file `_shared/index-*` ≤200 dòng.
- No regression: due-banner, bookmark, card menu, quiz badge vẫn hoạt động.

## Risks

| Risk | Mitigation |
|------|-----------|
| Bundle tăng | Vanilla SVG, no library |
| Roadmap timeline horizontal scroll khó UX mobile | Fallback vertical <640px |
| Stats sai khi user lần đầu | Ẩn toàn bộ section 2+3 nếu `progress.length===0` |
| Regression catalog render | Phase 01 di chuyển code, không đổi logic |

## Unresolved

- Global metric chip (NN labs · MM cards · KK users): endpoint nào? → phase-02 sẽ hardcode aggregate từ CATALOG nếu chưa có.
- Keyboard shortcuts: `/` đã có (search-widget). `g+h`, `j/k` chưa → phase-06 chỉ hiển thị `/` + liệt kê planned.
