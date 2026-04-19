/**
 * heatmap-grid.tsx — 90-day CSS grid activity heatmap (no external lib).
 * Each cell is a div with Tailwind bg class derived from review count bucket.
 * Shadcn Tooltip shows date + count on hover.
 */

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { computeHeatmap, bucketHeatmapLevel } from '@/lib/stats'
import type { ProgressEntry } from '@/lib/api'

// ── Level → Tailwind class ────────────────────────────────────────────────────

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-muted',
  1: 'bg-emerald-200 dark:bg-emerald-900',
  2: 'bg-emerald-400 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-500',
  4: 'bg-emerald-600 dark:bg-emerald-400',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HeatmapGridProps {
  progressEntries: ProgressEntry[]
  /** Number of days to display, default 91 (13 weeks × 7) */
  days?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HeatmapGrid({ progressEntries, days = 91 }: HeatmapGridProps) {
  const heatmapDays = useMemo(
    () => computeHeatmap(progressEntries, days),
    [progressEntries, days],
  )

  // 13 columns (weeks) × 7 rows (days Mon–Sun)
  const COLS = Math.ceil(days / 7)

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            width: `${COLS * 15}px`,
          }}
          role="img"
          aria-label={`Activity heatmap — last ${COLS} weeks`}
        >
          {Array.from({ length: COLS }, (_, col) =>
            Array.from({ length: 7 }, (_, row) => {
              const idx = col * 7 + row
              const day = heatmapDays[idx]
              if (!day) {
                return <div key={`${col}-${row}`} className="h-3 w-3" />
              }
              const level = bucketHeatmapLevel(day.count)
              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-3 w-3 rounded-[2px] cursor-default transition-opacity hover:opacity-70 ${LEVEL_CLASS[level]}`}
                      aria-label={`${day.date}: ${day.count} activities`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span className="font-medium">{day.date}</span>
                    <span className="text-muted-foreground ml-1">
                      · {day.count} reviews
                    </span>
                  </TooltipContent>
                </Tooltip>
              )
            }),
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2" aria-hidden="true">
        <span className="text-[10px] text-muted-foreground mr-1">ít</span>
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <div
            key={l}
            className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[l]}`}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">nhiều</span>
      </div>
    </TooltipProvider>
  )
}
