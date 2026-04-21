# Phase 1: Create Components

## Overview

- **Priority:** P0
- **Effort:** 45 min
- **Status:** completed

Tạo 2 components mới: `LoginCtaCard` và `GuestDashboardLayout`.

## Context Links

- [Brainstorm Report](../reports/brainstorm-260421-1101-guest-progress-hiding.md)
- [AuthContext](../../app/src/contexts/auth-context.tsx) — existing `useAuth()` hook

## Related Code Files

### Create
- `app/src/components/dashboard/login-cta-card.tsx`
- `app/src/components/dashboard/guest-dashboard-layout.tsx`

### Reference (read-only)
- `app/src/contexts/auth-context.tsx` — useAuth() hook
- `app/src/components/dashboard/leaderboard-section.tsx` — reuse as-is
- `app/src/components/ui/card.tsx` — shadcn Card components
- `app/src/components/ui/button.tsx` — shadcn Button

## Implementation Steps

### 1. Create LoginCtaCard (~35 LOC)

```tsx
// app/src/components/dashboard/login-cta-card.tsx

interface LoginCtaCardProps {
  title: string
  description: string
  className?: string
}

export function LoginCtaCard({ title, description, className }: LoginCtaCardProps) {
  const { login } = useAuth()
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={login}>
          <GithubIcon className="mr-2 h-4 w-4" />
          Đăng nhập với GitHub
        </Button>
      </CardContent>
    </Card>
  )
}
```

Key points:
- Use existing shadcn Card, Button
- Call `login()` from useAuth() — redirects to GitHub OAuth
- Use lucide-react Github icon

### 2. Create GuestDashboardLayout (~50 LOC)

```tsx
// app/src/components/dashboard/guest-dashboard-layout.tsx

export function GuestDashboardLayout() {
  const ALL_LABS = getIndex()
  
  return (
    <div className="min-h-screen">
      <div className="container py-8 space-y-12">
        
        {/* CTA thay cho Stats */}
        <LoginCtaCard 
          title="Theo dõi tiến độ học"
          description="Đăng nhập để xem heatmap, streak và thống kê học tập"
        />
        
        {/* Two-column: CTA + Roadmap (no progress) */}
        <div className="grid gap-8 md:grid-cols-2">
          <LoginCtaCard 
            title="Ôn tập thông minh"
            description="Đăng nhập để nhận nhắc nhở ôn bài theo spaced repetition"
          />
          <RoadmapSection 
            labsIndex={ALL_LABS}
            progressEntries={[]}
            showProgress={false}
          />
        </div>
        
        {/* Leaderboard — visible to guests */}
        <LeaderboardSection />
        
        {/* Lab Catalog — no progress badges */}
        <LabCatalogGrid
          labsIndex={ALL_LABS}
          progressEntries={[]}
          isLoading={false}
          showProgress={false}
        />
        
      </div>
    </div>
  )
}
```

Key points:
- Import existing components
- Pass `showProgress={false}` to Roadmap and LabCatalog (Phase 2 adds this prop)
- Pass empty `progressEntries=[]` since guest has no progress
- LeaderboardSection used as-is (no changes needed)

## Todo List

- [x] Create `login-cta-card.tsx` with Card + Button + GitHub icon
- [x] Create `guest-dashboard-layout.tsx` with CTA cards + sections
- [x] Verify imports compile correctly

## Success Criteria

- [x] Both components compile without errors
- [x] LoginCtaCard renders card with GitHub login button
- [x] GuestDashboardLayout assembles correct layout structure
