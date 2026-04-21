# Phase 2: Modify Existing Components

## Overview

- **Priority:** P0
- **Effort:** 30 min
- **Status:** completed
- **Depends on:** Phase 1

Thêm `showProgress` prop và auth switch logic vào existing components.

## Context Links

- [Phase 1](phase-01-create-components.md) — new components
- [Brainstorm Report](../reports/brainstorm-260421-1101-guest-progress-hiding.md)

## Related Code Files

### Modify
- `app/src/components/dashboard/dashboard-layout.tsx`
- `app/src/components/dashboard/roadmap-section.tsx`
- `app/src/components/dashboard/lab-catalog-grid.tsx`

## Implementation Steps

### 1. Modify RoadmapSection

Add `showProgress?: boolean` prop (default `true`).

```tsx
// roadmap-section.tsx

interface RoadmapSectionProps {
  labsIndex: LabIndexEntry[]
  progressEntries: ProgressEntry[]
  showProgress?: boolean  // ADD THIS
}

export function RoadmapSection({ 
  labsIndex, 
  progressEntries, 
  showProgress = true  // ADD DEFAULT
}: RoadmapSectionProps) {
```

When `showProgress={false}`:
- Hide progress bar in TimelineNode (line ~131-147)
- Hide "Done"/"Active" badges (line ~105-118)
- Hide `{completedCount}/{labCount} labs` text (line ~125-127)
- Keep "Coming soon" badge for placeholder modules

Changes in `TimelineNode`:
```tsx
// Around line 105-118, wrap badges:
{showProgress && isDone && (
  <Badge variant="secondary" ...>Done</Badge>
)}
{showProgress && isActive && !isDone && (
  <Badge variant="default" ...>Active</Badge>
)}

// Around line 125-127, wrap lab count:
{showProgress && !mod.placeholder && labCount > 0 && (
  <span>· {completedCount}/{labCount} labs</span>
)}

// Around line 131-147, wrap progress bar:
{showProgress && isActive && !isDone && labCount > 0 && (
  <div className="mt-2 h-1.5 ...">...</div>
)}
```

Need to pass `showProgress` down to TimelineNode via props.

### 2. Modify LabCatalogGrid

Add `showProgress?: boolean` prop (default `true`).

```tsx
// lab-catalog-grid.tsx

interface LabCatalogGridProps {
  labsIndex: LabIndexEntry[]
  progressEntries: ProgressEntry[]
  isLoading: boolean
  showProgress?: boolean  // ADD THIS
}

export function LabCatalogGrid({
  labsIndex,
  progressEntries,
  isLoading,
  showProgress = true,  // ADD DEFAULT
}: LabCatalogGridProps) {
```

When `showProgress={false}`:
- Don't show status badge on LabCard (always show as "new" or hide badge entirely)

Option A: Always return 'new' status
```tsx
// In the map:
<LabCard
  key={lab.slug}
  lab={lab}
  status={showProgress ? labStatus(lab.slug, progressEntries) : 'new'}
/>
```

Option B: Hide badge entirely (preferred — cleaner guest UX)
```tsx
// LabCard needs showProgress prop
<LabCard
  key={lab.slug}
  lab={lab}
  status={labStatus(lab.slug, progressEntries)}
  showBadge={showProgress}
/>

// In LabCard, conditionally render badge:
{showBadge && (
  <Badge variant={badge.variant} ...>{badge.label}</Badge>
)}
```

**Recommendation:** Option A is simpler, Option B is cleaner UX. Choose Option A for minimal changes.

### 3. Modify DashboardLayout

Add auth switch at top level.

```tsx
// dashboard-layout.tsx

import { useAuth } from '@/contexts/auth-context'
import { GuestDashboardLayout } from './guest-dashboard-layout'

export function DashboardLayout() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Fetch progress only if logged in
  const {
    data: progressData,
    isLoading,
    isError,
  } = useQuery<ProgressResponse>({
    queryKey: ['progress'],
    queryFn: getProgress,
    staleTime: 60_000,
    retry: 1,
    enabled: !!user,  // ADD: only fetch if logged in
  })

  // Show guest layout if not logged in
  if (!authLoading && !user) {
    return <GuestDashboardLayout />
  }

  // Rest of existing authenticated layout...
  const progressEntries: ProgressEntry[] = progressData?.progress ?? []

  return (
    <div className="min-h-screen">
      {/* existing layout unchanged */}
    </div>
  )
}
```

Key changes:
- Import `useAuth` and `GuestDashboardLayout`
- Add `enabled: !!user` to progress query (don't fetch for guests)
- Early return `<GuestDashboardLayout />` when no user

## Todo List

- [x] Add `showProgress` prop to RoadmapSection
- [x] Conditionally hide progress bar, badges, lab count in TimelineNode
- [x] Add `showProgress` prop to LabCatalogGrid
- [x] Use 'new' status when showProgress=false
- [x] Add auth switch in DashboardLayout
- [x] Add `enabled: !!user` to progress query
- [x] Test guest view shows correct layout
- [x] Test logged-in view unchanged

## Success Criteria

- [x] Guest sees CTA cards instead of Stats/Due
- [x] Guest sees Roadmap without progress indicators
- [x] Guest sees Lab Catalog without status badges
- [x] Guest sees Leaderboard
- [x] Logged-in user sees full progress UI (regression test)
- [x] No TypeScript errors
- [x] No console errors
