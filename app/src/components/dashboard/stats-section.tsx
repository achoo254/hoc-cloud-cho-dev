/**
 * stats-section.tsx — Streak counter, completed-labs count, and 90-day heatmap.
 * Uses compact StatTile components + heatmap card with side-summary & labels.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, CheckCircle2, Activity, CalendarDays } from 'lucide-react'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { computeStreak, computeCompleted, computeHeatmap } from '@/lib/stats'
import type { ProgressEntry } from '@/lib/api'
import { HeatmapGrid } from './heatmap-grid'
import { StatTile } from './stat-tile'

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const itemVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StatsSectionProps {
  progressEntries: ProgressEntry[]
  totalLabs: number
  isLoading: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatsSection({ progressEntries, totalLabs, isLoading }: StatsSectionProps) {
  const streak    = useMemo(() => computeStreak(progressEntries), [progressEntries])
  const completed = useMemo(() => computeCompleted(progressEntries), [progressEntries])
  const opened    = useMemo(
    () => progressEntries.filter((p) => p.opened_at).length,
    [progressEntries],
  )
  const heatmap   = useMemo(() => computeHeatmap(progressEntries, 91), [progressEntries])
  const reduce    = useReducedMotionPreference()
  const iVariants = reduce ? itemVariantsReduced : itemVariants

  // Heatmap side-summary metrics
  const activeDays = useMemo(() => heatmap.filter((d) => d.count > 0).length, [heatmap])
  const totalReviews = useMemo(() => heatmap.reduce((s, d) => s + d.count, 0), [heatmap])
  const bestDay = useMemo(
    () => heatmap.reduce((max, d) => (d.count > max ? d.count : max), 0),
    [heatmap],
  )

  if (isLoading) {
    return (
      <section aria-labelledby="stats-heading" className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-36 w-full rounded-xl" />
      </section>
    )
  }

  const completionPct = totalLabs > 0 ? Math.round((completed / totalLabs) * 100) : 0

  return (
    <section aria-labelledby="stats-heading">
      <motion.div
        variants={containerVariants}
        initial={reduce ? false : 'hidden'}
        animate="visible"
        className="space-y-4"
      >
        <motion.div variants={iVariants} className="flex items-baseline justify-between gap-3">
          <h2 id="stats-heading" className="text-xl font-semibold tracking-tight">
            Tiến độ học
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {completionPct}% hoàn thành lộ trình
          </span>
        </motion.div>

        {/* Compact stat tiles */}
        <motion.div variants={iVariants} className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <StatTile
            accent="orange"
            icon={<Flame className="h-4 w-4" aria-hidden="true" />}
            label="Streak"
            value={streak}
            suffix="ngày"
            detail={streak > 0 ? 'Giữ chuỗi học liên tục' : 'Hoàn thành 1 lab hôm nay để bắt đầu'}
          />
          <StatTile
            accent="emerald"
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            label="Labs done"
            value={completed}
            suffix={`/ ${totalLabs}`}
            detail={`Quiz score ≥ 80% · ${completionPct}%`}
            progress={{ current: completed, total: totalLabs }}
          />
          <StatTile
            accent="sky"
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            label="Labs opened"
            value={opened}
            detail={opened > 0 ? `Còn ${Math.max(0, opened - completed)} lab đang dở` : 'Chưa mở lab nào'}
          />
        </motion.div>

        {/* Heatmap card with side-summary */}
        <motion.div variants={iVariants}>
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
                {/* Left: heatmap */}
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <h3 className="text-sm font-medium">Hoạt động 13 tuần qua</h3>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {totalReviews} lần ôn tập
                    </span>
                  </div>

                  {progressEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Chưa có dữ liệu — mở một lab để bắt đầu ghi nhận hoạt động.
                      </p>
                    </div>
                  ) : (
                    <HeatmapGrid progressEntries={progressEntries} />
                  )}
                </div>

                {/* Right: summary cells (only when we have data) */}
                {progressEntries.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:w-40">
                    <HeatmapStat label="Ngày hoạt động" value={`${activeDays}`} hint="/ 91 ngày" />
                    <HeatmapStat label="Cao nhất" value={`${bestDay}`} hint="lần / ngày" />
                    <HeatmapStat
                      label="Trung bình"
                      value={activeDays > 0 ? (totalReviews / activeDays).toFixed(1) : '0'}
                      hint="lần / ngày hoạt động"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ── Small inline helper for heatmap summary cells ─────────────────────────────

function HeatmapStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
    </div>
  )
}
