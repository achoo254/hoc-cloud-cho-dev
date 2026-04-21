import { getIndex } from '@/lib/content-loader'
import { LoginCtaCard } from './login-cta-card'
import { RoadmapSection } from './roadmap-section'
import { LeaderboardSection } from './leaderboard-section'
import { LabCatalogGrid } from './lab-catalog-grid'

const ALL_LABS = getIndex()

export function GuestDashboardLayout() {
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
