/**
 * dashboard-layout.tsx — Orchestrates all dashboard sections.
 * Fetches /api/progress via React Query; passes data down to child sections.
 * Handles loading skeletons and graceful error fallback.
 */

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { getProgress, type ProgressEntry, type ProgressResponse } from '@/lib/api'
import { PROGRESS_QUERY_KEY } from '@/lib/hooks/use-progress'
import { getIndex } from '@/lib/content-loader'
import { useAuth } from '@/contexts/auth-context'
import { StatsSection } from './stats-section'
import { DueSection } from './due-section'
import { RecentActivitySection } from './recent-activity-section'
import { RoadmapSection } from './roadmap-section'
import { LabCatalogGrid } from './lab-catalog-grid'
import { LeaderboardSection } from './leaderboard-section'
import { GuestDashboardLayout } from './guest-dashboard-layout'

// ── Static data (build-time import, no network) ───────────────────────────────

const ALL_LABS = getIndex()

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardLayout() {
  const { user, isLoading: authLoading } = useAuth()

  // Fetch server-side progress — stale 60s, error is non-fatal
  const {
    data: progressData,
    isLoading,
    isError,
  } = useQuery<ProgressResponse>({
    queryKey: PROGRESS_QUERY_KEY,
    queryFn: getProgress,
    staleTime: 60_000,
    retry: 1,
    enabled: !!user,
  })

  // Wait for auth to resolve before deciding which layout
  if (authLoading) {
    return null
  }

  // Show guest layout if not logged in
  if (!user) {
    return <GuestDashboardLayout />
  }

  const progressEntries: ProgressEntry[] = progressData?.progress ?? []

  return (
    <div className="min-h-screen">
      <div className="container py-8 space-y-12">

        {/* Non-fatal error notice when server is unreachable */}
        {isError && (
          <ErrorBanner message="Không thể tải tiến độ từ server — đang dùng dữ liệu offline (localStorage)." />
        )}

        {/* Stats: heatmap + streak + completed */}
        <StatsSection
          progressEntries={progressEntries}
          totalLabs={ALL_LABS.length}
          isLoading={isLoading}
        />

        {/* "Tiếp tục học" — full width, above due/roadmap pair */}
        <RecentActivitySection
          progressEntries={progressEntries}
          isLoading={isLoading}
        />

        {/* Two-column layout on md+: due | roadmap */}
        <div className="grid gap-8 md:grid-cols-2">
          <DueSection
            progressEntries={progressEntries}
            isLoading={isLoading}
          />
          <RoadmapSection
            labsIndex={ALL_LABS}
            progressEntries={progressEntries}
          />
        </div>

        {/* Leaderboard — full width */}
        <LeaderboardSection />

        {/* Lab catalog — full width */}
        <LabCatalogGrid
          labsIndex={ALL_LABS}
          progressEntries={progressEntries}
          isLoading={isLoading}
        />

      </div>
    </div>
  )
}
