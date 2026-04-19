/**
 * stats-section.tsx — Streak counter, completed-labs count, and 90-day heatmap.
 * Heatmap rendering delegated to HeatmapGrid component.
 * Framer Motion stagger fade-in on mount.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, CheckCircle2, Activity } from 'lucide-react'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { computeStreak, computeCompleted } from '@/lib/stats'
import type { ProgressEntry } from '@/lib/api'
import { HeatmapGrid } from './heatmap-grid'

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/** Full-motion variant — stagger fade+slide */
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/** Reduced-motion variant — opacity only, no y transform */
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
  const reduce    = useReducedMotionPreference()
  const iVariants = reduce ? itemVariantsReduced : itemVariants

  if (isLoading) {
    return (
      <section aria-labelledby="stats-heading" className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-20 w-full" />
      </section>
    )
  }

  return (
    <section aria-labelledby="stats-heading">
      <motion.div
        variants={containerVariants}
        initial={reduce ? false : 'hidden'}
        animate="visible"
        className="space-y-4"
      >
        <motion.h2
          id="stats-heading"
          variants={iVariants}
          className="text-xl font-semibold tracking-tight"
        >
          Tiến độ học
        </motion.h2>

        {/* Stat tiles — 3 cards */}
        <motion.div variants={iVariants} className="grid gap-3 grid-cols-1 sm:grid-cols-3">

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">
                {streak}
                <span className="text-base font-normal text-muted-foreground ml-1">ngày</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Liên tiếp mỗi ngày</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Labs done</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">
                {completed}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  / {totalLabs}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Quiz score ≥ 80%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Activity className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Labs opened</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">
                {progressEntries.filter((p) => p.opened_at).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Đã mở ít nhất 1 lần</p>
            </CardContent>
          </Card>

        </motion.div>

        {/* Heatmap card */}
        <motion.div variants={iVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hoạt động 13 tuần qua
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Chưa có dữ liệu — mở một lab để bắt đầu ghi nhận hoạt động.
                </p>
              ) : (
                <HeatmapGrid progressEntries={progressEntries} />
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </section>
  )
}
