---
title: "Guest Progress Hiding"
description: "Hide progress indicators for guests, show CTA login instead"
status: completed
priority: P2
effort: 1-2h
branch: feat/guest-progress-hiding
tags: [dashboard, auth, ux]
created: 2026-04-21
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260421-1101-guest-progress-hiding.md
---

## Goal

Ẩn thông tin tiến độ học khi user là guest (chưa login). Thay thế bằng CTA login để khuyến khích đăng ký.

## Success Criteria

- [x] Guest không thấy Stats section (heatmap, streak)
- [x] Guest không thấy Due section (spaced repetition)
- [x] Guest thấy CTA login cards thay vì progress sections
- [x] Guest thấy Roadmap nhưng không có progress bars/badges
- [x] Guest thấy Lab Catalog nhưng không có status badges
- [x] Leaderboard visible cho guest (motivation)
- [x] Logged-in user thấy đầy đủ như cũ

## Key Decisions

| Topic | Decision |
|-------|----------|
| Architecture | Separate GuestDashboardLayout component |
| CTA design | Reusable LoginCtaCard component |
| Progress toggle | `showProgress` prop pattern |
| Leaderboard | Always visible (motivate signup) |

## Architecture

```
DashboardLayout (switch wrapper)
├── if (isLoading) → Loading skeleton
├── if (!user) → GuestDashboardLayout
│   ├── LoginCtaCard (Stats area)
│   ├── LoginCtaCard + RoadmapSection(showProgress=false)
│   ├── LeaderboardSection
│   └── LabCatalogGrid(showProgress=false)
└── if (user) → (current layout unchanged)
```

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Create Components](phase-01-create-components.md) | P0 | 45m | completed |
| 2 | [Modify Existing](phase-02-modify-existing.md) | P0 | 30m | completed |

## File Changes Summary

### New Files
- `app/src/components/dashboard/login-cta-card.tsx` (~35 LOC)
- `app/src/components/dashboard/guest-dashboard-layout.tsx` (~50 LOC)

### Modified Files
- `app/src/components/dashboard/dashboard-layout.tsx` — add auth switch
- `app/src/components/dashboard/roadmap-section.tsx` — add `showProgress` prop
- `app/src/components/dashboard/lab-catalog-grid.tsx` — add `showProgress` prop

**Total:** ~135 LOC

## Dependencies

- `useAuth()` hook from existing auth-context.tsx
- Existing `LeaderboardSection` component (reused as-is)

## Testing

1. Open homepage as guest (not logged in)
2. Verify Stats/Due replaced with login CTAs
3. Verify Roadmap shows modules but no progress
4. Verify Lab Catalog shows labs but no status badges
5. Verify Leaderboard visible
6. Login and verify full progress UI returns
