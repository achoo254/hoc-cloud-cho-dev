import { useLabsIndex } from '@/lib/hooks/use-labs-index'
import { ProgressPreviewCard } from './progress-preview-card'
import { SpacedRepetitionPreviewCard } from './spaced-repetition-preview-card'
import { RoadmapSection } from './roadmap-section'
import { LeaderboardSection } from './leaderboard-section'
import { LabCatalogGrid } from './lab-catalog-grid'

export function GuestDashboardLayout() {
  const { data: labsIndex = [], isLoading } = useLabsIndex()

  return (
    <div className="min-h-screen">
      <div className="container py-8 space-y-12">

        {/* Feature preview thay cho Stats */}
        <ProgressPreviewCard />

        {/* Two-column: preview + Roadmap (no progress) */}
        <div className="grid gap-8 md:grid-cols-2">
          <SpacedRepetitionPreviewCard />
          <RoadmapSection
            labsIndex={labsIndex}
            progressEntries={[]}
            showProgress={false}
          />
        </div>

        {/* Leaderboard — visible to guests */}
        <LeaderboardSection />

        {/* Lab Catalog — no progress badges */}
        <LabCatalogGrid
          labsIndex={labsIndex}
          progressEntries={[]}
          isLoading={isLoading}
          showProgress={false}
        />

      </div>
    </div>
  )
}
