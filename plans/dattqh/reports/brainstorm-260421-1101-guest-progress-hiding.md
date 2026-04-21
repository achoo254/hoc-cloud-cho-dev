# Brainstorm: Guest Progress Hiding

**Date:** 2026-04-21
**Status:** Approved → Plan

## Problem Statement

Hiện tại dashboard hiển thị thông tin tiến độ học cho cả guest và logged-in users. Yêu cầu: ẩn progress khi chưa login, chỉ hiển thị khi đã đăng nhập.

## Requirements

| Section | Guest | Logged-in |
|---------|-------|-----------|
| Stats (heatmap, streak) | CTA login | Full |
| Due Section | CTA login | Full |
| Roadmap | Hiện roadmap, ẩn progress bars | Full |
| Leaderboard | Visible | Visible |
| Lab Catalog | Hiện, ẩn progress badges | Full |

## Evaluated Approaches

### Approach A: Conditional rendering trong DashboardLayout
- **Pros:** Đơn giản, ít thay đổi
- **Cons:** Logic conditional mixed với layout code

### Approach B: Separate GuestDashboard component ✅ Selected
- **Pros:** Tách biệt logic rõ ràng, dễ maintain, dễ test
- **Cons:** Một chút code duplication (acceptable)

## Final Design

```
DashboardLayout (switch wrapper)
├── if (isLoading) → Loading skeleton
├── if (!user) → GuestDashboardLayout
│   ├── LoginCtaCard (thay StatsSection)
│   ├── LoginCtaCard + RoadmapSection(showProgress=false)
│   ├── LeaderboardSection
│   └── LabCatalogGrid(showProgress=false)
└── if (user) → AuthenticatedDashboardLayout
```

## Files to Create/Modify

| File | Action | LOC |
|------|--------|-----|
| `login-cta-card.tsx` | Create | ~35 |
| `guest-dashboard-layout.tsx` | Create | ~50 |
| `dashboard-layout.tsx` | Modify | ~20 |
| `roadmap-section.tsx` | Modify | ~15 |
| `lab-catalog-grid.tsx` | Modify | ~15 |

**Total:** ~135 LOC

## Implementation Considerations

- Sử dụng existing `useAuth()` hook
- Reuse `LeaderboardSection` component cho cả guest/authenticated
- `showProgress` prop pattern cho Roadmap và LabCatalog

## Success Criteria

- [ ] Guest không thấy Stats, Due sections
- [ ] Guest thấy CTA login thay vì progress sections
- [ ] Guest thấy Roadmap nhưng không có progress bars
- [ ] Guest thấy Lab Catalog nhưng không có status badges
- [ ] Logged-in user vẫn thấy đầy đủ như cũ
- [ ] Leaderboard visible cho cả 2

## Next Steps

Tạo implementation plan với /ck:plan
